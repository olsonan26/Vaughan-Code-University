import React from 'react';
import { Badge } from '../../components/shared/Badge';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AUTHORITY_LABEL, STATE_LABEL, isBusy, type ProcessingState } from './api';

export const SourceStateBadge: React.FC<{ state: ProcessingState }> = ({ state }) => {
  if (isBusy(state)) {
    return (
      <span className="inline-flex items-center gap-2">
        <StatusBadge type="source" status="processing" size="sm" />
        <span className="text-[11px] text-slate-500 hidden sm:inline">{STATE_LABEL[state]}</span>
      </span>
    );
  }
  return <StatusBadge type="source" status={state} size="sm" />;
};

export const AuthorityBadge: React.FC<{ level: number }> = ({ level }) => (
  <Badge size="sm" variant={level >= 5 ? 'purple' : level === 4 ? 'indigo' : level === 3 ? 'sky' : 'slate'} title={AUTHORITY_LABEL[level]}>
    L{level} · {AUTHORITY_LABEL[level] ?? 'Unknown'}
  </Badge>
);
