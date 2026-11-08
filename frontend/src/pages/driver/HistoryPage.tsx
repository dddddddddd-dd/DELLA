import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Cargo } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ReviewModal } from '../../components/ReviewModal';
import { ComplaintModal } from '../../components/ComplaintModal';
import {
  Calendar,
  Weight,
  ArrowRight,
  Star,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Truck,
  CheckCircle2,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [cargos, setCargos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Модальные окна
  const [reviewCargo, setReviewCargo] = useState<Cargo | null>(null);
  const [complaintCargo, setComplaintCargo] = useState<Cargo | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/driver/history');
      if (res.data?.success) {
        setCargos(res.data.cargos || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки истории рейсов:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">
            История рейсов
          </h1>
          <p className="text-xs text-[#475569]">
            Список выполненных перевозок, ваши отзывы и оценки заказчиков
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Загружаем историю перевозок...</p>
        </div>
      ) : cargos.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            В истории пока нет завершённых рейсов
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Перейдите в «Кабинет и подбор», выберите подходящий груз и нажмите «Беру груз». После завершения доставки здесь появится карточка для оценки.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cargos.map((cargo) => {
            const myReview = cargo.reviews && cargo.reviews.length > 0 ? cargo.reviews[0] : null;
            const formattedDate = new Date(cargo.loadingDate).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <div
                key={cargo.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 sm:p-6 space-y-4"
              >
                {/* Шапка карточки */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      Рейс #{cargo.cargoNumber}
                    </span>
                    <Badge variant={cargo.status === 'COMPLETED' ? 'success' : 'info'} size="sm">
                      {cargo.status === 'COMPLETED' ? 'Доставлен' : 'В работе'}
                    </Badge>
                  </div>

                  <div className="text-sm font-bold text-blue-700">
                    {cargo.rateKzt.toLocaleString('ru-RU')} ₸
                  </div>
                </div>

                {/* Маршрут */}
                <div className="flex items-center gap-3 text-lg font-bold text-[#0F172A]">
                  <span>{cargo.originCity}</span>
                  <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span>{cargo.destinationCity}</span>
                </div>

                {/* Параметры */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Вес:</span>
                    <strong className="text-slate-900">{cargo.weightTons} т</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Тип кузова:</span>
                    <strong className="text-slate-900">{cargo.bodyType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Дата погрузки:</span>
                    <strong className="text-slate-900">{formattedDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Заказчик:</span>
                    <strong className="text-slate-900 truncate block">
                      {cargo.customerCompany || cargo.customerName}
                    </strong>
                  </div>
                </div>

                {/* Блок отзыва */}
                {myReview ? (
                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < myReview.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                        <span className="ml-1 font-bold text-slate-800">
                          {myReview.rating} из 5
                        </span>
                      </div>
                      <span className="text-slate-400">
                        {new Date(myReview.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    {myReview.comment && (
                      <p className="text-slate-700 italic">
                        «{myReview.comment}»
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-slate-500">
                      Рейс завершён. Оцените работу заказчика для сообщества водителей DELLA.
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setReviewCargo(cargo)}
                      icon={<Star className="w-4 h-4" />}
                    >
                      Оставить отзыв
                    </Button>
                  </div>
                )}

                {/* Кнопка пожаловаться */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setComplaintCargo(cargo)}
                    className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Пожаловаться на заказчика</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модалки отзыва и жалобы */}
      {reviewCargo && (
        <ReviewModal
          isOpen={Boolean(reviewCargo)}
          onClose={() => setReviewCargo(null)}
          cargoId={reviewCargo.id}
          cargoTitle={`#${reviewCargo.cargoNumber} (${reviewCargo.originCity} → ${reviewCargo.destinationCity})`}
          onReviewSubmitted={fetchHistory}
        />
      )}

      {complaintCargo && (
        <ComplaintModal
          isOpen={Boolean(complaintCargo)}
          onClose={() => setComplaintCargo(null)}
          targetCargoId={complaintCargo.id}
          targetTitle={`Рейс #${complaintCargo.cargoNumber} (${complaintCargo.originCity} → ${complaintCargo.destinationCity})`}
        />
      )}
    </div>
  );
};

