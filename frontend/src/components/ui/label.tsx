import * as React from 'react';

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className = '', children, ...props }: LabelProps) {
  return (
    <label className={`signup-label ${className}`} {...props}>
      {children}
    </label>
  );
}

