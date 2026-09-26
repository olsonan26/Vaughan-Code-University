import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, AlertCircle, FileText, CheckCircle2, Loader2, XCircle, X, RotateCw } from 'lucide-react';
import { Button } from './Button';

export interface DropzoneProps {
  accept?: string[];
  maxSizeBytes?: number;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)} ${sizes[i]}`;
}

function getFormattedAllowedTypes(accept?: string[]): string {
  if (!accept || accept.length === 0) return '';
  const types = accept.map((item) => {
    let cleaned = item.trim().toLowerCase();
    if (cleaned.includes('/')) {
      // MIME type like application/pdf or text/plain
      const parts = cleaned.split('/');
      cleaned = parts[1] || parts[0];
      if (cleaned.startsWith('vnd.openxmlformats-officedocument.wordprocessingml.document')) cleaned = 'docx';
    }
    if (cleaned.startsWith('.')) cleaned = cleaned.slice(1);
    return cleaned.toUpperCase();
  });
  const unique = Array.from(new Set(types));
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} or ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')}, or ${unique[unique.length - 1]}`;
}

function isFileAccepted(file: File, accept?: string[]): boolean {
  if (!accept || accept.length === 0) return true;
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return accept.some((rule) => {
    const cleanRule = rule.trim().toLowerCase();
    if (cleanRule.startsWith('.')) {
      return fileName.endsWith(cleanRule);
    }
    if (cleanRule.includes('/')) {
      if (cleanRule.endsWith('/*')) {
        const category = cleanRule.split('/')[0];
        return fileType.startsWith(`${category}/`);
      }
      return fileType === cleanRule;
    }
    return fileName.endsWith(`.${cleanRule}`);
  });
}

export const Dropzone: React.FC<DropzoneProps> = ({
  accept,
  maxSizeBytes,
  multiple = true,
  disabled = false,
  onFiles,
  label = 'Drag and drop files here, or click to select',
  hint,
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      if (disabled) return;
      const rawFiles = Array.from(fileList);
      if (rawFiles.length === 0) return;

      const filesToProcess = multiple ? rawFiles : [rawFiles[0]];
      const validFiles: File[] = [];
      const newErrors: string[] = [];

      filesToProcess.forEach((file) => {
        // Size validation
        if (maxSizeBytes && file.size > maxSizeBytes) {
          const limitStr = formatBytes(maxSizeBytes);
          const sizeStr = formatBytes(file.size);
          newErrors.push(`${file.name} is ${sizeStr}; the limit is ${limitStr}.`);
          return;
        }

        // Type validation
        if (accept && accept.length > 0 && !isFileAccepted(file, accept)) {
          const allowedStr = getFormattedAllowedTypes(accept);
          newErrors.push(`${file.name} is not a supported type. Allowed: ${allowedStr}.`);
          return;
        }

        validFiles.push(file);
      });

      setErrors(newErrors);

      if (validFiles.length > 0) {
        onFiles(validFiles);
      }
    },
    [accept, maxSizeBytes, multiple, disabled, onFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!disabled && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      // Reset input value so selecting same file again works
      e.target.value = '';
    }
  };

  const acceptString = accept ? accept.map((a) => (a.startsWith('.') || a.includes('/') ? a : `.${a}`)).join(',') : undefined;

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-disabled={disabled}
        aria-label={typeof label === 'string' ? label : 'File dropzone'}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all duration-150 text-center select-none ${
          disabled
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
            : isDragOver
            ? 'border-indigo-500 bg-indigo-50/60 ring-4 ring-indigo-500/10 cursor-copy'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50 cursor-pointer'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className={`p-3 rounded-full mb-3 ${isDragOver ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
          <UploadCloud className="w-6 h-6" />
        </div>

        <div className="text-sm font-medium text-slate-800">{label}</div>

        {hint ? (
          <div className="text-xs text-slate-500 mt-1">{hint}</div>
        ) : (
          accept && (
            <div className="text-xs text-slate-400 mt-1">
              Supported formats: {getFormattedAllowedTypes(accept)}
              {maxSizeBytes && ` (up to ${formatBytes(maxSizeBytes)})`}
            </div>
          )
        )}
      </div>

      {errors.length > 0 && (
        <div className="space-y-1.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
          <div className="flex items-center justify-between font-semibold text-rose-900">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>File upload error</span>
            </div>
            <button
              type="button"
              onClick={() => setErrors([])}
              className="text-rose-500 hover:text-rose-700 text-xs font-normal underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <ul className="list-disc list-inside space-y-1 text-rose-700 pl-0.5">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export interface FileProgressItem {
  name: string;
  sizeBytes: number;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}

export interface FileProgressListProps {
  items: FileProgressItem[];
  className?: string;
  onRemove?: (name: string) => void;
  onRetry?: (name: string) => void;
}

export const FileProgressList: React.FC<FileProgressListProps> = ({
  items,
  className = '',
  onRemove,
  onRetry,
}) => {
  if (items.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item, idx) => (
        <div
          key={`${item.name}-${idx}`}
          className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0">
              <FileText className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-800 truncate">{item.name}</p>
                <span className="text-[11px] text-slate-400 shrink-0">{formatBytes(item.sizeBytes)}</span>
              </div>

              {item.status === 'uploading' && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                  />
                </div>
              )}

              {item.status === 'processing' && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  <span>Processing...</span>
                </div>
              )}

              {item.status === 'error' && (
                <div className="text-[11px] text-rose-600 truncate font-medium">
                  {item.error || 'Failed to upload'}
                </div>
              )}

              {item.status === 'done' && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Ready</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {item.status === 'error' && onRetry && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRetry(item.name)}
                className="text-xs py-1 px-2 text-rose-600 hover:bg-rose-50"
              >
                <RotateCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(item.name)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label={`Remove ${item.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
