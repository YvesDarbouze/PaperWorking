'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value?: string;
  onValueChange?: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({});

function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
}) {
  const [internalValue, setInternalValue] = React.useState(value || defaultValue);

  const currentValue = value !== undefined ? value : internalValue;
  const handleValueChange = (val: string) => {
    if (value === undefined) setInternalValue(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-8 items-center justify-start rounded-none border-b border-border bg-transparent p-0 text-muted-foreground gap-4',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  value,
  className,
  disabled,
  children,
  ...props
}: React.ComponentProps<'button'> & { value: string }) {
  const context = React.useContext(TabsContext);
  const isSelected = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      data-slot="tabs-trigger"
      data-state={isSelected ? 'active' : 'inactive'}
      onClick={() => context.onValueChange?.(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap px-1 pb-2 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'border-b-2 border-foreground text-foreground font-semibold'
          : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function TabsContent({
  value,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (context.value !== value) return null;

  return (
    <div
      role="tabpanel"
      data-slot="tabs-content"
      data-state="active"
      className={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
