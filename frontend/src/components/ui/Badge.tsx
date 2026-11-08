import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'bestMatch' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
}) => {
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-xs font-semibold px-3 py-1',
  }[size];

  const variantStyles = {
    // Успех / Честная ставка подтверждена: зеленый #166534 на #DCFCE7
    success: 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]',
    // Лучшее совпадение: синий акцент
    bestMatch: 'bg-blue-50 text-[#1D4ED8] border border-blue-200 shadow-sm font-bold',
    // Предупреждение
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    // Опасность
    danger: 'bg-red-50 text-red-700 border border-red-200',
    // Инфо
    info: 'bg-sky-50 text-sky-800 border border-sky-200',
    // Нейтральный
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeStyles} ${variantStyles}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

