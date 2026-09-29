import { describe, it, expect } from 'vitest';
import { parseYouTubeId } from '../youtube.js';

describe('parseYouTubeId', () => {
  it('parses direct 11-character video IDs', () => {
    expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('parses watch URLs with various query parameters', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('http://youtube.com/watch?v=dQw4w9WgXcQ&feature=shared&t=30')).toBe('dQw4w9WgXcQ');
  });

  it('parses short youtu.be URLs', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=120')).toBe('dQw4w9WgXcQ');
  });

  it('parses embed URLs', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1')).toBe('dQw4w9WgXcQ');
  });

  it('parses YouTube shorts URLs', () => {
    expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share')).toBe('dQw4w9WgXcQ');
  });

  it('handles invalid or non-YouTube input', () => {
    expect(parseYouTubeId('')).toBeNull();
    expect(parseYouTubeId(null)).toBeNull();
    expect(parseYouTubeId(undefined)).toBeNull();
    expect(parseYouTubeId('https://example.com/video.mp4')).toBeNull();
    expect(parseYouTubeId('not-a-youtube-id')).toBeNull();
  });
});
