import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Command, CornerDownLeft } from 'lucide-react';
import { Kbd } from './Kbd';

export interface CommandItem {
  id: string;
  label: string;
  group?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

export interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: CommandItem[];
  placeholder?: string;
  className?: string;
}

export function useCommandMenuHotkey(
  setOpen: React.Dispatch<React.SetStateAction<boolean>> | ((fn: (prev: boolean) => boolean) => void)
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev: boolean) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOpen]);
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  open,
  onOpenChange,
  commands,
  placeholder = 'Type a command or search...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Filter commands by fuzzy-ish substring search
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(q);
      const matchGroup = cmd.group?.toLowerCase().includes(q);
      const matchShortcut = cmd.shortcut?.toLowerCase().includes(q);
      return matchLabel || matchGroup || matchShortcut;
    });
  }, [commands, query]);

  // Group filtered commands
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {};
    filteredCommands.forEach((cmd) => {
      const groupName = cmd.group || 'Actions';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Flattened list for key index tracking
  const flatSelectableList = useMemo(() => {
    return filteredCommands.filter((c) => !c.disabled);
  }, [filteredCommands]);

  // Reset selection index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus management & hotkeys
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setQuery('');
      setSelectedIndex(0);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onOpenChange(false);
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (flatSelectableList.length > 0 ? (prev + 1) % flatSelectableList.length : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            flatSelectableList.length > 0 ? (prev - 1 + flatSelectableList.length) % flatSelectableList.length : 0
          );
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (flatSelectableList.length > 0 && flatSelectableList[selectedIndex]) {
            const item = flatSelectableList[selectedIndex];
            if (!item.disabled) {
              onOpenChange(false);
              item.onSelect();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [open, flatSelectableList, selectedIndex, onOpenChange]);

  if (!open) return null;

  let currentFlatIndex = 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Command Palette Dialog */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={`relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 animate-in zoom-in-95 duration-150 ${className}`}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Command Options List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {flatSelectableList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(groupedCommands).map(([groupName, items]) => (
              <div key={groupName} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {groupName}
                </div>
                {items.map((cmd) => {
                  const itemIndex = currentFlatIndex;
                  if (!cmd.disabled) {
                    currentFlatIndex++;
                  }
                  const isSelected = !cmd.disabled && itemIndex === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      disabled={cmd.disabled}
                      onClick={() => {
                        if (cmd.disabled) return;
                        onOpenChange(false);
                        cmd.onSelect();
                      }}
                      onMouseEnter={() => {
                        if (!cmd.disabled) setSelectedIndex(itemIndex);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {cmd.icon ? (
                          <span
                            className={`shrink-0 ${
                              isSelected ? 'text-white' : 'text-slate-500'
                            }`}
                          >
                            {cmd.icon}
                          </span>
                        ) : (
                          <Command
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? 'text-white' : 'text-slate-400'
                            }`}
                          />
                        )}
                        <span className="truncate">{cmd.label}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {cmd.shortcut && (
                          <Kbd
                            className={
                              isSelected
                                ? 'bg-indigo-700 text-indigo-100 border-indigo-500'
                                : ''
                            }
                          >
                            {cmd.shortcut}
                          </Kbd>
                        )}
                        {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-indigo-200 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Use <Kbd>↑</Kbd> <Kbd>↓</Kbd> to navigate</span>
            <span><Kbd>↵</Kbd> to select</span>
          </div>
          <span><Kbd>ESC</Kbd> to close</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
