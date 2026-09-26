import React from 'react';
import { PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { IconButton } from './IconButton';

export interface SplitPaneProps {
  left?: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  leftOpen?: boolean;
  onToggleLeft?: () => void;
  rightOpen?: boolean;
  onToggleRight?: () => void;
  leftWidth?: string;
  rightWidth?: string;
  className?: string;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  left,
  center,
  right,
  leftOpen = true,
  onToggleLeft,
  rightOpen = true,
  onToggleRight,
  leftWidth = 'lg:w-72',
  rightWidth = 'lg:w-80',
  className = '',
}) => {
  return (
    <div className={`flex flex-col lg:flex-row w-full min-h-0 overflow-hidden ${className}`}>
      {/* Left Pane */}
      {left && (
        <aside
          className={`shrink-0 transition-all duration-200 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white ${
            leftOpen ? `w-full ${leftWidth} block` : 'hidden'
          }`}
        >
          <div className="h-full overflow-y-auto relative">
            {onToggleLeft && (
              <div className="absolute top-3 right-3 z-10 hidden lg:block">
                <IconButton
                  aria-label="Collapse left panel"
                  icon={<PanelLeftClose className="w-4 h-4" />}
                  variant="ghost"
                  size="sm"
                  onClick={onToggleLeft}
                />
              </div>
            )}
            {left}
          </div>
        </aside>
      )}

      {/* Toggle left button when left is closed */}
      {left && !leftOpen && onToggleLeft && (
        <div className="hidden lg:flex items-start p-2 border-r border-slate-200 bg-slate-50">
          <IconButton
            aria-label="Expand left panel"
            icon={<PanelLeftOpen className="w-4 h-4" />}
            variant="ghost"
            size="sm"
            onClick={onToggleLeft}
          />
        </div>
      )}

      {/* Center Main Pane */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50/50 relative">
        {center}
      </main>

      {/* Toggle right button when right is closed */}
      {right && !rightOpen && onToggleRight && (
        <div className="hidden lg:flex items-start p-2 border-l border-slate-200 bg-slate-50">
          <IconButton
            aria-label="Expand right panel"
            icon={<PanelRightOpen className="w-4 h-4" />}
            variant="ghost"
            size="sm"
            onClick={onToggleRight}
          />
        </div>
      )}

      {/* Right Pane */}
      {right && (
        <aside
          className={`shrink-0 transition-all duration-200 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white ${
            rightOpen ? `w-full ${rightWidth} block` : 'hidden'
          }`}
        >
          <div className="h-full overflow-y-auto relative">
            {onToggleRight && (
              <div className="absolute top-3 right-3 z-10 hidden lg:block">
                <IconButton
                  aria-label="Collapse right panel"
                  icon={<PanelRightClose className="w-4 h-4" />}
                  variant="ghost"
                  size="sm"
                  onClick={onToggleRight}
                />
              </div>
            )}
            {right}
          </div>
        </aside>
      )}
    </div>
  );
};
