import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Cargo, KZ_CITIES, BODY_TYPES } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { ChangeRateModal } from '../../components/ChangeRateModal';
import { RateHistoryModal } from '../../components/RateHistoryModal';
import { CargoDetailModal } from '../../components/CargoDetailModal';
import {
  Plus,
  Search,
  Truck,
  ArrowRight,
  ShieldCheck,
  History,
  Phone,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface CargosPageProps {
  onOpenMatchingForCargo?: (cargoId: string) => void;
}

export const CargosPage: React.FC<CargosPageProps> = ({ onOpenMatchingForCargo }) => {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [originCityFilter, setOriginCityFilter] = useState<string>('');

  // Модалка добавления груза
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    originCity: 'Шымкент',
    destinationCity: 'Астана',
    weightTons: 14,
    bodyType: 'Тент',
    loadingDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    rateKzt: 650000,
    customerName: '',
    customerPhone: '',
    customerCompany: '',
    description: '',
  });
  const [addError, setAddError] = useState<string | null>(null);

  // Модалка изменения честной ставки
  const [rateModalCargo, setRateModalCargo] = useState<Cargo | null>(null);
  // Модалка истории ставок
  const [historyModalCargo, setHistoryModalCargo] = useState<Cargo | null>(null);
  // Детали груза
  const [detailModalCargo, setDetailModalCargo] = useState<Cargo | null>(null);

  const fetchCargos = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (originCityFilter) params.originCity = originCityFilter;

      const res = await apiClient.get('/dispatcher/cargos', { params });
      if (res.data?.success) {
        setCargos(res.data.cargos || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки грузов:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCargos();
  }, [statusFilter, originCityFilter]);

  // Создание нового груза
  const handleCreateCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    try {
      await apiClient.post('/dispatcher/cargos', {
        originCity: addForm.originCity,
        destinationCity: addForm.destinationCity,
        weightTons: Number(addForm.weightTons),
        bodyType: addForm.bodyType,
        loadingDate: addForm.loadingDate,
        rateKzt: Number(addForm.rateKzt),
        customerName: addForm.customerName.trim(),
        customerPhone: addForm.customerPhone.trim(),
        customerCompany: addForm.customerCompany.trim() || undefined,
        description: addForm.description.trim() || undefined,
      });

      setIsAddOpen(false);
      setAddForm({
        originCity: 'Шымкент',
        destinationCity: 'Астана',
        weightTons: 14,
        bodyType: 'Тент',
        loadingDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        rateKzt: 650000,
        customerName: '',
        customerPhone: '',
        customerCompany: '',
        description: '',
      });
      fetchCargos();
    } catch (err: any) {
      setAddError(err.message || 'Ошибка создания груза');
    }
  };

  // Включение / отключение автозвонков по конкретному грузу
  const handleToggleAutoCall = async (cargoId: string, currentEnabled: boolean) => {
    try {
      await apiClient.patch(`/dispatcher/cargos/${cargoId}/toggle-autocall`, {
        enabled: !currentEnabled,
      });
      fetchCargos();
    } catch (err: any) {
      alert(err.message || 'Ошибка переключения автозвонков');
    }
  };

  // Закрыть / сменить статус груза
  const handleChangeStatus = async (cargoId: string, newStatus: string) => {
    if (!confirm(`Перевести груз в статус «${newStatus}»?`)) return;

    try {
      await apiClient.patch(`/dispatcher/cargos/${cargoId}/status`, {
        status: newStatus,
      });
      fetchCargos();
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления статуса');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Шапка страницы */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">
            Управление грузами
          </h1>
          <p className="text-xs text-[#475569]">
            Публикация грузов, подтверждение ставок, распределение по водителям
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          icon={<Plus className="w-5 h-5" />}
        >
          Добавить груз
        </Button>
      </div>

      {/* Фильтры */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'OPEN', label: 'Открытые (в поиске)' },
            { id: 'IN_PROGRESS', label: 'В работе' },
            { id: 'COMPLETED', label: 'Завершённые' },
            { id: 'CANCELLED', label: 'Закрытые / Отмена' },
            { id: '', label: 'Все грузы' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st.id
                  ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-56">
          <select
            value={originCityFilter}
            onChange={(e) => setOriginCityFilter(e.target.value)}
            className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
          >
            <option value="">Все города погрузки</option>
            {KZ_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Список грузов */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Загружаем список грузов...</p>
        </div>
      ) : cargos.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
          <p className="text-sm text-slate-500">Грузы не найдены для выбранных фильтров.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cargos.map((cargo) => {
            const formattedDate = new Date(cargo.loadingDate).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            const hasRequests = (cargo.driverRequests?.length || 0) > 0;

            return (
              <div
                key={cargo.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-card hover:shadow-hover transition-all"
              >
                {/* Верхняя строка: Номер, статус, ставка, честная ставка */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                      #{cargo.cargoNumber}
                    </span>
                    <Badge
                      variant={
                        cargo.status === 'OPEN'
                          ? 'neutral'
                          : cargo.status === 'IN_PROGRESS'
                          ? 'info'
                          : cargo.status === 'COMPLETED'
                          ? 'success'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {cargo.status === 'OPEN' && 'Открыт (в поиске)'}
                      {cargo.status === 'IN_PROGRESS' && 'В рейсе'}
                      {cargo.status === 'COMPLETED' && 'Доставлен'}
                      {cargo.status === 'CANCELLED' && 'Закрыт'}
                    </Badge>

                    {/* Отклик от водителя */}
                    {hasRequests && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full animate-pulse">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Водитель нажал «Беру груз»</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Ставка:</div>
                      <div className="text-lg font-black text-[#1D4ED8]">
                        {cargo.rateKzt.toLocaleString('ru-RU')} ₸
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRateModalCargo(cargo)}
                    >
                      Изменить ставку
                    </Button>
                  </div>
                </div>

                {/* Маршрут и параметры */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-5 space-y-1">
                    <div className="flex items-center gap-2 text-lg font-bold text-[#0F172A]">
                      <span>{cargo.originCity}</span>
                      <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span>{cargo.destinationCity}</span>
                    </div>
                    {cargo.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {cargo.description}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 block">Вес / Кузов:</span>
                      <strong className="text-slate-800">{cargo.weightTons} т • {cargo.bodyType}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Погрузка:</span>
                      <strong className="text-slate-800">{formattedDate}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Заказчик:</span>
                      <strong className="text-slate-800">{cargo.customerCompany || cargo.customerName} ({cargo.customerPhone})</strong>
                    </div>
                  </div>

                  <div className="md:col-span-3 flex flex-col gap-2 justify-center">
                    {cargo.status === 'OPEN' && onOpenMatchingForCargo && (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => onOpenMatchingForCargo(cargo.id)}
                        icon={<Sparkles className="w-4 h-4 text-amber-300" />}
                      >
                        Подобрать водителей
                      </Button>
                    )}

                    <div className="flex items-center gap-1.5 justify-end">
                      {cargo.status === 'OPEN' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleChangeStatus(cargo.id, 'CANCELLED')}
                        >
                          Закрыть груз
                        </Button>
                      )}
                      {cargo.status === 'IN_PROGRESS' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleChangeStatus(cargo.id, 'COMPLETED')}
                        >
                          Завершить рейс
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Блок статуса автозвонков по кандидатам-водителям по ТЗ */}
                {cargo.status === 'OPEN' && (
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          <span>Автообзвон роботом:</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            cargo.autoCallEnabled !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {cargo.autoCallEnabled !== false ? 'Включен (< 3с)' : 'Приостановлен'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAutoCall(cargo.id, cargo.autoCallEnabled !== false)}
                          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline"
                        >
                          {cargo.autoCallEnabled !== false ? 'Остановить автозвонки' : 'Возобновить автозвонки'}
                        </button>
                        <a
                          href={`tel:${cargo.customerPhone.replace(/\s+/g, '')}`}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="Ручной звонок заказчику/водителю"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Позвонить вручную</span>
                        </a>
                      </div>
                    </div>

                    {/* Список попыток звонков водителям */}
                    {cargo.callAttempts && cargo.callAttempts.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {cargo.callAttempts.map((attempt) => (
                          <span
                            key={attempt.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                              attempt.status === 'accepted'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : attempt.status === 'declined'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : attempt.status === 'no_answer'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{attempt.driver?.fullName || 'Водитель'}:</span>
                            <strong>
                              {attempt.status === 'accepted' && 'Принял (1)'}
                              {attempt.status === 'declined' && 'Отказался (2)'}
                              {attempt.status === 'no_answer' && 'Не ответил'}
                              {attempt.status === 'dialing' && 'Звоним...'}
                              {attempt.status === 'ringing' && 'Вызов...'}
                              {attempt.status === 'answered' && 'Разговор'}
                            </strong>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">
                        Ожидание первого свободного подходящего водителя с согласием на звонки...
                      </div>
                    )}
                  </div>
                )}

                {/* Назначенный водитель если в работе */}
                {cargo.assignedDriver && (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                    <span>
                      Исполнитель: <strong>{cargo.assignedDriver.fullName}</strong> ({cargo.assignedDriver.phone})
                    </span>
                    <a
                      href={`tel:${cargo.assignedDriver.phone.replace(/\s+/g, '')}`}
                      className="font-bold text-emerald-800 underline flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Позвонить
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Модалка создания нового груза */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Добавить новый груз"
        subtitle="Груз сразу станет доступен для подбора подходящим водителям"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCargo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Город погрузки (Откуда)"
              options={KZ_CITIES}
              value={addForm.originCity}
              onChange={(e) => setAddForm({ ...addForm, originCity: e.target.value })}
              required
            />
            <Select
              label="Город выгрузки (Куда)"
              options={KZ_CITIES}
              value={addForm.destinationCity}
              onChange={(e) => setAddForm({ ...addForm, destinationCity: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Вес груза (тонн)"
              type="number"
              step="0.5"
              min="0.5"
              value={addForm.weightTons}
              onChange={(e) => setAddForm({ ...addForm, weightTons: parseFloat(e.target.value) || 0 })}
              required
            />
            <Select
              label="Тип кузова"
              options={BODY_TYPES}
              value={addForm.bodyType}
              onChange={(e) => setAddForm({ ...addForm, bodyType: e.target.value })}
              required
            />
            <Input
              label="Дата погрузки"
              type="date"
              value={addForm.loadingDate}
              onChange={(e) => setAddForm({ ...addForm, loadingDate: e.target.value })}
              required
            />
          </div>

          <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
            <Input
              label="Ставка перевозчику (в тенге) — Честная ставка"
              type="number"
              step="1000"
              min="1000"
              value={addForm.rateKzt}
              onChange={(e) => setAddForm({ ...addForm, rateKzt: parseInt(e.target.value) || 0 })}
              required
              hint="Будет опубликована со статусом «Подтверждена»"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Контактное лицо"
              placeholder="Бауыржан"
              value={addForm.customerName}
              onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
              required
            />
            <Input
              label="Телефон заказчика"
              placeholder="+7 778 300 1122"
              value={addForm.customerPhone}
              onChange={(e) => setAddForm({ ...addForm, customerPhone: e.target.value })}
              required
            />
            <Input
              label="Компания (ТОО/ИП)"
              placeholder="ТОО Азия Логистик"
              value={addForm.customerCompany}
              onChange={(e) => setAddForm({ ...addForm, customerCompany: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Характер груза и условия погрузки
            </label>
            <textarea
              className="w-full min-h-[70px] p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              placeholder="Например: Паллеты, боковая загрузка, чистый кузов, оплата сразу по ТТН"
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
            />
          </div>

          {addError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {addError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>
              Отмена
            </Button>
            <Button variant="primary" type="submit">
              Опубликовать груз
            </Button>
          </div>
        </form>
      </Modal>

      {/* Модалка изменения ставки */}
      <ChangeRateModal
        cargo={rateModalCargo}
        isOpen={Boolean(rateModalCargo)}
        onClose={() => setRateModalCargo(null)}
        onRateChanged={fetchCargos}
      />

      {/* Модалка истории ставок */}
      <RateHistoryModal
        cargo={historyModalCargo}
        isOpen={Boolean(historyModalCargo)}
        onClose={() => setHistoryModalCargo(null)}
      />
    </div>
  );
};

