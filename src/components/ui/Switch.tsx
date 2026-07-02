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
          "relative inline-flex items-center cursor-pointer select-none align-middle flex-shrink-0",
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
            "w-9 h-5 rounded-full transition-all duration-200 flex items-center p-[2px] relative border",
            activeChecked
              ? "bg-primary border-primary"
              : "bg-transparent border-on-surface/40",
            disabled && "opacity-[0.38]"
          )}
        >
          <span
            className={cn(
              "w-4 h-4 rounded-full transition-transform duration-200 ease-in-out",
              activeChecked
                ? "translate-x-4 bg-white shadow-sm"
                : "translate-x-0 bg-on-surface/50"
            )}
          />
        </span>
      </label>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
