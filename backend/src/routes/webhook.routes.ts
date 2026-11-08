import { Router, Request, Response } from 'express';
import { autoCallManager } from '../services/autocall/AutoCallManager.js';
import { telephonyService } from '../services/telephony/TelephonyService.js';
import { logger } from '../utils/logger.js';

export const webhookRouter = Router();

// POST /api/webhooks/call-status — входящие статусы звонка
webhookRouter.post('/call-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const attemptId = (req.query.attemptId as string) || req.body.attemptId;
    const callStatus = req.body.CallStatus || req.body.status || 'unknown';
    const duration = req.body.CallDuration ? parseInt(req.body.CallDuration, 10) : undefined;

    logger.info({ attemptId, callStatus, body: req.body }, '📥 Webhook /api/webhooks/call-status получен');

    if (attemptId) {
      await autoCallManager.handleCallStatusUpdate(attemptId, callStatus, duration);
    }

    res.status(200).send('<Response/>');
  } catch (err: any) {
    logger.error({ error: err.message }, 'Ошибка обработки webhook call-status');
    res.status(200).send('<Response/>');
  }
});

// POST /api/webhooks/call-input — приём DTMF нажатий клавиш (1 - взять, 2 - отказ, 9 - повтор)
webhookRouter.post('/call-input', async (req: Request, res: Response): Promise<void> => {
  try {
    const attemptId = (req.query.attemptId as string) || req.body.attemptId;
    // Twilio присылает нажатую клавишу в поле Digits, Zadarma в dtmf
    const dtmfDigit = req.body.Digits || req.body.dtmf || req.body.digit || '';

    logger.info({ attemptId, dtmfDigit, body: req.body }, '🎛️ Webhook /api/webhooks/call-input (DTMF) получен');

    if (!attemptId) {
      res.status(400).send('Missing attemptId');
      return;
    }

    const result = await autoCallManager.handleDtmfInput(attemptId, String(dtmfDigit));

    // Формируем TwiML ответ для робота
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="ru-RU" voice="Polina">${result.message}</Say>
  <Hangup/>
</Response>`;

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twimlResponse);
  } catch (err: any) {
    logger.error({ error: err.message }, 'Ошибка обработки DTMF webhook');
    res.status(200).send('<Response><Hangup/></Response>');
  }
});

