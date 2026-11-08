import { TelephonyProvider, CallInitiateParams, CallResult } from './types.js';
import { TwilioVoiceProvider } from './TwilioVoiceProvider.js';
import { ZadarmaVoiceProvider } from './ZadarmaVoiceProvider.js';
import { MockVoiceProvider } from './MockVoiceProvider.js';
import { logger } from '../../utils/logger.js';

export interface FailoverCallResult {
  result: CallResult;
  usedFallback: boolean;
  provider: string;
}

export class TelephonyService {
  private primaryProvider: TelephonyProvider;
  private fallbackProvider: TelephonyProvider;

  constructor() {
    const primaryName = (process.env.TELEPHONY_PRIMARY_PROVIDER || 'mock').toLowerCase();
    const fallbackName = (process.env.TELEPHONY_FALLBACK_PROVIDER || 'mock').toLowerCase();

    this.primaryProvider = this.createProvider(primaryName);
    this.fallbackProvider = this.createProvider(fallbackName);

    logger.info({
      primary: this.primaryProvider.name,
      fallback: this.fallbackProvider.name,
    }, '📞 Служба телефонии DELLA инициализирована');
  }

  private createProvider(name: string): TelephonyProvider {
    switch (name) {
      case 'twilio':
        return new TwilioVoiceProvider();
      case 'zadarma':
        return new ZadarmaVoiceProvider();
      case 'mock':
      default:
        return new MockVoiceProvider();
    }
  }

  getPrimaryProvider(): TelephonyProvider {
    return this.primaryProvider;
  }

  getFallbackProvider(): TelephonyProvider {
    return this.fallbackProvider;
  }

  /**
   * Инициация звонка с авто-переключением на запасного провайдера
   * при ошибке или превышении таймаута в 2 секунды
   */
  async initiateCallWithFailover(params: CallInitiateParams): Promise<FailoverCallResult> {
    const startTime = Date.now();

    // 1. Попытка через основного провайдера
    try {
      if (this.primaryProvider.isConfigured()) {
        logger.info({
          provider: this.primaryProvider.name,
          to: params.toPhone,
        }, `Попытка звонка через основного провайдера [${this.primaryProvider.name}]...`);

        // Защита: тайм-аут 2000 мс по ТЗ
        const result = await Promise.race([
          this.primaryProvider.initiateCall(params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Таймаут основного провайдера телефонии (> 2000 мс)')), 2000)
          ),
        ]);

        return {
          result,
          usedFallback: false,
          provider: this.primaryProvider.name,
        };
      } else {
        logger.warn({ provider: this.primaryProvider.name }, 'Основной провайдер не сконфигурирован. Переключение на запасной...');
      }
    } catch (primaryError: any) {
      const elapsed = Date.now() - startTime;
      logger.error({
        error: primaryError.message,
        elapsedMs: elapsed,
        provider: this.primaryProvider.name,
      }, `⚠️ Ошибка или таймаут основного провайдера [${this.primaryProvider.name}], выполняем мгновенный FAILOVER на запасного...`);
    }

    // 2. Аварийное переключение на запасного провайдера
    try {
      logger.info({
        provider: this.fallbackProvider.name,
        to: params.toPhone,
      }, `🔄 Инициация звонка через ЗАПАСНОГО провайдера [${this.fallbackProvider.name}]...`);

      const result = await this.fallbackProvider.initiateCall(params);

      return {
        result,
        usedFallback: true,
        provider: this.fallbackProvider.name,
      };
    } catch (fallbackError: any) {
      logger.error({
        error: fallbackError.message,
        provider: this.fallbackProvider.name,
      }, '❌ Критическая ошибка: оба провайдера телефонии недоступны');
      throw new Error(`Сбой телефонии (Основной: ${this.primaryProvider.name}, Запасной: ${this.fallbackProvider.name}): ${fallbackError.message}`);
    }
  }
}

export const telephonyService = new TelephonyService();

