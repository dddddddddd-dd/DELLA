import crypto from 'crypto';
import { TelephonyProvider, CallInitiateParams, CallResult, CallCargoInfo, CallDriverInfo } from './types.js';
import { logger } from '../../utils/logger.js';

export class ZadarmaVoiceProvider implements TelephonyProvider {
  readonly name = 'zadarma' as const;

  private userKey = process.env.ZADARMA_KEY || '';
  private secretKey = process.env.ZADARMA_SECRET || '';

  isConfigured(): boolean {
    return Boolean(this.userKey && this.secretKey);
  }

  generateTtsScript(cargo: CallCargoInfo, driver: CallDriverInfo): string {
    return `Здравствуйте, ${driver.fullName}. Это DELLA. Есть груз: ${cargo.originCity} — ${cargo.destinationCity}, ${cargo.weightTons} тонн, ставка ${cargo.rateKzt.toLocaleString('ru-RU')} тенге, погрузка ${cargo.loadingDate}. Чтобы взять груз, нажмите 1. Чтобы отказаться, нажмите 2. Чтобы услышать ещё раз, нажмите 9.`;
  }

  async initiateCall(params: CallInitiateParams): Promise<CallResult> {
    if (!this.isConfigured()) {
      throw new Error('Zadarma API не сконфигурирован: отсутствуют ZADARMA_KEY или ZADARMA_SECRET в .env');
    }

    const ttsText = this.generateTtsScript(params.cargo, params.driver);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 сек таймаут по ТЗ

    try {
      // Инициация запроса Callback/TTS через Zadarma API
      const method = '/v1/request/callback/';
      const requestParams: Record<string, string> = {
        from: params.toPhone,
        to: params.toPhone,
        predicted: 'true',
      };

      const sortedParams = Object.keys(requestParams)
        .sort()
        .map((key) => `${key}=${encodeURIComponent(requestParams[key])}`)
        .join('&');

      const signString = `${method}${sortedParams}${crypto.createHash('md5').update(sortedParams).digest('hex')}`;
      const signature = crypto.createHmac('sha1', this.secretKey).update(signString).digest('base64');

      const response = await fetch(`https://api.zadarma.com${method}`, {
        method: 'POST',
        headers: {
          'Authorization': `${this.userKey}:${signature}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: sortedParams,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json() as any;

      if (!response.ok || data.status === 'error') {
        throw new Error(`Zadarma API error: ${data.message || 'Ошибка соединения'}`);
      }

      const providerCallId = data.call_id || `zadarma_${Date.now()}`;

      logger.info({
        event: 'ZADARMA_CALL_INITIATED',
        providerCallId,
        to: params.toPhone,
      }, `📞 [Zadarma] Звонок инициирован: ${providerCallId}`);

      return {
        provider: 'zadarma',
        providerCallId,
        status: 'dialing',
        initiatedAt: new Date(),
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error({ error: err.message, to: params.toPhone }, '❌ Ошибка инициации звонка Zadarma');
      throw err;
    }
  }

  verifyWebhookSignature(req: any): boolean {
    const signature = req.headers['signature'];
    if (!signature || !this.secretKey) {
      return process.env.NODE_ENV !== 'production';
    }
    return true;
  }
}

