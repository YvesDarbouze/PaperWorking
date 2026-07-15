import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  // checked, defaultChecked, onChange, disabled, className, etc. are already inherited
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
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
          onClick={(e) => e.stopPropagation()}
          {...props}
        />
        <span
          className={cn(
            "flex items-center justify-center w-5 h-5 border transition-all duration-200",
            "rounded bg-[var(--pw-glass-bg)] border-[var(--pw-border)] backdrop-blur-[20px]",
            "peer-hover:border-[var(--color-outline)]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-brand-primary)] peer-focus-visible:ring-offset-2",
            activeChecked 
              ? "bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-[var(--color-on-primary)]" 
              : "text-transparent border-[var(--pw-border)]",
            disabled && "opacity-[0.38]"
          )}
        >
          <svg
            className="w-3.5 h-3.5 stroke-[3] stroke-current"
            viewBox="0 0 24 24"
            fill="none"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
