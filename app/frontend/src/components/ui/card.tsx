import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`signup-card ${className}`} {...props}>
      {children}
    </div>
  );
}

