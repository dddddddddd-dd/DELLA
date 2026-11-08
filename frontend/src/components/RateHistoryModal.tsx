import React from 'react';
import { Modal } from './ui/Modal';
import { Cargo } from '../types';
import { ShieldCheck, TrendingUp, History, ArrowRight } from 'lucide-react';

interface RateHistoryModalProps {
  cargo: Cargo | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RateHistoryModal: React.FC<RateHistoryModalProps> = ({
  cargo,
  isOpen,
  onClose,
}) => {
  if (!cargo) return null;

  const rateChanges = cargo.rateChanges || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`История честной ставки — Рейс #${cargo.cargoNumber}`}
      subtitle={`${cargo.originCity} → ${cargo.destinationCity}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Информационный баннер честной ставки */}
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 leading-relaxed">
            <strong>Принцип Честной Ставки DELLA:</strong> Водитель не должен приезжать на погрузку и узнавать другую цену. Текущая ставка подтверждена диспетчером и составляет <strong>{cargo.rateKzt.toLocaleString('ru-RU')} ₸</strong>. Любые изменения тарифа прозрачно фиксируются.
          </div>
        </div>

        {/* Список изменений ставки */}
        <div className="divide-y divide-slate-100">
          {rateChanges.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              Ставка не менялась с момента создания груза. Цена строго зафиксирована.
            </div>
          ) : (
            rateChanges.map((change, idx) => (
              <div key={change.id || idx} className="py-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Изменил: {change.changedBy?.fullName || 'Диспетчер DELLA'}
                  </span>
                  <span className="text-slate-400">
                    {new Date(change.createdAt).toLocaleString('ru-RU')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-slate-500 line-through">
                    {change.oldRate.toLocaleString('ru-RU')} ₸
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="text-blue-700 text-base">
                    {change.newRate.toLocaleString('ru-RU')} ₸
                  </span>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <strong className="text-slate-800">Причина:</strong> {change.reason}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

