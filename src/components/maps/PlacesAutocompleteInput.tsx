import React, { forwardRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface PlacesAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export const PlacesAutocompleteInput = forwardRef<HTMLInputElement, PlacesAutocompleteInputProps>(
  ({ value, onChange, placeholder = 'Enter property address...', disabled, isLoading, error }, ref) => {
    return (
      <div className="relative w-full">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <MapPin className="w-4 h-4 text-[#34d399]" />}
        </div>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`
            w-full pl-10 pr-4 py-3 rounded-lg border-2 bg-slate-900 text-white
            placeholder:text-slate-500 transition-colors
            focus:outline-none focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-slate-700'}
          `}
          autoComplete="off"
        />
        {error && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

PlacesAutocompleteInput.displayName = 'PlacesAutocompleteInput';
