import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Cargo, MatchingDriverItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CallOutcomeModal } from '../../components/CallOutcomeModal';
import {
  Sparkles,
  Phone,
  Truck,
  ArrowRight,
  Star,
  CheckCircle,
  XCircle,
  PhoneMissed,
  AlertCircle,
  UserCheck,
  Calendar,
} from 'lucide-react';

interface MatchingPageProps {
  initialCargoId?: string | null;
}

export const MatchingPage: React.FC<MatchingPageProps> = ({ initialCargoId }) => {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState<string>(initialCargoId || '');
  const [selectedCargo, setSelectedCargo] = useState<Cargo | null>(null);
  const [matches, setMatches] = useState<MatchingDriverItem[]>([]);
  const [isLoadingCargos, setIsLoadingCargos] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // Модалка фиксации звонка
  const [callModalDriver, setCallModalDriver] = useState<any | null>(null);

  // Загружаем открытые грузы
  const fetchOpenCargos = async () => {
    setIsLoadingCargos(true);
    try {
      const res = await apiClient.get('/dispatcher/cargos', { params: { status: 'OPEN' } });
      if (res.data?.success) {
        const openList: Cargo[] = res.data.cargos || [];
        setCargos(openList);
        if (openList.length > 0 && !selectedCargoId) {
          setSelectedCargoId(openList[0].id);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки грузов для подбора:', err);
    } finally {
      setIsLoadingCargos(false);
    }
  };

  useEffect(() => {
    fetchOpenCargos();
  }, []);

  // Когда меняется выбранный груз, загружаем подходящих водителей
  const fetchMatchesForCargo = async (cargoId: string) => {
    if (!cargoId) return;
    setIsLoadingMatches(true);
    try {
      const res = await apiClient.get(`/dispatcher/matching/${cargoId}`);
      if (res.data?.success) {
        setSelectedCargo(res.data.cargo);
        setMatches(res.data.matches || []);
      }
    } catch (err) {
      console.error('Ошибка подбора водителей:', err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (selectedCargoId) {
      fetchMatchesForCargo(selectedCargoId);
    }
  }, [selectedCargoId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Шапка */}
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] flex items-center gap-2.5">
          <Sparkles className="w-7 h-7 text-blue-600" />
          <span>Интеллектуальный подбор водителей</span>
        </h1>
        <p className="text-xs text-[#475569]">
          Алгоритм DELLA сопоставляет город погрузки, тип кузова и подбирает авто с минимальным запасом по весу (лучшее совпадение)
        </p>
      </div>

      {/* Селектор выбора груза */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <label className="block text-sm font-bold text-[#0F172A]">
          Выберите открытый груз для подбора перевозчиков:
        </label>

        {isLoadingCargos ? (
          <div className="text-xs text-slate-500">Загрузка открытых грузов...</div>
        ) : cargos.length === 0 ? (
          <p className="text-sm text-slate-500">Нет открытых грузов для подбора.</p>
        ) : (
          <select
            value={selectedCargoId}
            onChange={(e) => setSelectedCargoId(e.target.value)}
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
          >
            {cargos.map((c) => (
              <option key={c.id} value={c.id}>
                Рейс #{c.cargoNumber}: {c.originCity} → {c.destinationCity} ({c.weightTons} т, {c.bodyType}, {c.rateKzt.toLocaleString('ru-RU')} ₸)
              </option>
            ))}
          </select>
        )}

        {/* Карточка выбранного груза */}
        {selectedCargo && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-900">
              <span>{selectedCargo.originCity}</span>
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <span>{selectedCargo.destinationCity}</span>
            </div>

            <div className="flex items-center gap-4 text-slate-600">
              <span>Вес: <strong>{selectedCargo.weightTons} т</strong></span>
              <span>Кузов: <strong>{selectedCargo.bodyType}</strong></span>
              <span>Ставка: <strong className="text-blue-700">{selectedCargo.rateKzt.toLocaleString('ru-RU')} ₸</strong></span>
              <span>Заказчик: <strong>{selectedCargo.customerName} ({selectedCargo.customerPhone})</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Результаты подбора */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#0F172A]">
            Подходящие водители ({matches.length})
          </h2>
          <span className="text-xs text-slate-500">
            Сортировка: сначала водители с наилучшим совпадением по тоннажу
          </span>
        </div>

        {isLoadingMatches ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200/80">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">
              Поиск подходящих водителей в г. {selectedCargo?.originCity}...
            </p>
          </div>
        ) : matches.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              Подходящих водителей в г. {selectedCargo?.originCity} с кузовом «{selectedCargo?.bodyType}» и грузоподъёмностью ≥ {selectedCargo?.weightTons} т пока не найдено.
            </p>
            <p className="text-xs text-slate-500">
              Зарегистрируйте нового водителя в разделе «Водители» или скорректируйте параметры груза.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((item, idx) => {
              const isBest = idx === 0;
              const outcome = item.callLog?.outcome;

              return (
                <div
                  key={item.driver.id}
                  className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all shadow-card ${
                    isBest
                      ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-hover'
                      : 'border-slate-200 hover:shadow-hover'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Инфо о водителе и авто */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-[#0F172A]">
                          {item.driver.fullName}
                        </h3>

                        {isBest && (
                          <Badge variant="bestMatch" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
                            Лучшее совпадение
                          </Badge>
                        )}

                        <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{item.driver.avgRating || 5.0}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span>Город: <strong>{item.driver.vehicle.currentCity}</strong></span>
                        <span>•</span>
                        <span>Кузов: <strong>{item.driver.vehicle.bodyType}</strong></span>
                        <span>•</span>
                        <span>
                          Грузоподъёмность: <strong>{item.driver.vehicle.capacityTons} т</strong> (запас: {item.capacityDifferenceTons} т)
                        </span>
                        <span>•</span>
                        <span>Авто: <strong>{item.driver.vehicle.model || 'Тягач'}</strong></span>
                      </div>

                      {/* Статус предыдущего звонка */}
                      {outcome && (
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <span className="text-slate-400">Результат предыдущего звонка:</span>
                          {outcome === 'AGREED' && (
                            <Badge variant="success" size="sm" icon={<CheckCircle className="w-3 h-3" />}>
                              Согласен
                            </Badge>
                          )}
                          {outcome === 'DECLINED' && (
                            <Badge variant="danger" size="sm" icon={<XCircle className="w-3 h-3" />}>
                              Отказался
                            </Badge>
                          )}
                          {outcome === 'NO_ANSWER' && (
                            <Badge variant="warning" size="sm" icon={<PhoneMissed className="w-3 h-3" />}>
                              Не ответил
                            </Badge>
                          )}
                          {item.callLog?.comment && (
                            <span className="text-slate-500 italic">«{item.callLog.comment}»</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Кнопка позвонить и зафиксировать результат */}
                    <div className="flex items-center gap-2 sm:self-center">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => setCallModalDriver(item.driver)}
                        icon={<Phone className="w-4 h-4" />}
                      >
                        Позвонить ({item.driver.phone})
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модалка звонка водителю */}
      {callModalDriver && selectedCargo && (
        <CallOutcomeModal
          cargo={selectedCargo}
          driver={callModalDriver}
          isOpen={Boolean(callModalDriver)}
          onClose={() => setCallModalDriver(null)}
          onCallLogged={() => {
            fetchMatchesForCargo(selectedCargo.id);
            fetchOpenCargos();
          }}
        />
      )}
    </div>
  );
};

