import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Phone, CheckCircle, XCircle, PhoneMissed } from 'lucide-react';
import { apiClient } from '../api/client';

interface CallOutcomeModalProps {
  cargo: { id: string; cargoNumber: number; originCity: string; destinationCity: string } | null;
  driver: { id: string; fullName: string; phone: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onCallLogged: () => void;
}

export const CallOutcomeModal: React.FC<CallOutcomeModalProps> = ({
  cargo,
  driver,
  isOpen,
  onClose,
  onCallLogged,
}) => {
  const [outcome, setOutcome] = useState<'AGREED' | 'DECLINED' | 'NO_ANSWER'>('AGREED');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!cargo || !driver) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.post('/dispatcher/calls', {
        cargoId: cargo.id,
        driverId: driver.id,
        outcome,
        comment: comment.trim() || undefined,
      });

      onCallLogged();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения результата звонка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Фиксация звонка водителю"
      subtitle={`Водитель: ${driver.fullName} (${driver.phone})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Кнопка набора номера */}
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-800 font-medium">Связаться по телефону:</div>
            <div className="text-base font-bold text-blue-900 mt-0.5">{driver.phone}</div>
          </div>
          <a
            href={`tel:${driver.phone.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>Набрать номер</span>
          </a>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-2">
            Результат телефонного разговора:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setOutcome('AGREED')}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                outcome === 'AGREED'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CheckCircle className={`w-5 h-5 ${outcome === 'AGREED' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Согласен</span>
            </button>

            <button
              type="button"
              onClick={() => setOutcome('DECLINED')}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                outcome === 'DECLINED'
                  ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-500/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <XCircle className={`w-5 h-5 ${outcome === 'DECLINED' ? 'text-red-600' : 'text-slate-400'}`} />
              <span>Отказался</span>
            </button>

            <button
              type="button"
              onClick={() => setOutcome('NO_ANSWER')}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                outcome === 'NO_ANSWER'
                  ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <PhoneMissed className={`w-5 h-5 ${outcome === 'NO_ANSWER' ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Не ответил</span>
            </button>
          </div>
        </div>

        {outcome === 'AGREED' && (
          <p className="text-xs text-emerald-700 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100">
            ℹ️ При отметке «Согласен» груз будет автоматически переведен в статус «В работе», а водитель назначен исполнителем рейса.
          </p>
        )}

        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
            Комментарий к звонку (необязательно)
          </label>
          <textarea
            className="w-full min-h-[70px] p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            placeholder="Например: Договорились о погрузке в 10:00, машина чистая"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Сохранить результат
          </Button>
        </div>
      </form>
    </Modal>
  );
};

