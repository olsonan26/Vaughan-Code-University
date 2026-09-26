import React from 'react';
import { StatusBadge } from '../../components/shared/StatusBadge';
import type { JobState } from '../../shared/jobs/types';

export interface JobStatusBadgeProps {
  status: JobState | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  return (
    <StatusBadge
      type="job"
      status={status}
      size={size}
      className={className}
    />
  );
};

export default JobStatusBadge;
