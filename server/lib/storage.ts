import { getServiceClient } from './supabase.js';
import { HttpError } from './errors.js';

export interface BucketRule {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export const BUCKET_RULES: Record<string, BucketRule> = {
  'knowledge-sources': {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
    allowedExtensions: ['.pdf', '.txt', '.md', '.csv', '.docx', '.doc'],
  },
  'course-media': {
    maxSizeBytes: 15 * 1024 * 1024, // 15MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
  },
};

export function sanitizeFilename(filename: string): string {
  if (!filename) return 'file';
  // Remove path traversal and directory separators
  let name = filename.replace(/^.*[\\/]/, '');
  // Normalize whitespace & replace special chars (except dots, hyphens, underscores)
  name = name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  // Avoid consecutive underscores or dots
  name = name.replace(/_+/g, '_');
  return name.length > 0 ? name : 'file';
}

export function buildStoragePath(orgId: string, entityId: string, filename: string): string {
  const safeName = sanitizeFilename(filename);
  const uniqueId = crypto.randomUUID();
  return `${orgId}/${entityId}/${uniqueId}-${safeName}`;
}

export function validateStorageUpload(
  bucket: string,
  mimeType: string,
  sizeBytes: number,
  filename?: string
): void {
  const rule = BUCKET_RULES[bucket];
  if (!rule) {
    throw new HttpError(400, 'invalid_file', `Unsupported storage bucket: ${bucket}`);
  }

  if (sizeBytes > rule.maxSizeBytes) {
    const maxMb = Math.round(rule.maxSizeBytes / (1024 * 1024));
    throw new HttpError(
      400,
      'invalid_file',
      `File size (${Math.round(sizeBytes / (1024 * 1024))}MB) exceeds maximum limit of ${maxMb}MB for bucket '${bucket}'`
    );
  }

  const normalizedMime = (mimeType || '').toLowerCase().trim();
  const ext = filename ? `.${filename.split('.').pop()?.toLowerCase()}` : '';

  const mimeMatch = rule.allowedMimeTypes.some((m) => normalizedMime === m || normalizedMime.startsWith(m));
  const extMatch = ext ? rule.allowedExtensions.includes(ext) : false;

  if (!mimeMatch && !extMatch) {
    throw new HttpError(
      400,
      'invalid_file',
      `File type '${mimeType || ext}' is not permitted in bucket '${bucket}'`
    );
  }
}

export async function createSignedUploadUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = 300
): Promise<{ signedUrl: string; token: string; path: string }> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, {
    expiresIn: expiresInSeconds,
  });

  if (error || !data) {
    throw new HttpError(
      500,
      'storage_error',
      `Failed to create signed upload URL: ${error?.message || 'Unknown error'}`
    );
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  };
}

export async function createSignedDownloadUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = 3600
): Promise<{ signedUrl: string }> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    throw new HttpError(
      500,
      'storage_error',
      `Failed to create signed download URL: ${error?.message || 'Unknown error'}`
    );
  }

  return { signedUrl: data.signedUrl };
}
