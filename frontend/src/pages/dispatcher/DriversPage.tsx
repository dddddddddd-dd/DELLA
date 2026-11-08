import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { User, KZ_CITIES, BODY_TYPES } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import {
  UserPlus,
  Search,
  Lock,
  Unlock,
  KeyRound,
  Truck,
  Phone,
  Star,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Download,
  Share2,
} from 'lucide-react';

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  // Состояние видимости паролей (driverId -> boolean)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Модалка "Реестр доступов (База логинов и паролей)"
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultSearch, setVaultSearch] = useState('');

  // Модалка создания водителя
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    phone: '',
    login: '',
    password: '',
    capacityTons: 15,
    bodyType: 'Тент',
    currentCity: 'Шымкент',
    plateNumber: '',
    model: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    login: string;
    password: string;
    phone: string;
  } | null>(null);

  // Модалка сброса пароля
  const [resetModal, setResetModal] = useState<{
    driver: User | null;
    newPassword?: string;
  }>({ driver: null });

  // ---------------------------------------------------------------------------
  // Функции автогенерации логина и пароля
  // ---------------------------------------------------------------------------
  const transliterate = (text: string): string => {
    const ru: Record<string, string> = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
      к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
      х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
      ә: 'a', ғ: 'g', қ: 'q', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i',
    };
    return text
      .toLowerCase()
      .split('')
      .map((char) => ru[char] || char)
      .join('')
      .replace(/[^a-z0-9]/g, '');
  };

  const generateRandomPassword = (): string => {
    // Надежный, удобный для прочтения и ввода пароль: Della + 4 цифры (например, Della7491)
    const digits = Math.floor(1000 + Math.random() * 9000);
    return `Della${digits}`;
  };

  const generateRandomLogin = (fullName: string, phone: string): string => {
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    let base = '';

    if (nameParts.length >= 2) {
      // Берем имя: "Сериков Ербол" -> "erbol"
      base = transliterate(nameParts[1]);
    } else if (nameParts.length === 1 && nameParts[0].length > 0) {
      base = transliterate(nameParts[0]);
    }

    if (!base || base.length < 2) {
      // Если имя не введено, берем последние 4 цифры телефона
      const phoneDigits = phone.replace(/\D/g, '').slice(-4);
      base = phoneDigits || 'auto';
    }

    const suffix = Math.floor(10 + Math.random() * 90);
    return `driver_${base}_${suffix}`;
  };

  const handleGenerateAllCredentials = () => {
    const newLogin = generateRandomLogin(createForm.fullName, createForm.phone);
    const newPassword = generateRandomPassword();
    setCreateForm((prev) => ({
      ...prev,
      login: newLogin,
      password: newPassword,
    }));
  };

  // Копирование в буфер обмена с визуальной индикацией
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.error('Ошибка копирования в буфер:', err);
    }
  };

  // Скопировать готовое SMS / WhatsApp сообщение водителю
  const copyDriverMessage = (driver: User) => {
    const pwd = driver.issuedPassword || 'Уточните у диспетчера';
    const msg = `Здравствуйте, ${driver.fullName}!\nВаш доступ в сервис подбора грузов DELLA:\n📱 Логин: ${driver.login}\n🔑 Пароль: ${pwd}\n🌐 Сайт: ${window.location.origin}\nУдачных рейсов!`;
    copyToClipboard(msg, `msg-${driver.id}`);
  };

  // Экспорт реестра логинов и паролей в CSV (с UTF-8 BOM для корректного открытия в Excel)
  const exportCredentialsToCSV = () => {
    const bom = '\uFEFF';
    const headers = [
      'ФИО водителя',
      'Телефон',
      'Логин',
      'Выданный пароль',
      'Город дислокации',
      'Кузов',
      'Грузоподъёмность (т)',
      'Статус',
      'Согласие на звонки',
    ];

    const rows = drivers.map((d) => [
      `"${d.fullName.replace(/"/g, '""')}"`,
      `"${d.phone}"`,
      `"${d.login}"`,
      `"${(d.issuedPassword || '').replace(/"/g, '""')}"`,
      `"${d.vehicle?.currentCity || ''}"`,
      `"${d.vehicle?.bodyType || ''}"`,
      d.vehicle?.capacityTons || '',
      d.isBlocked
        ? 'Заблокирован'
        : d.workStatus === 'FREE'
        ? 'Свободен'
        : d.workStatus === 'IN_TRIP'
        ? 'В рейсе'
        : 'Отдыхает',
      d.callConsent ? 'Да' : 'Нет',
    ]);

    const csvContent = bom + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `della_reestr_voditeley_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (cityFilter) params.city = cityFilter;

      const res = await apiClient.get('/dispatcher/drivers', { params });
      if (res.data?.success) {
        setDrivers(res.data.drivers || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки списка водителей:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [cityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDrivers();
  };

  // Создание водителя
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    try {
      const res = await apiClient.post('/dispatcher/drivers', {
        fullName: createForm.fullName.trim(),
        phone: createForm.phone.trim(),
        login: createForm.login.trim(),
        password: createForm.password.trim(),
        vehicle: {
          capacityTons: Number(createForm.capacityTons),
          bodyType: createForm.bodyType,
          currentCity: createForm.currentCity,
          plateNumber: createForm.plateNumber.trim() || undefined,
          model: createForm.model.trim() || undefined,
        },
      });

      if (res.data?.success) {
        setCreatedCredentials({
          fullName: createForm.fullName,
          login: createForm.login,
          password: createForm.password,
          phone: createForm.phone,
        });
        setIsCreateOpen(false);
        setCreateForm({
          fullName: '',
          phone: '',
          login: '',
          password: '',
          capacityTons: 15,
          bodyType: 'Тент',
          currentCity: 'Шымкент',
          plateNumber: '',
          model: '',
        });
        fetchDrivers();
      }
    } catch (err: any) {
      setCreateError(err.message || 'Ошибка создания водителя');
    }
  };

  // Переключение согласия на автозвонки
  const handleToggleConsent = async (driver: User) => {
    const nextConsent = !driver.callConsent;
    try {
      await apiClient.patch(`/dispatcher/drivers/${driver.id}/call-consent`, {
        callConsent: nextConsent,
      });
      fetchDrivers();
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления согласия на звонки');
    }
  };

  // Блокировка / разблокировка
  const handleToggleBlock = async (driver: User) => {
    const action = driver.isBlocked ? 'разблокировать' : 'заблокировать';
    if (!confirm(`Вы действительно хотите ${action} водителя ${driver.fullName}?`)) {
      return;
    }

    try {
      await apiClient.patch(`/dispatcher/drivers/${driver.id}/block`, {
        isBlocked: !driver.isBlocked,
      });
      fetchDrivers();
    } catch (err: any) {
      alert(err.message || 'Ошибка смены статуса блокировки');
    }
  };

  // Сброс пароля
  const handleResetPassword = async (driver: User) => {
    try {
      const res = await apiClient.post(`/dispatcher/drivers/${driver.id}/reset-password`, {});
      if (res.data?.success) {
        setResetModal({
          driver,
          newPassword: res.data.newPassword,
        });
        fetchDrivers();
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка сброса пароля');
    }
  };

  // Фильтрация для модалки реестра доступов
  const filteredVaultDrivers = drivers.filter((d) => {
    if (!vaultSearch.trim()) return true;
    const q = vaultSearch.toLowerCase();
    return (
      d.fullName.toLowerCase().includes(q) ||
      d.phone.toLowerCase().includes(q) ||
      d.login.toLowerCase().includes(q) ||
      (d.vehicle?.currentCity && d.vehicle.currentCity.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Шапка страницы */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">
            Управление водителями
          </h1>
          <p className="text-xs text-[#475569]">
            Регистрация водителей, параметры автопарка, контроль блокировок и единая база выданных доступов
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsVaultOpen(true)}
            icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
            className="bg-blue-50/60 hover:bg-blue-100/60 border-blue-200 text-blue-900 font-bold"
          >
            Реестр доступов (Логины и пароли)
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            icon={<UserPlus className="w-5 h-5" />}
          >
            Создать водителя
          </Button>
        </div>
      </div>

      {/* Панель фильтров и поиска */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Поиск по ФИО, телефону или логину..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Найти
          </Button>
        </form>

        <div className="w-full md:w-56">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
          >
            <option value="">Все города дислокации</option>
            {KZ_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Список водителей */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Загрузка базы водителей...</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
          <p className="text-sm text-slate-500">Водители не найдены. Попробуйте изменить параметры поиска.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drivers.map((driver) => {
            const isPasswordVisible = Boolean(visiblePasswords[driver.id]);

            return (
              <div
                key={driver.id}
                className={`bg-white rounded-2xl border p-5 space-y-4 shadow-card transition-all ${
                  driver.isBlocked
                    ? 'border-red-300 bg-red-50/20'
                    : 'border-slate-200 hover:shadow-hover'
                }`}
              >
                {/* Шапка карточки водителя */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-[#0F172A] leading-snug">
                      {driver.fullName}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Статус:{' '}
                      <span className="font-bold">
                        {driver.workStatus === 'FREE' && <span className="text-emerald-700">🟢 Свободен</span>}
                        {driver.workStatus === 'IN_TRIP' && <span className="text-blue-700">🔵 В рейсе</span>}
                        {driver.workStatus === 'RESTING' && <span className="text-slate-600">⚪️ Отдыхает</span>}
                        {!driver.workStatus && <span className="text-emerald-700">🟢 Свободен</span>}
                      </span>
                    </div>
                  </div>

                  {driver.isBlocked ? (
                    <Badge variant="danger" size="sm" icon={<Lock className="w-3 h-3" />}>
                      Заблокирован
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{driver.avgRating || 5.0}</span>
                    </div>
                  )}
                </div>

                {/* БЛОК СОХРАНЕННЫХ ДОСТУПОВ (Логин и Пароль) */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Логин:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {driver.login}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(driver.login, `login-${driver.id}`)}
                        className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                        title="Скопировать логин"
                      >
                        {copiedId === `login-${driver.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Пароль:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {isPasswordVisible
                          ? driver.issuedPassword || 'Уточните'
                          : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setVisiblePasswords((prev) => ({
                            ...prev,
                            [driver.id]: !prev[driver.id],
                          }))
                        }
                        className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                        title={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {isPasswordVisible ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {driver.issuedPassword && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(driver.issuedPassword!, `pass-${driver.id}`)}
                          className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                          title="Скопировать пароль"
                        >
                          {copiedId === `pass-${driver.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyDriverMessage(driver)}
                    className="w-full mt-1.5 py-1.5 px-2 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 text-blue-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedId === `msg-${driver.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Сообщение для водителя скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Скопировать SMS / WhatsApp водителю</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Телефон и автозвонки */}
                <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Телефон:</span>
                    <a
                      href={`tel:${driver.phone.replace(/\s+/g, '')}`}
                      className="font-bold text-blue-700 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{driver.phone}</span>
                    </a>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Город дислокации:</span>
                    <span className="font-bold text-slate-800">
                      {driver.vehicle?.currentCity || 'Не указан'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500">Автозвонки роботом:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleConsent(driver)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                        driver.callConsent
                          ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC] hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                      }`}
                      title="Нажмите для смены согласия на звонки"
                    >
                      {driver.callConsent ? '✓ Согласие дано' : '✗ Нет согласия'}
                    </button>
                  </div>
                </div>

                {/* Автомобиль */}
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs space-y-1">
                  <div className="flex items-center gap-1 font-bold text-blue-900">
                    <Truck className="w-3.5 h-3.5" />
                    <span>
                      {driver.vehicle?.bodyType} • {driver.vehicle?.capacityTons} тонн
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Модель: {driver.vehicle?.model || '—'} | Госномер: {driver.vehicle?.plateNumber || '—'}
                  </div>
                </div>

                {/* Предупреждение о жалобах */}
                {(driver.activeComplaintsCount || 0) > 0 && (
                  <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Активных жалоб: {driver.activeComplaintsCount}</span>
                  </div>
                )}

                {/* Кнопки управления */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetPassword(driver)}
                    icon={<KeyRound className="w-3.5 h-3.5" />}
                  >
                    Сбросить пароль
                  </Button>

                  <Button
                    variant={driver.isBlocked ? 'secondary' : 'danger'}
                    size="sm"
                    onClick={() => handleToggleBlock(driver)}
                    icon={driver.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  >
                    {driver.isBlocked ? 'Разблокировать' : 'Блокировать'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          МОДАЛКА: ЕДИНЫЙ РЕЕСТР ДОСТУПОВ (ЛОГИНЫ И ПАРОЛИ ВОДИТЕЛЕЙ)
          ========================================================================= */}
      <Modal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        title="Реестр доступов водителей (База логинов и паролей)"
        subtitle="Все выданные учетные данные сохранены в одном месте. Вы можете просматривать, копировать и экспортировать их в Excel"
        maxWidth="4xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Быстрый поиск по водителю, телефону или логину..."
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                className="w-full min-h-[42px] pl-9 pr-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportCredentialsToCSV}
              icon={<Download className="w-4 h-4 text-emerald-600" />}
              className="bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-800 font-bold whitespace-nowrap"
            >
              Экспорт в Excel / CSV
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Водитель / Телефон</th>
                  <th className="py-3 px-3.5">Логин</th>
                  <th className="py-3 px-3.5">Выданный пароль</th>
                  <th className="py-3 px-3.5">Город / Машина</th>
                  <th className="py-3 px-3.5 text-right">Отправить водителю</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredVaultDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Водители не найдены
                    </td>
                  </tr>
                ) : (
                  filteredVaultDrivers.map((d) => {
                    const isVisible = Boolean(visiblePasswords[d.id]);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{d.fullName}</div>
                          <div className="text-[11px] text-blue-700 font-mono mt-0.5">{d.phone}</div>
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-800">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            <span>{d.login}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(d.login, `vault-login-${d.id}`)}
                              className="text-slate-400 hover:text-blue-600"
                              title="Скопировать логин"
                            >
                              {copiedId === `vault-login-${d.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            <span className="text-slate-900">
                              {isVisible ? d.issuedPassword || 'Уточните' : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setVisiblePasswords((prev) => ({
                                  ...prev,
                                  [d.id]: !prev[d.id],
                                }))
                              }
                              className="text-slate-400 hover:text-blue-600"
                              title={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
                            >
                              {isVisible ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {d.issuedPassword && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(d.issuedPassword!, `vault-pass-${d.id}`)}
                                className="text-slate-400 hover:text-blue-600"
                                title="Скопировать пароль"
                              >
                                {copiedId === `vault-pass-${d.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800">
                            {d.vehicle?.currentCity || 'Город не указан'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {d.vehicle?.bodyType} • {d.vehicle?.capacityTons} т
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => copyDriverMessage(d)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition-colors"
                          >
                            {copiedId === `msg-${d.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Скопировано!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Скопировать SMS</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <span className="font-semibold">
              Всего в реестре: {drivers.length} водителей. Все пароли сохраняются и доступны диспетчеру в любое время.
            </span>
            <Button variant="secondary" size="sm" onClick={() => setIsVaultOpen(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          МОДАЛКА: СОЗДАНИЕ ВОДИТЕЛЯ С АВТОГЕНЕРАЦИЕЙ ЛОГИНА И ПАРОЛЯ
          ========================================================================= */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Создать водителя"
        subtitle="Самостоятельной регистрации нет — диспетчер задаёт логин, пароль и параметры машины"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateDriver} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="ФИО водителя"
              placeholder="Сериков Ербол"
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              required
            />
            <Input
              label="Номер телефона"
              placeholder="+7 777 123 4567"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              required
            />
          </div>

          {/* Кнопка мгновенной автогенерации учетных данных */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
            <div className="text-xs text-blue-900">
              <span className="font-bold">Генератор учетных данных:</span>
              <p className="text-[11px] text-blue-700">Создаёт красивый уникальный логин и надёжный пароль</p>
            </div>
            <button
              type="button"
              onClick={handleGenerateAllCredentials}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Сгенерировать в 1 клик</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">
                  Логин для входа <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const l = generateRandomLogin(createForm.fullName, createForm.phone);
                    setCreateForm((prev) => ({ ...prev, login: l }));
                  }}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 hover:underline"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Сгенерировать</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="driver_erbol_12"
                value={createForm.login}
                onChange={(e) => setCreateForm({ ...createForm, login: e.target.value })}
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">
                  Пароль <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const p = generateRandomPassword();
                    setCreateForm((prev) => ({ ...prev, password: p }));
                  }}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 hover:underline"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Сгенерировать</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="Della7841"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                required
              />
              <p className="mt-1 text-xs text-slate-500">Пароль сохраняется в реестре доступов диспетчера</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Параметры машины водителя:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Город дислокации"
                options={KZ_CITIES}
                value={createForm.currentCity}
                onChange={(e) => setCreateForm({ ...createForm, currentCity: e.target.value })}
                required
              />
              <Select
                label="Тип кузова"
                options={BODY_TYPES}
                value={createForm.bodyType}
                onChange={(e) => setCreateForm({ ...createForm, bodyType: e.target.value })}
                required
              />
              <Input
                label="Грузоподъёмность (т)"
                type="number"
                step="0.5"
                min="0.5"
                value={createForm.capacityTons}
                onChange={(e) => setCreateForm({ ...createForm, capacityTons: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Input
                label="Марка и модель авто"
                placeholder="DAF XF 105"
                value={createForm.model}
                onChange={(e) => setCreateForm({ ...createForm, model: e.target.value })}
              />
              <Input
                label="Госномер"
                placeholder="777 KZ 13"
                value={createForm.plateNumber}
                onChange={(e) => setCreateForm({ ...createForm, plateNumber: e.target.value })}
              />
            </div>
          </div>

          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {createError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Отмена
            </Button>
            <Button variant="primary" type="submit">
              Создать и сохранить доступ
            </Button>
          </div>
        </form>
      </Modal>

      {/* Модалка демонстрации выданных учетных данных */}
      {createdCredentials && (
        <Modal
          isOpen={Boolean(createdCredentials)}
          onClose={() => setCreatedCredentials(null)}
          title="Водитель успешно создан!"
          subtitle="Учетные данные сохранены в реестре доступов диспетчера"
        >
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
            <div className="text-sm font-bold text-emerald-950">
              {createdCredentials.fullName} ({createdCredentials.phone})
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Логин: <strong>{createdCredentials.login}</strong></span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdCredentials.login, 'new-login')}
                  className="text-slate-500 hover:text-blue-600"
                >
                  {copiedId === 'new-login' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span>Пароль: <strong>{createdCredentials.password}</strong></span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdCredentials.password, 'new-pass')}
                  className="text-slate-500 hover:text-blue-600"
                >
                  {copiedId === 'new-pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const msg = `Здравствуйте, ${createdCredentials.fullName}!\nВаш доступ в сервис подбора грузов DELLA:\n📱 Логин: ${createdCredentials.login}\n🔑 Пароль: ${createdCredentials.password}\n🌐 Сайт: ${window.location.origin}\nУдачных рейсов!`;
                  copyToClipboard(msg, 'new-msg');
                }}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {copiedId === 'new-msg' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Сообщение скопировано! Отправьте по WhatsApp/SMS</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Скопировать готовое сообщение для водителя</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={() => setCreatedCredentials(null)}>
              Готово
            </Button>
          </div>
        </Modal>
      )}

      {/* Модалка сброса пароля */}
      {resetModal.driver && (
        <Modal
          isOpen={Boolean(resetModal.driver)}
          onClose={() => setResetModal({ driver: null })}
          title="Пароль успешно сброшен"
          subtitle={`Водитель: ${resetModal.driver.fullName}`}
        >
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 space-y-3">
            <p className="text-xs text-blue-900">
              Сформирован новый пароль для входа (он автоматически сохранен в реестре доступов):
            </p>
            <div className="p-3 bg-white rounded-xl border border-blue-200 text-center font-mono text-lg font-black text-blue-800 tracking-wider flex items-center justify-center gap-3">
              <span>{resetModal.newPassword}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(resetModal.newPassword || '', 'reset-pwd')}
                className="text-slate-500 hover:text-blue-600 p-1 rounded"
                title="Скопировать"
              >
                {copiedId === 'reset-pwd' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 text-center">
              Отправьте этот пароль водителю по SMS или сообщите по телефону {resetModal.driver.phone}.
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={() => setResetModal({ driver: null })}>
              Понятно
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
