import crypto from 'crypto';
import { TelephonyProvider, CallInitiateParams, CallResult, CallCargoInfo, CallDriverInfo } from './types.js';
import { logger } from '../../utils/logger.js';

export class TwilioVoiceProvider implements TelephonyProvider {
  readonly name = 'twilio' as const;

  private accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  private authToken = process.env.TWILIO_AUTH_TOKEN || '';
  private fromPhone = process.env.TWILIO_PHONE_NUMBER || '';
  private baseWebhookUrl = process.env.BASE_WEBHOOK_URL || 'http://localhost:5000';

  isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken && this.fromPhone);
  }

  generateTtsScript(cargo: CallCargoInfo, driver: CallDriverInfo): string {
    return `Здравствуйте, ${driver.fullName}. Это DELLA. Есть груз: ${cargo.originCity} — ${cargo.destinationCity}, ${cargo.weightTons} тонн, ставка ${cargo.rateKzt.toLocaleString('ru-RU')} тенге, погрузка ${cargo.loadingDate}. Чтобы взять груз, нажмите 1. Чтобы отказаться, нажмите 2. Чтобы услышать ещё раз, нажмите 9.`;
  }

  generateTwiML(ttsText: string, attemptId: string): string {
    const webhookUrl = `${this.baseWebhookUrl}/api/webhooks/call-input?attemptId=${encodeURIComponent(attemptId)}`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${webhookUrl}" method="POST" timeout="8">
    <Say language="ru-RU" voice="Polina">${ttsText}</Say>
  </Gather>
  <!-- Повтор один раз если водитель не нажал клавишу -->
  <Gather numDigits="1" action="${webhookUrl}" method="POST" timeout="8">
    <Say language="ru-RU" voice="Polina">Повторяю. ${ttsText}</Say>
  </Gather>
  <Say language="ru-RU" voice="Polina">Вы не выбрали вариант. Звонок завершён. До свидания.</Say>
  <Hangup/>
</Response>`;
  }

  async initiateCall(params: CallInitiateParams): Promise<CallResult> {
    if (!this.isConfigured()) {
      throw new Error('Twilio Voice не сконфигурирован: отсутствуют TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN или TWILIO_PHONE_NUMBER в .env');
    }

    const ttsText = this.generateTtsScript(params.cargo, params.driver);
    const twiml = this.generateTwiML(ttsText, params.attemptId);
    const statusCallbackUrl = `${this.baseWebhookUrl}/api/webhooks/call-status?attemptId=${encodeURIComponent(params.attemptId)}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`;

    const formData = new URLSearchParams();
    formData.append('To', params.toPhone);
    formData.append('From', this.fromPhone);
    formData.append('Twiml', twiml);
    formData.append('StatusCallback', statusCallbackUrl);
    formData.append('StatusCallbackEvent', 'initiated');
    formData.append('StatusCallbackEvent', 'ringing');
    formData.append('StatusCallbackEvent', 'answered');
    formData.append('StatusCallbackEvent', 'completed');
    formData.append('Timeout', '30');

    const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2с таймаут по ТЗ

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json() as any;

      if (!response.ok) {
        throw new Error(`Twilio API Error (${response.status}): ${data.message || 'Ошибка вызова'}`);
      }

      logger.info({
        event: 'TWILIO_VOICE_CALL_SUCCESS',
        callSid: data.sid,
        to: params.toPhone,
        status: data.status,
      }, `📞 [Twilio Voice] Звонок отправлен: ${data.sid}`);

      return {
        provider: 'twilio',
        providerCallId: data.sid,
        status: 'dialing',
        initiatedAt: new Date(),
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error({ error: err.message, to: params.toPhone }, '❌ Ошибка инициации звонка Twilio');
      throw err;
    }
  }

  verifyWebhookSignature(req: any): boolean {
    const signature = req.headers['x-twilio-signature'];
    if (!signature || !this.authToken) {
      // В тестовом режиме разрешаем
      return process.env.NODE_ENV !== 'production';
    }

    try {
      const url = `${this.baseWebhookUrl}${req.originalUrl || req.url}`;
      const params = req.body || {};
      const sortedKeys = Object.keys(params).sort();
      let data = url;
      for (const key of sortedKeys) {
        data += `${key}${params[key]}`;
      }
      const expected = crypto.createHmac('sha1', this.authToken).update(data).digest('base64');
      return signature === expected;
    } catch {
      return false;
    }
  }
}

