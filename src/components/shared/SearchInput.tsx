import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  debounceMs?: number;
  'aria-label'?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value: controlledValue,
  onChange,
  onSearch,
  debounceMs = 300,
  'aria-label': ariaLabel = 'Search',
  placeholder = 'Search...',
  className = '',
  disabled,
  ...props
}) => {
  const [internalValue, setInputValue] = useState(controlledValue || '');
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isControlled) {
      setInputValue(controlledValue);
    }
  }, [controlledValue, isControlled]);

  useEffect(() => {
    if (onSearch) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSearch(currentValue);
      }, debounceMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentValue, onSearch, debounceMs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isControlled) {
      setInputValue(val);
    }
    onChange?.(val);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInputValue('');
    }
    onChange?.('');
    onSearch?.('');
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full pl-9 pr-9 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl shadow-2xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all"
        {...props}
      />

      {currentValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
