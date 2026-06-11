import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';

const variantClasses: Record<ButtonVariant, string> = {
  // brutalist: black bg, white text, coral hard shadow on hover
  primary:
    'bg-black text-white border-coral hover:shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5',
  ghost:
    'bg-transparent text-white border-gray-200 hover:border-coral hover:text-coral',
  danger: 'bg-error text-black border-error hover:shadow-hard',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className = '', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 font-body text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});
