import { describe, it, expect } from 'vitest';
import { convertLegacyCourseToClassroomCourse, parseYouTubeId } from './adapter';
import type { Course } from '../../types';

describe('parseYouTubeId', () => {
  it('parses standard youtube watch URLs', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=09v3u2J1hWY')).toBe('09v3u2J1hWY');
  });

  it('parses youtube embed URLs', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/09v3u2J1hWY')).toBe('09v3u2J1hWY');
  });

  it('parses youtu.be short URLs', () => {
    expect(parseYouTubeId('https://youtu.be/09v3u2J1hWY')).toBe('09v3u2J1hWY');
  });

  it('returns undefined for invalid or empty URLs', () => {
    expect(parseYouTubeId(undefined)).toBeUndefined();
    expect(parseYouTubeId('https://example.com/video.mp4')).toBeUndefined();
  });
});

describe('convertLegacyCourseToClassroomCourse', () => {
  const sampleCourse: Course = {
    id: 'course-test',
    title: 'Test Masterclass',
    slug: 'test-masterclass',
    tagline: 'Learn testing',
    description: 'A test course description',
    thumbnail: '/images/courses/test.jpg',
    category: 'Engineering',
    author: {
      id: 'author-1',
      name: 'Prof. Vaughan',
      avatar: '/avatar.jpg',
      role: 'creator',
    },
    requiredTier: 'free',
    requiredLevel: 1,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    modules: [
      {
        id: 'mod-1',
        title: 'Module 1: Foundations',
        description: 'Module 1 description',
        lessons: [
          {
            id: 'les-1',
            title: 'Lesson 1 Video & Quiz',
            description: 'Lesson 1 description',
            type: 'video',
            durationMinutes: 15,
            xpReward: 50,
            videoUrl: 'https://www.youtube.com/watch?v=09v3u2J1hWY',
            contentMarkdown: '### Lesson 1 Notes\nSome markdown text.',
            quiz: {
              id: 'quiz-1',
              title: 'Quiz 1',
              description: 'Test quiz',
              passingScorePercentage: 80,
              xpReward: 100,
              questions: [
                {
                  id: 'q-1',
                  question: 'What is 2+2?',
                  options: ['3', '4', '5'],
                  correctAnswerIndex: 1,
                  explanation: '2+2=4',
                },
              ],
            },
            resources: [
              {
                title: 'Resource PDF',
                url: 'https://example.com/doc.pdf',
                type: 'pdf',
              },
            ],
          },
        ],
      },
    ],
  };

  it('converts legacy course structure to ClassroomCourse structure', () => {
    const result = convertLegacyCourseToClassroomCourse(sampleCourse, {
      completedLessonIds: ['les-1'],
      userLevel: 2,
      userTier: 'pro',
    });

    expect(result.id).toBe('course-test');
    expect(result.title).toBe('Test Masterclass');
    expect(result.modules).toHaveLength(1);

    const mod = result.modules[0];
    expect(mod.id).toBe('mod-1');
    expect(mod.lessons).toHaveLength(1);

    const les = mod.lessons[0];
    expect(les.id).toBe('les-1');
    expect(les.completed).toBe(true);

    // Items check
    expect(les.items.map((i) => i.kind)).toEqual([
      'video',
      'reading',
      'quiz',
      'resource',
    ]);

    // Check video item payload
    const videoItem = les.items.find((i) => i.kind === 'video');
    expect(videoItem?.payload).toEqual({
      kind: 'video',
      youtubeId: '09v3u2J1hWY',
      url: 'https://www.youtube.com/watch?v=09v3u2J1hWY',
      transcript: undefined,
    });

    // Check quiz question conversion
    const quizItem = les.items.find((i) => i.kind === 'quiz');
    if (quizItem?.payload.kind === 'quiz') {
      expect(quizItem.payload.questions).toHaveLength(1);
      expect(quizItem.payload.questions[0].prompt).toBe('What is 2+2?');
      expect(quizItem.payload.questions[0].correctOptionIds).toEqual(['opt-1']);
    } else {
      throw new Error('Quiz payload kind mismatch');
    }
  });

  it('sets lock state when user level is below required level', () => {
    const lockedCourse: Course = {
      ...sampleCourse,
      requiredLevel: 5,
    };

    const result = convertLegacyCourseToClassroomCourse(lockedCourse, {
      userLevel: 2,
    });

    expect(result.lock?.locked).toBe(true);
    expect(result.lock?.reason).toBe('Requires Level 5');
  });
});
