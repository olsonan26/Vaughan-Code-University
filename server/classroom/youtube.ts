/**
 * YouTube URL parser for classroom lesson items.
 * Extracts the 11-character YouTube video ID from various URL formats or plain ID strings.
 */

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct 11-char ID check
  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    let urlStr = trimmed;
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      urlStr = 'https://' + urlStr;
    }

    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'youtu.be' || hostname.endsWith('.youtu.be')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] && YOUTUBE_ID_REGEX.test(parts[0])) {
        return parts[0];
      }
    }

    if (hostname.includes('youtube.com') || hostname.includes('youtube-nocookie.com')) {
      // 1. /watch?v=ID
      const v = url.searchParams.get('v');
      if (v && YOUTUBE_ID_REGEX.test(v)) {
        return v;
      }

      // 2. /embed/ID
      if (url.pathname.startsWith('/embed/')) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[1] && YOUTUBE_ID_REGEX.test(parts[1])) {
          return parts[1];
        }
      }

      // 3. /shorts/ID
      if (url.pathname.startsWith('/shorts/')) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[1] && YOUTUBE_ID_REGEX.test(parts[1])) {
          return parts[1];
        }
      }

      // 4. /v/ID
      if (url.pathname.startsWith('/v/')) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[1] && YOUTUBE_ID_REGEX.test(parts[1])) {
          return parts[1];
        }
      }
    }
  } catch {
    // Fall through to regex fallback if URL parsing fails
  }

  // Regex fallback for loose matches
  const match = trimmed.match(/(?:v=|embed\/|shorts\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}
