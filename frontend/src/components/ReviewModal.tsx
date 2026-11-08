import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Star, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';

interface ReviewModalProps {
  cargoId: string;
  cargoTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  cargoId,
  cargoTitle,
  isOpen,
  onClose,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post('/driver/review', {
        cargoId,
        rating,
        comment: comment.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setComment('');
        if (onReviewSubmitted) onReviewSubmitted();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки отзыва');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Отзыв о рейсе"
      subtitle={`Рейс: ${cargoTitle}`}
    >
      {success ? (
        <div className="py-8 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h4 className="text-lg font-bold text-slate-900">Спасибо за отзыв!</h4>
          <p className="text-sm text-slate-600">
            Ваша оценка помогает формировать честный рейтинг заказчиков и грузов.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2 text-center">
              Ваша оценка рейса:
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1.5 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-9 h-9 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-xs font-semibold text-slate-600 mt-1">
              {rating === 5 && '⭐️⭐️⭐️⭐️⭐️ Отлично, всё прошло идеально'}
              {rating === 4 && '⭐️⭐️⭐️⭐️ Хорошо, незначительные замечания'}
              {rating === 3 && '⭐️⭐️⭐️ Удовлетворительно'}
              {rating === 2 && '⭐️⭐️ Плохо, были проблемы'}
              {rating === 1 && '⭐️ Ужасно, категорически не рекомендую'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Ваш комментарий (как прошла погрузка, оплата, отношение):
            </label>
            <textarea
              className="w-full min-h-[90px] p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              placeholder="Поделитесь опытом для других водителей..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
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
            <Button variant="primary" type="submit" isLoading={isLoading}>
              Опубликовать отзыв
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

