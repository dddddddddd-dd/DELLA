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
  Menu,
  X,
  Package,
  Users,
  SlidersHorizontal,
  AlertTriangle,
  FileText,
  History,
} from 'lucide-react';

interface HeaderProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Закрывать мобильное меню при нажатии Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsNotifOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!user) return null;

  const dispatcherTabs = [
    { id: 'cargos', label: 'Грузы', icon: Package },
    { id: 'drivers', label: 'Водители', icon: Users },
    { id: 'matching', label: 'Подбор', icon: SlidersHorizontal },
    { id: 'calls', label: 'Автозвонки', icon: PhoneCall },
    { id: 'complaints', label: 'Жалобы', icon: AlertTriangle },
    { id: 'audit', label: 'Журнал действий', icon: FileText },
  ];

  const driverTabs = [
    { id: 'cabinet', label: 'Кабинет и подбор', icon: Truck },
    { id: 'history', label: 'История рейсов', icon: History },
  ];

  const activeTabs = user.role === 'DISPATCHER' ? dispatcherTabs : driverTabs;

  const handleTabClick = (tabId: string) => {
    if (onSelectTab) {
      onSelectTab(tabId);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Левая часть: Логотип DELLA и десктопная навигация */}
            <div className="flex items-center gap-8">
              <div
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => {
                  handleTabClick(user.role === 'DRIVER' ? 'cabinet' : 'cargos');
                }}
              >
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

              {/* Десктопные вкладки навигации (скрыты на мобильных) */}
              <nav className="hidden md:flex items-center gap-1">
                {activeTabs.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-[#1D4ED8]'
                          : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Правая часть: Гарантии, уведомления, профиль и мобильная кнопка меню */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Бейдж честной ставки (только десктоп) */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Честная ставка DELLA</span>
              </div>

              {/* Колокольчик уведомлений */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsNotifOpen(!isNotifOpen);
                    setIsMobileMenuOpen(false);
                  }}
                  className="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Уведомления"
                  aria-label="Уведомления"
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

              {/* Профиль пользователя (десктоп) */}
              <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-slate-200">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                  {user.fullName.charAt(0)}
                </div>
                <div className="text-left">
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

              {/* ========================================================= */}
              {/* ЕДИНАЯ КНОПКА МЕНЮ ДЛЯ МОБИЛЬНЫХ ТЕЛЕФОНОВ (MD:HIDDEN)     */}
              {/* ========================================================= */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                  setIsNotifOpen(false);
                }}
                className={`md:hidden p-2.5 rounded-xl transition-all border flex items-center justify-center min-w-[46px] min-h-[46px] ${
                  isMobileMenuOpen
                    ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8]'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
                title="Меню навигации"
                aria-label="Меню навигации"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 stroke-[2.2]" />
                ) : (
                  <Menu className="w-6 h-6 stroke-[2.2]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* ВЫПАДАЮЩЕЕ МОБИЛЬНОЕ МЕНЮ (ПОД ОДНОЙ КНОПКОЙ)              */}
      {/* ========================================================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30">
          {/* Полупрозрачный фон (клик снаружи закрывает меню) */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Панель меню */}
          <div className="fixed top-20 inset-x-0 bg-white border-b border-slate-200 shadow-2xl p-4 space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto animate-in slide-in-from-top-3 duration-200">
            {/* Карточка пользователя */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="w-12 h-12 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {user.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[#0F172A] truncate">
                  {user.fullName}
                </div>
                <div className="text-xs text-[#475569] truncate">
                  {user.role === 'DISPATCHER'
                    ? 'Диспетчер DELLA'
                    : `Водитель • ${user.vehicle?.currentCity || 'Город не указан'}`}
                </div>
                <div className="text-[11px] text-blue-700 font-mono mt-0.5">
                  {user.phone}
                </div>
              </div>
            </div>

            {/* Список пунктов меню */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                Разделы системы:
              </div>
              {activeTabs.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                      isActive
                        ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200 shadow-sm'
                        : 'text-[#0F172A] hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-[#1D4ED8] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="flex-1 text-base">{item.label}</span>
                    {isActive && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Бейдж честной ставки для мобильного */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Честная ставка DELLA — гарантированная оплата без сюрпризов</span>
            </div>

            {/* Кнопка выхода из системы */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти из аккаунта</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
