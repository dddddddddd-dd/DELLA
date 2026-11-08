import React, { useState } from 'react';
import { Truck, MapPin, Weight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { KZ_CITIES, BODY_TYPES, Vehicle } from '../types';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface VehicleCardProps {
  vehicle: Vehicle | null;
  onVehicleUpdated: () => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onVehicleUpdated,
}) => {
  const { updateUserVehicle } = useAuth();
  const [capacityTons, setCapacityTons] = useState<number>(
    vehicle?.capacityTons || 15
  );
  const [bodyType, setBodyType] = useState<string>(
    vehicle?.bodyType || 'Тент'
  );
  const [currentCity, setCurrentCity] = useState<string>(
    vehicle?.currentCity || 'Шымкент'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveAndSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);

    try {
      const res = await apiClient.put('/driver/vehicle', {
        capacityTons: Number(capacityTons),
        bodyType,
        currentCity,
        plateNumber: vehicle?.plateNumber,
        model: vehicle?.model,
      });

      if (res.data?.success && res.data?.vehicle) {
        updateUserVehicle(res.data.vehicle);
        setSuccessMessage('Параметры машины сохранены в профиле!');
        onVehicleUpdated();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения параметров');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-200/80 p-6 sm:p-7">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Моя машина</h2>
            <p className="text-xs text-[#475569]">Параметры вашего автотранспорта</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-[#DCFCE7] px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Профиль подтверждён</span>
        </div>
      </div>

      <form onSubmit={handleSaveAndSearch} className="mt-5 space-y-4">
        {/* Город дислокации */}
        <div>
          <Select
            label="Город, где находится машина"
            value={currentCity}
            onChange={(e) => setCurrentCity(e.target.value)}
            options={KZ_CITIES}
            hint="Показываются грузы с погрузкой в этом городе"
            required
          />
        </div>

        {/* Тип кузова */}
        <div>
          <Select
            label="Тип кузова"
            value={bodyType}
            onChange={(e) => setBodyType(e.target.value)}
            options={BODY_TYPES}
            required
          />
        </div>

        {/* Грузоподъемность */}
        <div>
          <Input
            label="Грузоподъёмность (тонн)"
            type="number"
            step="0.5"
            min="0.5"
            max="60"
            value={capacityTons}
            onChange={(e) => setCapacityTons(parseFloat(e.target.value) || 0)}
            required
            hint="Подбираем грузы весом не больше этой цифры"
          />
        </div>

        {/* Дополнительные данные авто (если есть) */}
        {(vehicle?.model || vehicle?.plateNumber) && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span>Авто: <strong>{vehicle.model || 'Тягач'}</strong></span>
            <span>Госномер: <strong>{vehicle.plateNumber || '—'}</strong></span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full text-base font-semibold"
          isLoading={isSaving}
        >
          Найти груз
        </Button>
      </form>

      <div className="mt-4 pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-[#475569]">
          Данные автоматически сохраняются в вашем профиле. Измените город, когда переедете в другой регион Казахстана.
        </p>
      </div>
    </div>
  );
};

