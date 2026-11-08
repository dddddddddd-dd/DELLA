import React from 'react';
import {
  ArrowRight,
  Calendar,
  Weight,
  Truck,
  ShieldCheck,
  Sparkles,
  Info,
  Clock,
  History,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Cargo } from '../types';

interface CargoCardProps {
  cargo: Cargo;
  isBestMatch?: boolean;
  weightDifferenceTons?: number;
  onTakeCargo?: (cargo: Cargo) => void;
  onViewDetails?: (cargo: Cargo) => void;
  onViewRateHistory?: (cargo: Cargo) => void;
  onComplaint?: (cargo: Cargo) => void;
  isDriverView?: boolean;
  isRequested?: boolean;
}

export const CargoCard: React.FC<CargoCardProps> = ({
  cargo,
  isBestMatch = false,
  weightDifferenceTons,
  onTakeCargo,
  onViewDetails,
  onViewRateHistory,
  onComplaint,
  isDriverView = true,
  isRequested = false,
}) => {
  const formattedDate = new Date(cargo.loadingDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const hasRateChanges = (cargo.rateChanges?.length || 0) > 0;

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
        isBestMatch
          ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-hover'
          : 'border-slate-200/90 shadow-card hover:shadow-hover'
      }`}
    >
      {/* Верхняя плашка для лучшего совпадения */}
      {isBestMatch && (
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-5 py-2.5 flex items-center justify-between text-xs font-bold tracking-wide">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="uppercase">Лучшее совпадение для вашей машины</span>
          </div>
          {weightDifferenceTons !== undefined && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-sm">
              Запас по весу: всего {weightDifferenceTons} т
            </span>
          )}
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-4">
        {/* Шапка карточки: Номер, бейджи ставки и статуса */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              #{cargo.cargoNumber}
            </span>
            <Badge variant="neutral" size="sm">
              <Truck className="w-3.5 h-3.5 mr-1" />
              {cargo.bodyType}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Статус честной ставки: Подтверждена в зеленом */}
            {cargo.rateStatus === 'CONFIRMED' ? (
              <Badge variant="success" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                Ставка подтверждена
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                На согласовании
              </Badge>
            )}

            {hasRateChanges && (
              <button
                type="button"
                onClick={() => onViewRateHistory && onViewRateHistory(cargo)}
                className="text-[11px] text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium transition-colors"
                title="История изменений ставки"
              >
                <History className="w-3 h-3" />
                <span>История ставки ({cargo.rateChanges?.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Маршрут (Откуда -> Куда) */}
        <div>
          <div className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#0F172A]">
            <span className="truncate">{cargo.originCity}</span>
            <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span className="truncate">{cargo.destinationCity}</span>
          </div>
          {cargo.description && (
            <p className="mt-1 text-xs text-[#475569] line-clamp-1">
              {cargo.description}
            </p>
          )}
        </div>

        {/* Параметры: Вес, Дата погрузки, Ставка в тенге */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
          <div>
            <div className="text-[11px] text-[#475569] flex items-center gap-1 font-medium">
              <Weight className="w-3.5 h-3.5 text-slate-500" />
              <span>Вес груза</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-[#0F172A] mt-0.5">
              {cargo.weightTons} т
            </div>
          </div>

          <div>
            <div className="text-[11px] text-[#475569] flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Дата погрузки</span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#0F172A] mt-0.5 truncate">
              {formattedDate}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <div className="text-[11px] text-[#475569] flex items-center gap-1 font-medium">
              <span>Честная ставка</span>
            </div>
            <div className="text-base sm:text-lg font-black text-[#1D4ED8] mt-0.5">
              {cargo.rateKzt.toLocaleString('ru-RU')} ₸
            </div>
          </div>
        </div>

        {/* Нижняя часть с кнопками действий */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Ссылка пожаловаться для водителя */}
          {isDriverView && onComplaint && (
            <button
              type="button"
              onClick={() => onComplaint(cargo)}
              className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Пожаловаться на груз</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            {/* Для первого карточки "Лучшее совпадение" кнопка "Беру груз", для остальных "Подробнее" */}
            {isBestMatch && onTakeCargo ? (
              <Button
                variant={isRequested ? 'secondary' : 'success'}
                size="md"
                onClick={() => onTakeCargo(cargo)}
                disabled={isRequested}
                className="w-full sm:w-auto font-bold shadow-md shadow-emerald-700/20"
                icon={<Truck className="w-5 h-5" />}
              >
                {isRequested ? 'Заявка отправлена' : 'Беру груз'}
              </Button>
            ) : null}

            {onViewDetails && (
              <Button
                variant={isBestMatch ? 'outline' : 'primary'}
                size="md"
                onClick={() => onViewDetails(cargo)}
                className="w-full sm:w-auto"
                icon={<Info className="w-4 h-4" />}
              >
                Подробнее
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

