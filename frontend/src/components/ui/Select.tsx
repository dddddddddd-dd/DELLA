import React, { forwardRef } from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly string[] | SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, hint, placeholder, required, className = '', id, ...props }, ref) => {
    const selectId = id || `select-${label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
      <div className="w-full">
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold text-[#0F172A] mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={`w-full min-h-[48px] px-4 pr-10 rounded-xl border bg-white text-[#0F172A] appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] disabled:bg-slate-50 disabled:text-slate-500 ${
              error
                ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                : 'border-slate-300 hover:border-slate-400'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => {
              if (typeof opt === 'string') {
                return (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                );
              }
              return (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              );
            })}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
        {hint && !error && (
          <p className="mt-1 text-xs text-[#475569]">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

