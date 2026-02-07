import * as React from 'react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
}

export function Button({
  className = '',
  variant = 'primary',
  children,
  ...props
}: ButtonProps) {
  const base =
    'signup-button ' +
    (variant === 'outline' ? 'signup-button-outline' : 'signup-button-primary');

  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}

