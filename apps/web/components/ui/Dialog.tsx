'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface DialogContextValue {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue>({});

function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = open !== undefined ? open : internalOpen;

  const handleOpenChange = (val: boolean) => {
    if (open === undefined) setInternalOpen(val);
    onOpenChange?.(val);
  };

  return (
    <DialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({
  children,
  className,
  asChild,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  const context = React.useContext(DialogContext);
  return (
    <button
      type="button"
      data-slot="dialog-trigger"
      onClick={() => context.onOpenChange?.(true)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<'div'>) {
  const context = React.useContext(DialogContext);
  return (
    <div
      data-slot="dialog-overlay"
      onClick={() => context.onOpenChange?.(false)}
      className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity', className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  const context = React.useContext(DialogContext);
  if (!context.open) return null;

  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-xl transition-all duration-200 sm:rounded-none',
          className,
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          data-slot="dialog-close"
          onClick={() => context.onOpenChange?.(false)}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center text-xs opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
        >
          ✕
        </button>
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn('text-sm font-semibold leading-none tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="dialog-description"
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function DialogClose({
  children,
  className,
  ...props
}: React.ComponentProps<'button'>) {
  const context = React.useContext(DialogContext);
  return (
    <button
      type="button"
      data-slot="dialog-close"
      onClick={() => context.onOpenChange?.(false)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
