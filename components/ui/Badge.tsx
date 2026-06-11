import { type HTMLAttributes } from 'react';

// Spec §5: active=white, completed=coral, pending=gray
export type BadgeVariant = 'active' | 'completed' | 'pending';

const variantClasses: Record<BadgeVariant, string> = {
  active: 'bg-white text-black',
  completed: 'bg-coral text-black',
  pending: 'bg-gray-200 text-gray-400',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = 'active',
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 font-body text-xs font-semibold uppercase tracking-wide ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
