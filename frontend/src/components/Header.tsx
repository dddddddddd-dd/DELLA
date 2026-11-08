import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Truck,
  LogOut,
  Bell,
  ShieldCheck,
  User as UserIcon,
  PhoneCall,
  TrendingUp,
} from 'lucide-react';

interface HeaderProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const url =
          user.role === 'DISPATCHER'
            ? '/dispatcher/notifications'
            : '/driver/notifications';
        const res = await apiClient.get(url);
        if (res.data?.success) {
          setNotifications(res.data.notifications || []);
        }
      } catch (err) {
        // silent fail for notifications polling
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // опрос раз в 20с
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Левая часть: Логотип DELLA и навигация */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => onSelectTab && onSelectTab(user.role === 'DRIVER' ? 'cabinet' : 'cargos')}>
              <div className="w-11 h-11 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Truck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-2xl font-black tracking-wider text-[#0F172A]">
                  DELLA
                </span>
                <span className="block text-[10px] uppercase font-bold tracking-widest text-[#1D4ED8]">
                  Казахстан
                </span>
              </div>
            </div>

            {/* Вкладки навигации */}
            {user.role === 'DISPATCHER' ? (
              <nav className="hidden md:flex items-center gap-1">
                {[
                  { id: 'cargos', label: 'Грузы' },
                  { id: 'drivers', label: 'Водители' },
                  { id: 'matching', label: 'Подбор' },
                  { id: 'calls', label: 'Автозвонки' },
                  { id: 'complaints', label: 'Жалобы' },
                  { id: 'audit', label: 'Журнал действий' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab && onSelectTab(item.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      currentTab === item.id
                        ? 'bg-blue-50 text-[#1D4ED8]'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            ) : (
              <nav className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => onSelectTab && onSelectTab('cabinet')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    currentTab === 'cabinet'
                      ? 'bg-blue-50 text-[#1D4ED8]'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                  }`}
                >
                  Кабинет и подбор
                </button>
                <button
                  onClick={() => onSelectTab && onSelectTab('history')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    currentTab === 'history'
                      ? 'bg-blue-50 text-[#1D4ED8]'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                  }`}
                >
                  История рейсов
                </button>
              </nav>
            )}
          </div>

          {/* Правая часть: Гарантии, уведомления и профиль */}
          <div className="flex items-center gap-4">
            {/* Бейдж честной ставки */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Честная ставка DELLA</span>
            </div>

            {/* Колокольчик уведомлений */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Уведомления"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* Выпадающий список уведомлений */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-[#0F172A]">
                      Уведомления ({notifications.length})
                    </span>
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Закрыть
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-sm text-slate-500">
                        Новых уведомлений пока нет
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-3.5 hover:bg-slate-50 transition-colors text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                            {notif.type === 'MATCH_FOUND' || notif.type === 'DRIVER_REQUEST' ? (
                              <PhoneCall className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            ) : (
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            )}
                            <span>{notif.title || 'Новое совпадение'}</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Профиль пользователя */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                {user.fullName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-bold text-[#0F172A] leading-tight">
                  {user.fullName}
                </div>
                <div className="text-xs text-[#475569]">
                  {user.role === 'DISPATCHER' ? 'Диспетчер DELLA' : `Водитель (${user.vehicle?.currentCity || 'Город не указан'})`}
                </div>
              </div>

              {/* Кнопка выхода */}
              <button
                onClick={logout}
                title="Выйти из системы"
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors ml-1"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Мобильная навигация */}
        <div className="md:hidden flex items-center justify-around py-2.5 border-t border-slate-100 overflow-x-auto">
          {user.role === 'DISPATCHER' ? (
            <>
              {['cargos', 'drivers', 'matching', 'calls', 'complaints', 'audit'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => onSelectTab && onSelectTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    currentTab === tab
                      ? 'bg-blue-50 text-[#1D4ED8]'
                      : 'text-slate-600'
                  }`}
                >
                  {tab === 'cargos' && 'Грузы'}
                  {tab === 'drivers' && 'Водители'}
                  {tab === 'matching' && 'Подбор'}
                  {tab === 'calls' && 'Автозвонки'}
                  {tab === 'complaints' && 'Жалобы'}
                  {tab === 'audit' && 'Аудит'}
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                onClick={() => onSelectTab && onSelectTab('cabinet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  currentTab === 'cabinet' ? 'bg-blue-50 text-[#1D4ED8]' : 'text-slate-600'
                }`}
              >
                Кабинет
              </button>
              <button
                onClick={() => onSelectTab && onSelectTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  currentTab === 'history' ? 'bg-blue-50 text-[#1D4ED8]' : 'text-slate-600'
                }`}
              >
                История рейсов
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

