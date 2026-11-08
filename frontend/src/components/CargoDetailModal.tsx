import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Cargo } from '../types';
import {
  ArrowRight,
  Calendar,
  Weight,
  Truck,
  ShieldCheck,
  Building2,
  FileText,
  Phone,
  AlertTriangle,
  History,
} from 'lucide-react';

interface CargoDetailModalProps {
  cargo: Cargo | null;
  isOpen: boolean;
  onClose: () => void;
  onTakeCargo?: (cargo: Cargo) => void;
  onViewRateHistory?: (cargo: Cargo) => void;
  onComplaint?: (cargo: Cargo) => void;
  isDriver?: boolean;
}

export const CargoDetailModal: React.FC<CargoDetailModalProps> = ({
  cargo,
  isOpen,
  onClose,
  onTakeCargo,
  onViewRateHistory,
  onComplaint,
  isDriver = true,
}) => {
  if (!cargo) return null;

  const formattedDate = new Date(cargo.loadingDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Детали груза #${cargo.cargoNumber}`}
      subtitle={`${cargo.originCity} → ${cargo.destinationCity}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Маршрут и ставка */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#475569] font-medium">Маршрут рейса</div>
            <div className="text-lg font-black text-[#0F172A] flex items-center gap-2 mt-0.5">
              <span>{cargo.originCity}</span>
              <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span>{cargo.destinationCity}</span>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-xs text-[#475569] font-medium">Честная ставка перевозки</div>
            <div className="text-2xl font-black text-[#1D4ED8]">
              {cargo.rateKzt.toLocaleString('ru-RU')} ₸
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-[#DCFCE7] px-2 py-0.5 rounded-full mt-1 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Подтверждена диспетчером</span>
            </div>
          </div>
        </div>

        {/* Характеристики */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <div className="text-xs text-[#475569] flex items-center gap-1">
              <Weight className="w-3.5 h-3.5" />
              <span>Вес груза</span>
            </div>
            <div className="font-bold text-[#0F172A] mt-1">{cargo.weightTons} т</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <div className="text-xs text-[#475569] flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" />
              <span>Тип кузова</span>
            </div>
            <div className="font-bold text-[#0F172A] mt-1">{cargo.bodyType}</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <div className="text-xs text-[#475569] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Дата погрузки</span>
            </div>
            <div className="font-bold text-[#0F172A] mt-1">{formattedDate}</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <div className="text-xs text-[#475569] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Заказчик / Компания</span>
            </div>
            <div className="font-bold text-[#0F172A] mt-1 truncate">
              {cargo.customerCompany || cargo.customerName}
            </div>
          </div>
        </div>

        {/* Описание / условия погрузки */}
        {cargo.description && (
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Условия погрузки и примечания:</span>
            </div>
            <p className="text-[#475569] leading-relaxed">{cargo.description}</p>
          </div>
        )}

        {/* Контакты заказчика (для диспетчера) или пояснение для водителя */}
        {!isDriver ? (
          <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>Контакты заказчика (служебная информация):</span>
            </div>
            <div>Контактное лицо: <strong>{cargo.customerName}</strong></div>
            <div>Телефон: <strong>{cargo.customerPhone}</strong></div>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              <strong>Нашли подходящий груз?</strong> Нажмите «Беру груз» или сообщите нам — диспетчер DELLA позвонит вам сам и согласует детали.
            </span>
          </div>
        )}

        {/* Кнопки */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {onViewRateHistory && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewRateHistory(cargo)}
                icon={<History className="w-4 h-4" />}
              >
                История ставки
              </Button>
            )}

            {isDriver && onComplaint && (
              <button
                type="button"
                onClick={() => onComplaint(cargo)}
                className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 p-2 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Пожаловаться</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isDriver && onTakeCargo && cargo.status === 'OPEN' && (
              <Button
                variant="success"
                size="md"
                onClick={() => {
                  onTakeCargo(cargo);
                  onClose();
                }}
                icon={<Truck className="w-5 h-5" />}
              >
                Беру груз
              </Button>
            )}
            <Button variant="secondary" size="md" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

