import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-[#0F172A] mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={`w-full min-h-[48px] px-4 rounded-xl border bg-white text-[#0F172A] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] disabled:bg-slate-50 disabled:text-slate-500 ${
            error
              ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
              : 'border-slate-300 hover:border-slate-400'
          } ${className}`}
          {...props}
        />
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

Input.displayName = 'Input';

