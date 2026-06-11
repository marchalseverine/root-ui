import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, name, className = '', ...props },
  ref
) {
  const inputId = id ?? name;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="font-body text-xs font-medium uppercase tracking-wide text-gray-400"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={`rounded-md border bg-gray-100 px-3 py-2 font-body text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-coral ${
          error ? 'border-error' : 'border-gray-200 focus:border-coral'
        } ${className}`}
        {...props}
      />
      {error && <span className="font-body text-xs text-error">{error}</span>}
    </div>
  );
});
