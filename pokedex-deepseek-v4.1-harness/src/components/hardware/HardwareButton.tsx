import type { ReactNode } from 'react';

export interface HardwareButtonProps {
  children?: ReactNode;
  label: string;
  onClick(): void;
  variant?: 'amber' | 'dark';
  className?: string;
  disabled?: boolean;
  title?: string;
}

/** Moulded pill button used for A / B / DATA / CANCEL. */
export function HardwareButton({
  children,
  label,
  onClick,
  variant = 'amber',
  className = '',
  disabled,
  title,
}: HardwareButtonProps) {
  return (
    <button
      type="button"
      className={`pill${variant === 'dark' ? ' pill--dark' : ''} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
    >
      {children ?? label}
    </button>
  );
}
