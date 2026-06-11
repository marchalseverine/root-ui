import { type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Render the brutalist coral hard shadow. */
  shadow?: boolean;
}

export function Card({ shadow = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-md border border-gray-200 bg-gray-100 p-4 ${
        shadow ? 'shadow-hard' : ''
      } ${className}`}
      {...props}
    />
  );
}
