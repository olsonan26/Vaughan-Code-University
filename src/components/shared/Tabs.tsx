import React, { useRef } from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills' | 'cards';
  size?: 'sm' | 'md';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onChange,
  variant = 'underline',
  size = 'md',
  className = '',
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIndex = enabledTabs.findIndex((t) => t.id === tabs[index].id);

    let nextTab: TabItem | undefined;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextTab = enabledTabs[(currentIndex + 1) % enabledTabs.length];
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextTab =
        enabledTabs[(currentIndex - 1 + enabledTabs.length) % enabledTabs.length];
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextTab = enabledTabs[0];
    } else if (e.key === 'End') {
      e.preventDefault();
      nextTab = enabledTabs[enabledTabs.length - 1];
    }

    if (nextTab) {
      onChange(nextTab.id);
      const btn = tabListRef.current?.querySelector<HTMLButtonElement>(
        `[data-tab-id="${nextTab.id}"]`
      );
      btn?.focus();
    }
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
  };

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-orientation="horizontal"
      className={`flex items-center gap-1 ${
        variant === 'underline'
          ? 'border-b border-slate-200'
          : variant === 'pills'
          ? 'bg-slate-100/80 p-1 rounded-xl'
          : ''
      } ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTabId;

        let style = '';
        if (variant === 'underline') {
          style = isActive
            ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600 -mb-px'
            : 'text-slate-600 hover:text-slate-900 border-b-2 border-transparent -mb-px';
        } else if (variant === 'pills') {
          style = isActive
            ? 'bg-white text-slate-900 font-semibold shadow-xs rounded-lg'
            : 'text-slate-600 hover:text-slate-900 rounded-lg';
        } else if (variant === 'cards') {
          style = isActive
            ? 'bg-white text-indigo-600 font-semibold border border-slate-200 border-b-white rounded-t-xl -mb-px z-10 shadow-2xs'
            : 'text-slate-600 hover:text-slate-900 border border-transparent rounded-t-xl -mb-px';
        }

        return (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`inline-flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg ${sizeStyles[size]} ${style}`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span className="shrink-0">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};
