import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  // checked, defaultChecked, onChange, disabled, className, etc. are already inherited
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, disabled, checked, defaultChecked, onChange, ...props }, ref) => {
    const isControlled = checked !== undefined;
    const [localChecked, setLocalChecked] = React.useState(defaultChecked || false);
    const activeChecked = isControlled ? checked : localChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setLocalChecked(e.target.checked);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <label
        className={cn(
          "relative inline-flex items-center cursor-pointer select-none align-middle",
          disabled && "opacity-[0.38] cursor-not-allowed pointer-events-none",
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          className="sr-only peer"
          disabled={disabled}
          checked={activeChecked}
          onChange={handleChange}
          {...props}
        />
        <span
          className={cn(
            "w-9 h-5 rounded-full border transition-all duration-200 flex items-center p-0.5",
            "bg-[var(--pw-glass-bg)] border-[var(--pw-border)] backdrop-blur-[20px]",
            "peer-hover:border-[var(--color-outline)]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-brand-primary)] peer-focus-visible:ring-offset-2",
            activeChecked 
              ? "bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)]" 
              : "border-[var(--pw-border)]",
            disabled && "opacity-[0.38]"
          )}
        >
          <span
            className={cn(
              "w-3.5 h-3.5 rounded-full shadow-sm transition-transform duration-200",
              activeChecked 
                ? "translate-x-4 bg-[var(--color-on-primary)]" 
                : "translate-x-0 bg-[var(--color-outline)]"
            )}
          />
        </span>
      </label>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
