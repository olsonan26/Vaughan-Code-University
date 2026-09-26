import React from 'react';
import { Hammer } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { EmptyState } from '../../../components/shared/EmptyState';

/**
 * Honest placeholder for Studio areas that are not built yet.
 * No fake data and no buttons that pretend to work.
 */
export const ComingNext: React.FC<{ title: string; description: string; milestone: string }> = ({ title, description, milestone }) => (
  <div className="space-y-6">
    <PageHeader title={title} description={description} />
    <EmptyState
      icon={Hammer}
      title="Not available in this build yet"
      description={`This area arrives with the ${milestone} milestone. Nothing on this page is simulated.`}
    />
  </div>
);
