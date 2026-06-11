import { type HTMLAttributes } from 'react';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** Diameter in pixels. */
  size?: number;
}

/** Minimal coral pulse (spec §5). */
export function Spinner({ size = 16, className = '', ...props }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className={`inline-block animate-pulse rounded-full bg-coral ${className}`}
      {...props}
    />
  );
}
