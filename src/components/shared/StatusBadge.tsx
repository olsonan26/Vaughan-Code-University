import React from 'react';
import { Badge, BadgeProps } from './Badge';
import {
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Archive,
  Lock,
  RotateCw,
  XCircle,
  Bot,
  User,
  Edit,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

export type StatusCategory =
  | 'course'
  | 'source'
  | 'visual'
  | 'job'
  | 'finding_severity'
  | 'finding_status'
  | 'provenance';

export interface StatusBadgeProps {
  type: StatusCategory;
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

interface StatusConfig {
  label: string;
  variant: BadgeProps['variant'];
  icon: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  status,
  size = 'md',
  className = '',
}) => {
  const normStatus = status.toLowerCase().replace(/_/g, ' ').trim();

  const getConfig = (): StatusConfig => {
    switch (type) {
      case 'course': {
        if (normStatus === 'draft')
          return { label: 'Draft', variant: 'slate', icon: <Clock className="w-3 h-3" /> };
        if (normStatus === 'generating')
          return { label: 'Generating', variant: 'amber', icon: <Sparkles className="w-3 h-3 animate-spin" /> };
        if (normStatus === 'needs review' || normStatus === 'needs_review')
          return { label: 'Needs Review', variant: 'amber', icon: <AlertCircle className="w-3 h-3" /> };
        if (normStatus === 'ready')
          return { label: 'Ready', variant: 'sky', icon: <CheckCircle2 className="w-3 h-3" /> };
        if (normStatus === 'published')
          return { label: 'Published', variant: 'emerald', icon: <FileCheck className="w-3 h-3" /> };
        if (normStatus === 'archived')
          return { label: 'Archived', variant: 'slate', icon: <Archive className="w-3 h-3" /> };
        break;
      }
      case 'source': {
        if (normStatus === 'processing')
          return { label: 'Processing', variant: 'amber', icon: <RotateCw className="w-3 h-3 animate-spin" /> };
        if (normStatus === 'ready')
          return { label: 'Ready', variant: 'emerald', icon: <CheckCircle2 className="w-3 h-3" /> };
        if (normStatus === 'failed')
          return { label: 'Failed', variant: 'rose', icon: <XCircle className="w-3 h-3" /> };
        if (normStatus === 'needs review' || normStatus === 'needs_review')
          return { label: 'Needs Review', variant: 'amber', icon: <AlertCircle className="w-3 h-3" /> };
        if (normStatus === 'canonical')
          return { label: 'Canonical', variant: 'purple', icon: <ShieldCheck className="w-3 h-3" /> };
        if (normStatus === 'locked')
          return { label: 'Locked', variant: 'slate', icon: <Lock className="w-3 h-3" /> };
        break;
      }
      case 'visual': {
        if (normStatus === 'missing')
          return { label: 'Missing', variant: 'slate', icon: <AlertCircle className="w-3 h-3" /> };
        if (normStatus === 'prompt ready' || normStatus === 'prompt_ready')
          return { label: 'Prompt Ready', variant: 'indigo', icon: <Sparkles className="w-3 h-3" /> };
        if (normStatus === 'uploaded')
          return { label: 'Uploaded', variant: 'sky', icon: <CheckCircle2 className="w-3 h-3" /> };
        if (normStatus === 'needs revision' || normStatus === 'needs_revision')
          return { label: 'Needs Revision', variant: 'amber', icon: <AlertCircle className="w-3 h-3" /> };
        if (normStatus === 'approved')
          return { label: 'Approved', variant: 'emerald', icon: <FileCheck className="w-3 h-3" /> };
        break;
      }
      case 'job': {
        if (normStatus === 'queued')
          return { label: 'Queued', variant: 'slate', icon: <Clock className="w-3 h-3" /> };
        if (normStatus === 'running')
          return { label: 'Running', variant: 'indigo', icon: <RotateCw className="w-3 h-3 animate-spin" /> };
        if (normStatus === 'paused')
          return { label: 'Paused', variant: 'amber', icon: <Clock className="w-3 h-3" /> };
        if (normStatus === 'retrying')
          return { label: 'Retrying', variant: 'amber', icon: <RotateCw className="w-3 h-3 animate-spin" /> };
        if (normStatus === 'completed')
          return { label: 'Completed', variant: 'emerald', icon: <CheckCircle2 className="w-3 h-3" /> };
        if (normStatus === 'failed')
          return { label: 'Failed', variant: 'rose', icon: <XCircle className="w-3 h-3" /> };
        if (normStatus === 'cancelled')
          return { label: 'Cancelled', variant: 'slate', icon: <XCircle className="w-3 h-3" /> };
        break;
      }
      case 'finding_severity': {
        if (normStatus === 'critical')
          return { label: 'Critical', variant: 'rose', icon: <XCircle className="w-3 h-3" /> };
        if (normStatus === 'major')
          return { label: 'Major', variant: 'amber', icon: <AlertCircle className="w-3 h-3" /> };
        if (normStatus === 'minor')
          return { label: 'Minor', variant: 'sky', icon: <AlertCircle className="w-3 h-3" /> };
        if (normStatus === 'info')
          return { label: 'Info', variant: 'slate', icon: <HelpCircle className="w-3 h-3" /> };
        break;
      }
      case 'finding_status': {
        if (normStatus === 'open')
          return { label: 'Open', variant: 'amber', icon: <AlertCircle className="w-3 h-3" /> };
        if (normStatus === 'resolved')
          return { label: 'Resolved', variant: 'emerald', icon: <CheckCircle2 className="w-3 h-3" /> };
        if (normStatus === 'ignored')
          return { label: 'Ignored', variant: 'slate', icon: <XCircle className="w-3 h-3" /> };
        break;
      }
      case 'provenance': {
        if (normStatus === 'ai generated' || normStatus === 'ai_generated' || normStatus === 'ai')
          return { label: 'AI Generated', variant: 'indigo', icon: <Bot className="w-3 h-3" /> };
        if (normStatus === 'human written' || normStatus === 'human_written' || normStatus === 'human')
          return { label: 'Human Written', variant: 'emerald', icon: <User className="w-3 h-3" /> };
        if (normStatus === 'ai edited' || normStatus === 'ai_edited')
          return { label: 'AI Edited', variant: 'purple', icon: <Edit className="w-3 h-3" /> };
        if (normStatus === 'approved')
          return { label: 'Approved', variant: 'sky', icon: <ShieldCheck className="w-3 h-3" /> };
        break;
      }
    }

    // Default fallback
    return {
      label: status,
      variant: 'slate',
      icon: <HelpCircle className="w-3 h-3" />,
    };
  };

  const config = getConfig();

  return (
    <Badge
      variant={config.variant}
      size={size}
      icon={config.icon}
      className={className}
    >
      {config.label}
    </Badge>
  );
};
