import * as React from "react"
import { cn } from "@/lib/utils"

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  // checked, defaultChecked, onChange, disabled, className, etc. are already inherited
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
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
          type="radio"
          ref={ref}
          className="sr-only peer"
          disabled={disabled}
          checked={activeChecked}
          onChange={handleChange}
          {...props}
        />
        <span
          className={cn(
            "flex items-center justify-center w-5 h-5 border transition-all duration-200",
            "rounded-full bg-[var(--pw-glass-bg)] border-[var(--pw-border)] backdrop-blur-[20px]",
            "peer-hover:border-[var(--color-outline)]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-brand-primary)] peer-focus-visible:ring-offset-2",
            activeChecked 
              ? "border-[var(--color-brand-primary)]" 
              : "border-[var(--pw-border)]",
            disabled && "opacity-[0.38]"
          )}
        >
          {activeChecked && (
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-primary)] animate-scaleIn" />
          )}
        </span>
      </label>
    );
  }
);

Radio.displayName = "Radio";

export { Radio };
