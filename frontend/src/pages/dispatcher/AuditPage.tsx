import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { AuditLogItem } from '../../types';
import { Shield, Clock, FileText, RefreshCw, User } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/dispatcher/audit-logs');
      if (res.data?.success) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки журнала аудита:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionLabel = (action: string) => {
    const map: Record<string, { label: string; color: string }> = {
      CREATE_DRIVER: { label: 'Создание водителя', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      BLOCK_DRIVER: { label: 'Блокировка', color: 'bg-red-50 text-red-800 border-red-200' },
      UNBLOCK_DRIVER: { label: 'Разблокировка', color: 'bg-blue-50 text-blue-800 border-blue-200' },
      RESET_PASSWORD: { label: 'Сброс пароля', color: 'bg-amber-50 text-amber-800 border-amber-200' },
      CREATE_CARGO: { label: 'Создание груза', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
      UPDATE_CARGO: { label: 'Обновление груза', color: 'bg-slate-50 text-slate-800 border-slate-200' },
      UPDATE_RATE: { label: 'Честная ставка', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
      UPDATE_CARGO_STATUS: { label: 'Смена статуса', color: 'bg-blue-50 text-blue-800 border-blue-200' },
      CALL_DRIVER: { label: 'Звонок водителю', color: 'bg-purple-50 text-purple-800 border-purple-200' },
      RESOLVE_COMPLAINT: { label: 'Обработка жалобы', color: 'bg-teal-50 text-teal-800 border-teal-200' },
      USER_LOGIN: { label: 'Вход в систему', color: 'bg-slate-50 text-slate-700 border-slate-200' },
      DRIVER_TAKE_CARGO: { label: 'Беру груз', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      DRIVER_SUBMIT_COMPLAINT: { label: 'Подача жалобы', color: 'bg-red-50 text-red-800 border-red-200' },
    };
    return map[action] || { label: action, color: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            <span>Журнал действий и аудит безопасности</span>
          </h1>
          <p className="text-xs text-[#475569]">
            Фиксация всех операций сотрудников: создание водителей, сброс паролей, изменение ставок и звонки
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm w-fit"
          title="Обновить журнал"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Обновить</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Загрузка журнала аудита...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
          <p className="text-sm text-slate-500">Записей в журнале аудита пока нет.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Время</th>
                  <th className="py-3.5 px-4">Пользователь</th>
                  <th className="py-3.5 px-4">Тип операции</th>
                  <th className="py-3.5 px-4">Подробности действия</th>
                  <th className="py-3.5 px-4 text-right">IP-адрес</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const actionInfo = getActionLabel(log.action);
                  const formattedTime = new Date(log.createdAt).toLocaleString('ru-RU');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono">
                        {formattedTime}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{log.user?.fullName || 'Система'}</div>
                        <div className="text-[10px] text-slate-400">@{log.user?.login || 'system'}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${actionInfo.color}`}
                        >
                          {actionInfo.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 leading-relaxed max-w-md">
                        {log.details}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono text-slate-400 text-[11px]">
                        {log.ip || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

