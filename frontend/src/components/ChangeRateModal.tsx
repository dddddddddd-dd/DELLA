import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Cargo } from '../types';
import { apiClient } from '../api/client';
import { ShieldCheck, TrendingUp } from 'lucide-react';

interface ChangeRateModalProps {
  cargo: Cargo | null;
  isOpen: boolean;
  onClose: () => void;
  onRateChanged: () => void;
}

export const ChangeRateModal: React.FC<ChangeRateModalProps> = ({
  cargo,
  isOpen,
  onClose,
  onRateChanged,
}) => {
  const [newRate, setNewRate] = useState<number>(cargo?.rateKzt || 0);
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (cargo) {
      setNewRate(cargo.rateKzt);
      setReason('');
      setError(null);
    }
  }, [cargo]);

  if (!cargo) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newRate || newRate <= 0) {
      setError('Укажите корректную сумму ставки');
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      setError('Обязательно укажите подробную причину изменения ставки');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.patch(`/dispatcher/cargos/${cargo.id}/rate`, {
        newRate: Number(newRate),
        reason: reason.trim(),
      });

      onRateChanged();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления ставки');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Изменение ставки (Честная ставка DELLA)"
      subtitle={`Рейс #${cargo.cargoNumber}: ${cargo.originCity} → ${cargo.destinationCity}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>Фиксация честной ставки</span>
          </div>
          При изменении ставки водитель получит мгновенное уведомление в кабинете, а запись попадет в историю аудита с вашим именем.
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-sm">
          <span className="text-slate-600">Текущая ставка:</span>
          <span className="font-bold text-slate-900">
            {cargo.rateKzt.toLocaleString('ru-RU')} ₸
          </span>
        </div>

        <div>
          <Input
            label="Новая ставка (в тенге)"
            type="number"
            step="1000"
            min="1000"
            value={newRate}
            onChange={(e) => setNewRate(parseInt(e.target.value) || 0)}
            required
            hint="Укажите итоговую чистую сумму для перевозчика"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
            Причина изменения ставки <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full min-h-[90px] p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            placeholder="Например: Заказчик согласовал доплату 50 000 ₸ за срочную ночную погрузку"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Подтвердить ставку
          </Button>
        </div>
      </form>
    </Modal>
  );
};

