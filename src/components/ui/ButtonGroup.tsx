import React from 'react';

export interface ButtonGroupProps {
  variant?: 'related' | 'unrelated' | 'content';
  align?: 'start' | 'center' | 'end' | 'between';
  direction?: 'row' | 'col';
  className?: string;
  children: React.ReactNode;
}

export function ButtonGroup({
  variant = 'related',
  align = 'start',
  direction = 'row',
  className = '',
  children,
}: ButtonGroupProps) {
  // Gap classes using spacing tokens
  const gapClass = 
    variant === 'unrelated' 
      ? 'gap-btn-gap-unrelated' 
      : variant === 'content'
      ? 'gap-btn-gap-content'
      : 'gap-btn-gap-related';

  // Alignment mappings
  const alignClass = 
    align === 'center'
      ? 'justify-center'
      : align === 'end'
      ? 'justify-end'
      : align === 'between'
      ? 'justify-between'
      : 'justify-start';

  // Direction mappings
  const dirClass = direction === 'col' ? 'flex-col' : 'flex-row';

  return (
    <div className={`flex ${dirClass} ${gapClass} ${alignClass} items-center ${className}`}>
      {children}
    </div>
  );
}
