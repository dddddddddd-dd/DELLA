import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Complaint } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  User,
  Truck,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

export const ComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Модалка разрешения жалобы
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'IN_PROGRESS' | 'RESOLVED'>('RESOLVED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/dispatcher/complaints', { params });
      if (res.data?.success) {
        setComplaints(res.data.complaints || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки жалоб:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint) return;

    setIsSubmitting(true);
    try {
      await apiClient.patch(`/dispatcher/complaints/${activeComplaint.id}`, {
        status: resolutionStatus,
        resolution: resolutionNote.trim() || undefined,
      });

      setActiveComplaint(null);
      setResolutionNote('');
      fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления статуса жалобы');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Шапка */}
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-red-600" />
          <span>Отдел контроля качества и претензий</span>
        </h1>
        <p className="text-xs text-[#475569]">
          Жалобы от водителей и заказчиков. Контроль честной ставки и своевременной оплаты.
        </p>
      </div>

      {/* Фильтр по статусу */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
        {[
          { id: '', label: 'Все жалобы' },
          { id: 'NEW', label: 'Новые' },
          { id: 'IN_PROGRESS', label: 'В работе' },
          { id: 'RESOLVED', label: 'Закрытые' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setStatusFilter(item.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === item.id
                ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                : 'text-slate-600 hover:bg-slate-50 border border-transparent'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Список жалоб */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Загрузка обращений...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
          <p className="text-sm font-bold text-slate-700">Жалоб с выбранным статусом нет</p>
          <p className="text-xs text-slate-400">Все рейсы выполняются в штатном режиме</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 sm:p-6 space-y-4 shadow-card ${
                item.status === 'NEW'
                  ? 'border-red-300 ring-2 ring-red-500/10'
                  : 'border-slate-200'
              }`}
            >
              {/* Шапка жалобы */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    #{item.id.slice(0, 8)}
                  </span>
                  <Badge
                    variant={
                      item.status === 'NEW'
                        ? 'danger'
                        : item.status === 'IN_PROGRESS'
                        ? 'warning'
                        : 'success'
                    }
                    size="sm"
                  >
                    {item.status === 'NEW' && 'Новая жалоба'}
                    {item.status === 'IN_PROGRESS' && 'В работе'}
                    {item.status === 'RESOLVED' && 'Закрыта'}
                  </Badge>
                </div>

                <div className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleString('ru-RU')}
                </div>
              </div>

              {/* Автор и объект */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block">Автор обращения:</span>
                  <strong className="text-slate-900">
                    {item.author.fullName} ({item.author.phone})
                  </strong>
                  <span className="text-[10px] text-slate-500 block">
                    Роль: {item.author.role === 'DRIVER' ? 'Водитель' : 'Диспетчер'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block">Объект претензии:</span>
                  {item.targetCargo && (
                    <strong className="text-blue-700">
                      Рейс #{item.targetCargo.cargoNumber} ({item.targetCargo.originCity} → {item.targetCargo.destinationCity})
                    </strong>
                  )}
                  {item.targetDriver && (
                    <strong className="text-slate-900">
                      Водитель {item.targetDriver.fullName} ({item.targetDriver.phone})
                    </strong>
                  )}
                  {!item.targetCargo && !item.targetDriver && (
                    <span className="text-slate-500">Общая претензия</span>
                  )}
                </div>
              </div>

              {/* Причина и комментарий */}
              <div className="space-y-1.5">
                <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{item.reason}</span>
                </div>
                <p className="text-xs text-slate-700 bg-red-50/40 p-3 rounded-xl border border-red-100 leading-relaxed">
                  {item.comment}
                </p>
              </div>

              {/* Резолюция диспетчера если есть */}
              {item.resolution && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Решение диспетчера DELLA:</span>
                  </div>
                  <p>{item.resolution}</p>
                </div>
              )}

              {/* Кнопка смены статуса */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveComplaint(item);
                    setResolutionStatus(item.status === 'NEW' ? 'IN_PROGRESS' : 'RESOLVED');
                    setResolutionNote(item.resolution || '');
                  }}
                >
                  Обработать обращение
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка изменения статуса жалобы */}
      {activeComplaint && (
        <Modal
          isOpen={Boolean(activeComplaint)}
          onClose={() => setActiveComplaint(null)}
          title="Обработка жалобы"
          subtitle={`Обращение от ${activeComplaint.author.fullName}: ${activeComplaint.reason}`}
        >
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2">
                Установить статус:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolutionStatus('IN_PROGRESS')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    resolutionStatus === 'IN_PROGRESS'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  В работе
                </button>
                <button
                  type="button"
                  onClick={() => setResolutionStatus('RESOLVED')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    resolutionStatus === 'RESOLVED'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  Закрыта (решено)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                Резолюция / принятые меры:
              </label>
              <textarea
                className="w-full min-h-[90px] p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                placeholder="Опишите, как был урегулирован спор (например: Заказчик выплатил компенсацию за простой 30 000 ₸)..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setActiveComplaint(null)}>
                Отмена
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Сохранить решение
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

