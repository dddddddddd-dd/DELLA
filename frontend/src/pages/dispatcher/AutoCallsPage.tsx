import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { CallAttempt, CallMetrics } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import {
  PhoneCall,
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  PhoneMissed,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  PhoneForwarded,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';

export const AutoCallsPage: React.FC = () => {
  const [calls, setCalls] = useState<CallAttempt[]>([]);
  const [metrics, setMetrics] = useState<CallMetrics | null>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [isGloballyEnabled, setIsGloballyEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Модалка тестового звонка
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('+77015550101');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  const fetchMonitoringData = async () => {
    try {
      const res = await apiClient.get('/dispatcher/calls/monitoring');
      if (res.data?.success) {
        setCalls(res.data.calls || []);
        setMetrics(res.data.metrics || null);
        setQueueStatus(res.data.queueStatus || null);
        setIsGloballyEnabled(res.data.isGloballyEnabled);
      }
    } catch (err) {
      console.error('Ошибка загрузки мониторинга звонков:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 5000); // автообновление каждые 5 сек
    return () => clearInterval(interval);
  }, []);

  // Переключение глобального тумблера автозвонков
  const handleToggleGlobal = async () => {
    const nextState = !isGloballyEnabled;
    try {
      await apiClient.patch('/dispatcher/calls/global-toggle', { enabled: nextState });
      setIsGloballyEnabled(nextState);
    } catch (err: any) {
      alert(err.message || 'Ошибка переключения автозвонков');
    }
  };

  // Выполнение тестового звонка
  const handlePerformTestCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestLoading(true);
    setTestResult(null);

    try {
      const res = await apiClient.post('/dispatcher/calls/test-call', {
        phone: testPhone,
      });
      if (res.data?.success) {
        setTestResult(res.data.message);
        fetchMonitoringData();
      }
    } catch (err: any) {
      setTestResult(`Ошибка: ${err.message}`);
    } finally {
      setIsTestLoading(false);
    }
  };

  const getStatusBadge = (status: string, dtmfKey?: string | null) => {
    switch (status) {
      case 'accepted':
        return (
          <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            Взял груз (нажал 1)
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="danger" size="sm" icon={<XCircle className="w-3.5 h-3.5" />}>
            Отказался (нажал 2)
          </Badge>
        );
      case 'no_answer':
        return (
          <Badge variant="warning" size="sm" icon={<PhoneMissed className="w-3.5 h-3.5" />}>
            Не ответил / Занято
          </Badge>
        );
      case 'ringing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <Activity className="w-3.5 h-3.5 animate-spin" />
            Идёт вызов...
          </span>
        );
      case 'dialing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Набор номера
          </span>
        );
      case 'answered':
        return (
          <Badge variant="info" size="sm">
            Трубка снята (робот говорит)
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Шапка страницы */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] flex items-center gap-2.5">
            <PhoneCall className="w-7 h-7 text-blue-600" />
            <span>Мониторинг автоматических звонков DELLA</span>
          </h1>
          <p className="text-xs text-[#475569]">
            Робот автоматически звонит подходящим водителям не позже 3 секунд с момента публикации груза
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Кнопка тестового звонка */}
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsTestModalOpen(true)}
            icon={<Sparkles className="w-4 h-4 text-amber-500" />}
          >
            Тестовый звонок
          </Button>

          {/* Глобальный переключатель автозвонков */}
          <button
            onClick={handleToggleGlobal}
            className={`min-h-[48px] px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm ${
              isGloballyEnabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
            }`}
          >
            {isGloballyEnabled ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Автозвонки: ВКЛЮЧЕНЫ</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Автозвонки: ПРИОСТАНОВЛЕНЫ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Аналитические метрики SLA (< 3 секунд) */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Счётчик задержки от создания груза до начала звонка */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-card">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Средняя задержка старта звонка</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-black ${
                  metrics.avgLatencyMs <= 3000 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {metrics.avgLatencyMs} мс
              </span>
              <span className="text-xs font-semibold text-slate-400">
                (Цель: &lt; 3 000 мс)
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-[#DCFCE7] px-2.5 py-0.5 rounded-full w-fit">
              <Zap className="w-3 h-3 text-emerald-600" />
              <span>{metrics.targetMetPercentage}% звонков уложились в SLA &lt; 3с</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-card">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Всего автозвонков</span>
              <PhoneForwarded className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[#0F172A]">
              {metrics.totalCalls}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Принято водителями: <strong>{metrics.acceptedCalls}</strong>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-card">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Очередь задач (BullMQ / Redis)</span>
              <Activity className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900 truncate">
              {queueStatus?.type || 'BullMQ Active'}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              В очереди на обработку: <strong>{queueStatus?.pendingCount || 0}</strong>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-card">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Эскалация диспетчеру</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600">
              {metrics.escalationTimeoutMinutes} мин
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Авто-оповещение диспетчера при отсутствии согласия
            </div>
          </div>
        </div>
      )}

      {/* Живой список звонков */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Живой журнал вызовов робота
            </h2>
            <p className="text-xs text-slate-500">
              Обновляется в реальном времени каждые 5 секунд
            </p>
          </div>

          <button
            onClick={fetchMonitoringData}
            className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-colors"
            title="Обновить данные"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Загрузка данных телефонии...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Звонков пока не зарегистрировано. Создайте груз со статусом «Открыт» для старта автозвонка.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Время</th>
                  <th className="py-3.5 px-4">Рейс</th>
                  <th className="py-3.5 px-4">Водитель и телефон</th>
                  <th className="py-3.5 px-4">Задержка старта (SLA &lt; 3с)</th>
                  <th className="py-3.5 px-4">Провайдер</th>
                  <th className="py-3.5 px-4">Статус и результат</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calls.map((call) => {
                  const latency = call.latencyMs || 0;
                  const isLatencyMet = latency <= 3000;

                  return (
                    <tr key={call.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono">
                        {new Date(call.createdAt).toLocaleTimeString('ru-RU')}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {call.cargo ? (
                          <div>
                            <span className="font-bold text-slate-900">
                              #{call.cargo.cargoNumber}
                            </span>
                            <span className="text-slate-500 ml-1.5">
                              {call.cargo.originCity} → {call.cargo.destinationCity} ({call.cargo.weightTons} т)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Тестовый звонок</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {call.driver?.fullName || 'Тестовый абонент'}
                        </div>
                        <div className="font-mono text-slate-500">
                          {call.driver?.phone || '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono font-bold px-2.5 py-1 rounded-md text-xs ${
                            isLatencyMet
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {latency} мс {isLatencyMet ? '⚡' : '⚠️ >3с'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="uppercase text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {call.provider}
                        </span>
                        {call.fallbackUsed && (
                          <span className="ml-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Резерв
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(call.status, call.dtmfKey)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модалка тестового звонка */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Тестовый звонок робота DELLA"
        subtitle="Проверьте работу голосового синтезатора речи (TTS) и приёма нажатий клавиш без реального груза"
      >
        <form onSubmit={handlePerformTestCall} className="space-y-4">
          <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed">
            Робот позвонит на указанный номер и зачитает текст тестового рейса. Вы сможете нажать 1 (взять) или 2 (отказаться) на клавиатуре телефона.
          </div>

          <div>
            <Input
              label="Номер телефона для проверки (+7...)"
              placeholder="+77011234567"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              required
              hint="Формат E.164: +7XXXXXXXXXX (Казахстан / РФ)"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                testResult.startsWith('Ошибка')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {testResult}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsTestModalOpen(false)}>
              Закрыть
            </Button>
            <Button variant="primary" type="submit" isLoading={isTestLoading} icon={<Send className="w-4 h-4" />}>
              Позвонить мне
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

