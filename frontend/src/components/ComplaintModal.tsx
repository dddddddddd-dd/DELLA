import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';

interface ComplaintModalProps {
  targetCargoId?: string;
  targetDriverId?: string;
  targetTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onComplaintSubmitted?: () => void;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  targetCargoId,
  targetDriverId,
  targetTitle,
  isOpen,
  onClose,
  onComplaintSubmitted,
}) => {
  const [reason, setReason] = useState('Несоответствие ставки');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reasons = [
    'Несоответствие ставки (предложили другую цену)',
    'Срыв погрузки / отмена рейса без предупреждения',
    'Задержка погрузки / разгрузки более 4 часов',
    'Перегруз сверх согласованного веса',
    'Грубость / неадекватное поведение',
    'Проблема с оформлением документов / ТТН',
    'Другая причина',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!comment.trim() || comment.trim().length < 5) {
      setError('Опишите ситуацию подробнее (не менее 5 символов)');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/driver/complaint', {
        reason,
        comment: comment.trim(),
        targetCargoId: targetCargoId || null,
        targetDriverId: targetDriverId || null,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setComment('');
        if (onComplaintSubmitted) onComplaintSubmitted();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки жалобы');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Подать жалобу"
      subtitle={targetTitle ? `Объект жалобы: ${targetTitle}` : 'Контроль качества перевозок DELLA'}
    >
      {success ? (
        <div className="py-8 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h4 className="text-lg font-bold text-slate-900">Жалоба принята</h4>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            Старший диспетчер DELLA проверит инцидент и свяжется со сторонами для разрешения спора.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <span>
              Сервис DELLA защищает водителей и следит за чистотой сделок. Каждая жалоба детально разбирается руководством.
            </span>
          </div>

          <div>
            <Select
              label="Причина жалобы"
              options={reasons}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Подробный комментарий <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full min-h-[110px] p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Укажите даты, адрес, имена и обстоятельства произошедшего..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Отмена
            </Button>
            <Button variant="danger" type="submit" isLoading={isLoading}>
              Отправить жалобу
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

