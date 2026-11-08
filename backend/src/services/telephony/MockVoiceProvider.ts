import { TelephonyProvider, CallInitiateParams, CallResult, CallCargoInfo, CallDriverInfo } from './types.js';
import { logger } from '../../utils/logger.js';

export class MockVoiceProvider implements TelephonyProvider {
  readonly name = 'mock' as const;

  isConfigured(): boolean {
    return true; // Mock провайдер готов всегда
  }

  generateTtsScript(cargo: CallCargoInfo, driver: CallDriverInfo): string {
    return `Здравствуйте, ${driver.fullName}. Это DELLA. Есть груз: ${cargo.originCity} — ${cargo.destinationCity}, ${cargo.weightTons} тонн, ставка ${cargo.rateKzt.toLocaleString('ru-RU')} тенге, погрузка ${cargo.loadingDate}. Чтобы взять груз, нажмите 1. Чтобы отказаться, нажмите 2. Чтобы услышать ещё раз, нажмите 9.`;
  }

  async initiateCall(params: CallInitiateParams): Promise<CallResult> {
    const providerCallId = `mock_call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const initiatedAt = new Date();

    const ttsText = this.generateTtsScript(params.cargo, params.driver);

    logger.info({
      event: 'MOCK_VOICE_CALL_INITIATED',
      attemptId: params.attemptId,
      providerCallId,
      toPhone: params.toPhone,
      driver: params.driver.fullName,
      cargoNumber: params.cargo.cargoNumber,
      ttsText,
    }, `📞 [Mock Voice] Инициация звонка на номер ${params.toPhone}: «${ttsText}»`);

    return {
      provider: 'mock',
      providerCallId,
      status: 'ringing',
      initiatedAt,
    };
  }

  verifyWebhookSignature(_req: any): boolean {
    return true;
  }
}

