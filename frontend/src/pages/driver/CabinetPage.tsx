import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { VehicleCard } from '../../components/VehicleCard';
import { CargoCard } from '../../components/CargoCard';
import { CargoDetailModal } from '../../components/CargoDetailModal';
import { RateHistoryModal } from '../../components/RateHistoryModal';
import { ComplaintModal } from '../../components/ComplaintModal';
import { MatchingCargoItem, Cargo } from '../../types';
import {
  Truck,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const CabinetPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [matchingItems, setMatchingItems] = useState<MatchingCargoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [requestedCargoIds, setRequestedCargoIds] = useState<Set<string>>(new Set());

  // Модальные окна
  const [selectedCargoForDetails, setSelectedCargoForDetails] = useState<Cargo | null>(null);
  const [selectedCargoForRateHistory, setSelectedCargoForRateHistory] = useState<Cargo | null>(null);
  const [selectedCargoForComplaint, setSelectedCargoForComplaint] = useState<Cargo | null>(null);
  const [takeCargoSuccessMessage, setTakeCargoSuccessMessage] = useState<string | null>(null);
  const [workStatus, setWorkStatus] = useState<string>(user?.workStatus || 'FREE');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (user?.workStatus) {
      setWorkStatus(user.workStatus);
    }
  }, [user?.workStatus]);

  const handleUpdateWorkStatus = async (newStatus: 'FREE' | 'IN_TRIP' | 'RESTING') => {
    setIsUpdatingStatus(true);
    try {
      const res = await apiClient.patch('/driver/work-status', { workStatus: newStatus });
      if (res.data?.success) {
        setWorkStatus(newStatus);
        refreshUser();
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления статуса');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const fetchMatchingCargos = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/driver/matching-cargos');
      if (res.data?.success) {
        setMatchingItems(res.data.cargos || []);
        // Собираем грузы, на которые водитель уже нажал "Беру груз"
        const requested = new Set<string>();
        (res.data.cargos || []).forEach((item: MatchingCargoItem) => {
          if (item.cargo.driverRequests && item.cargo.driverRequests.length > 0) {
            requested.add(item.cargo.id);
          }
        });
        setRequestedCargoIds(requested);
      }
    } catch (err) {
      console.error('Ошибка загрузки грузов:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchingCargos();
  }, []);

  // Обработка кнопки "Беру груз"
  const handleTakeCargo = async (cargo: Cargo) => {
    try {
      const res = await apiClient.post(`/driver/take-cargo/${cargo.id}`);
      if (res.data?.success) {
        setRequestedCargoIds((prev) => new Set(prev).add(cargo.id));
        setTakeCargoSuccessMessage(
          `Заявка на рейс #${cargo.cargoNumber} (${cargo.originCity} → ${cargo.destinationCity}) принята! Диспетчер DELLA свяжется с вами по телефону ${user?.phone} в ближайшие минуты.`
        );
        fetchMatchingCargos();
        setTimeout(() => setTakeCargoSuccessMessage(null), 8000);
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка отправки заявки на груз');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Баннер честной ставки и гарантии бесплатности для водителя */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-base font-bold">DELLA гарантирует честную ставку</h3>
            <p className="text-xs text-blue-100">
              Сервис на 100% бесплатен для водителей. Никаких платных подписок и платного открытия контактов.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold bg-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm w-fit">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Умный алгоритм соответствия кузова и веса</span>
        </div>
      </div>

      {/* Интерактивный переключатель статуса доступности водителя по ТЗ */}
      <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Ваш рабочий статус:
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Робот DELLA звонит и предлагает грузы только в статусе <strong className="text-emerald-700">«Свободен»</strong>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => handleUpdateWorkStatus('FREE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              workStatus === 'FREE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🟢 Свободен
          </button>

          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => handleUpdateWorkStatus('IN_TRIP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              workStatus === 'IN_TRIP'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔵 В рейсе
          </button>

          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => handleUpdateWorkStatus('RESTING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              workStatus === 'RESTING'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚪️ Отдыхаю
          </button>
        </div>
      </div>

      {takeCargoSuccessMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-[#DCFCE7] border border-emerald-300 text-[#166534] flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-semibold leading-relaxed">
            {takeCargoSuccessMessage}
          </div>
        </div>
      )}

      {/* Основная сетка: 2 колонки (Слева "Моя машина", справа "Подходящие грузы") */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ЛЕВАЯ КОЛОНКА: Моя машина (Sticky) */}
        <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
          <VehicleCard
            vehicle={user?.vehicle || null}
            onVehicleUpdated={() => {
              refreshUser();
              fetchMatchingCargos();
            }}
          />

          {/* Информационная карточка помощи */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 text-xs text-slate-600 space-y-2.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-blue-600" />
              <span>Диспетчерская поддержка 24/7</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Если у вас изменился прицеп или требуется консультация по маршруту, диспетчер всегда на связи:
            </p>
            <div className="font-bold text-blue-700 text-sm">+7 (701) 555-01-01</div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Список подходящих грузов */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-[#0F172A]">
                Подходящие грузы
              </h1>
              <p className="text-xs text-[#475569]">
                {matchingItems.length > 0
                  ? `Найдено ${matchingItems.length} груз(ов) с погрузкой в г. ${user?.vehicle?.currentCity || 'Вашем городе'}`
                  : 'Поиск подходящих рейсов по вашим параметрам'}
              </p>
            </div>

            <button
              onClick={fetchMatchingCargos}
              className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="Обновить список"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Обновить</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200/80">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-600">
                Подбираем грузы под вашу грузоподъёмность и кузов...
              </p>
            </div>
          ) : matchingItems.length === 0 ? (
            <div className="py-16 px-6 text-center bg-white rounded-2xl border border-slate-200/80 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Truck className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900">
                  Прямо сейчас нет открытых грузов в г. {user?.vehicle?.currentCity || 'указанном городе'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Попробуйте изменить текущий город в карточке «Моя машина» слева (например, переключите на <strong>Шымкент</strong> или <strong>Алматы</strong>) или подождите, пока диспетчер добавит новый рейс.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {matchingItems.map((item, index) => (
                <CargoCard
                  key={item.cargo.id}
                  cargo={item.cargo}
                  isBestMatch={item.isBestMatch}
                  weightDifferenceTons={item.weightDifferenceTons}
                  isRequested={requestedCargoIds.has(item.cargo.id)}
                  onTakeCargo={handleTakeCargo}
                  onViewDetails={(c) => setSelectedCargoForDetails(c)}
                  onViewRateHistory={(c) => setSelectedCargoForRateHistory(c)}
                  onComplaint={(c) => setSelectedCargoForComplaint(c)}
                  isDriverView={true}
                />
              ))}

              {/* ТЕКСТ ВНИЗУ ПО ТЗ: "Нашли подходящий груз — диспетчер позвонит вам сам" */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center mx-auto">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-[#0F172A]">
                  Нашли подходящий груз — диспетчер позвонит вам сам
                </h4>
                <p className="text-xs text-[#475569] max-w-lg mx-auto leading-relaxed">
                  Нажмите кнопку «Беру груз» на лучшем совпадении или откройте «Подробнее». Наш сотрудник получит уведомление и свяжется с вами по указанному телефону для оформления рейса.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна */}
      <CargoDetailModal
        cargo={selectedCargoForDetails}
        isOpen={Boolean(selectedCargoForDetails)}
        onClose={() => setSelectedCargoForDetails(null)}
        onTakeCargo={handleTakeCargo}
        onViewRateHistory={(c) => setSelectedCargoForRateHistory(c)}
        onComplaint={(c) => setSelectedCargoForComplaint(c)}
        isDriver={true}
      />

      <RateHistoryModal
        cargo={selectedCargoForRateHistory}
        isOpen={Boolean(selectedCargoForRateHistory)}
        onClose={() => setSelectedCargoForRateHistory(null)}
      />

      <ComplaintModal
        isOpen={Boolean(selectedCargoForComplaint)}
        onClose={() => setSelectedCargoForComplaint(null)}
        targetCargoId={selectedCargoForComplaint?.id}
        targetTitle={
          selectedCargoForComplaint
            ? `Рейс #${selectedCargoForComplaint.cargoNumber} (${selectedCargoForComplaint.originCity} → ${selectedCargoForComplaint.destinationCity})`
            : undefined
        }
      />
    </div>
  );
};

