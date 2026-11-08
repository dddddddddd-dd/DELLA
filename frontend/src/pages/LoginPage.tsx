import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import {
  Truck,
  ShieldCheck,
  PhoneCall,
  CheckCircle2,
  Sparkles,
  Lock,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/auth/login', {
        login: username.trim(),
        password,
      });

      if (res.data?.success && res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка входа в систему');
    } finally {
      setIsLoading(false);
    }
  };

  // Быстрый выбор тестового аккаунта для демонстрации
  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#F3F5F8] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* ЛЕВАЯ ПАНЕЛЬ: Тёмная панель по ТЗ */}
        <div className="lg:col-span-6 bg-[#0B1528] text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Фоновые декоративные элементы */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

          {/* Верхняя часть: Логотип DELLA */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1D4ED8] flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <Truck className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-3xl font-black tracking-wider text-white">
                  DELLA
                </span>
                <span className="block text-[10px] uppercase font-bold tracking-widest text-blue-400">
                  Логистика Казахстана
                </span>
              </div>
            </div>

            {/* Заголовок по ТЗ */}
            <div className="mt-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/20 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Сервис подбора грузов нового поколения</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Грузы для вашей машины — без долгих поисков
              </h1>
              <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
                Интеллектуальный сервис подбора рейсов под точные параметры вашего грузовика в Казахстане.
              </p>
            </div>
          </div>

          {/* Преимущества DELLA */}
          <div className="relative z-10 my-8 space-y-3.5 border-t border-slate-800 pt-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300">
                <strong className="text-white">Честная ставка:</strong> цена подтверждается диспетчером и никогда не меняется на погрузке.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <PhoneCall className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300">
                <strong className="text-white">Звонок от диспетчера:</strong> нашли груз — мы сами позвоним вам и всё согласуем.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300">
                <strong className="text-white">100% бесплатно для водителей:</strong> никаких платных подписок и скрытых списаний.
              </p>
            </div>
          </div>

          {/* Копирайт внизу панели */}
          <div className="relative z-10 text-[11px] text-slate-500">
            © {new Date().getFullYear()} DELLA Kazakhstan. Защищённая система управления грузоперевозками.
          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ: Форма входа */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-between bg-white">
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A]">
              Вход в личный кабинет
            </h2>
            <p className="mt-1 text-sm text-[#475569]">
              Войдите под вашей учётной записью перевозчика или диспетчера
            </p>

            {error && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                label="Логин"
                type="text"
                placeholder="Введите ваш логин"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              <Input
                label="Пароль"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full mt-2 font-bold shadow-md shadow-blue-600/20"
              >
                Войти в систему
              </Button>
            </form>

            {/* Подпись по ТЗ */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Логин и пароль выдаёт диспетчер</span>
              </div>
              <p className="mt-1 text-[11px] text-[#475569] leading-relaxed">
                Самостоятельная регистрация закрыта в целях защиты от мошенников. Водителей подключает наш отдел логистики.
              </p>
            </div>
          </div>

          {/* Блок быстрого входа для проверки экспертами / тестирования */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Тестовые аккаунты (1 клик):
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('dispatcher', 'password123')}
                className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#1D4ED8] font-bold text-left transition-colors truncate"
              >
                🏢 Диспетчер
                <span className="block text-[10px] font-normal text-slate-500">dispatcher / password123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('driver_erbol', 'driver123')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-left transition-colors truncate"
              >
                🚛 Водитель (Шымкент)
                <span className="block text-[10px] font-normal text-slate-500">Тент 15т / driver123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('driver_kairat', 'driver123')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-left transition-colors truncate"
              >
                🚛 Водитель (Алматы)
                <span className="block text-[10px] font-normal text-slate-500">Рефрижератор 20т</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('driver_alex', 'driver123')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-left transition-colors truncate"
              >
                🚛 Водитель (Астана)
                <span className="block text-[10px] font-normal text-slate-500">Борт 10т</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

