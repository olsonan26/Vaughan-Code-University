import { useState, useEffect, useCallback, useRef } from 'react';
import { getClassroomCourses } from './api';
import { convertLegacyCourseToClassroomCourse } from './adapter';
import type { ClassroomCourse, ClassroomResponse } from '../../../shared/classroom/types';
import { INITIAL_COURSES } from '../../data/initialData';
import type { Course } from '../../types';

export interface UseClassroomOptions {
  userLevel?: number;
  userTier?: string;
  completedLessonIds?: string[];
  /** Optional custom legacy courses from context/localStorage */
  legacyCourses?: Course[];
}

export interface UseClassroomResult {
  courses: ClassroomCourse[];
  viewer: ClassroomResponse['viewer'] | null;
  isLoading: boolean;
  error: string | null;
  isFallback: boolean;
  refresh: () => Promise<void>;
}

const NO_IDS: string[] = [];

/**
 * Loads the Classroom once on mount (and on refresh()).
 * Options are read through a ref so a caller passing new object/array literals on every render
 * can never trigger a refetch loop (that loop caused the page to flash between loading and loaded).
 */
export function useClassroom(options: UseClassroomOptions = {}): UseClassroomResult {
  const optsRef = useRef(options);
  optsRef.current = options;

  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [viewer, setViewer] = useState<ClassroomResponse['viewer'] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);

  const getFallbackCourses = useCallback(() => {
    const { userLevel = 1, userTier = 'free', completedLessonIds = NO_IDS, legacyCourses } = optsRef.current;
    let sourceCourses: Course[] = INITIAL_COURSES;
    if (legacyCourses && legacyCourses.length > 0) {
      sourceCourses = legacyCourses;
    } else {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('vcu_v4_courses') : null;
      if (saved) {
        try {
          sourceCourses = JSON.parse(saved);
        } catch {
          sourceCourses = INITIAL_COURSES;
        }
      }
    }
    return sourceCourses.map((c) =>
      convertLegacyCourseToClassroomCourse(c, {
        completedLessonIds,
        userLevel,
        userTier,
      })
    );
  }, []);

  const loadedOnce = useRef(false);
  const fetchCourses = useCallback(async () => {
    const userLevel = optsRef.current.userLevel ?? 1;
    // Only show the loading state on the first load; refreshes update in place (no flashing).
    if (!loadedOnce.current) setIsLoading(true);
    setError(null);
    try {
      const res = await getClassroomCourses();
      if (res && Array.isArray(res.courses) && res.courses.length > 0) {
        setCourses(res.courses);
        setViewer(res.viewer);
        setIsFallback(false);
      } else {
        // 0 courses returned, fall back
        setCourses(getFallbackCourses());
        setViewer({ userId: null, isInstructor: false, level: userLevel });
        setIsFallback(true);
      }
    } catch (err: unknown) {
      // API error, network failure, 404, 503, or backend not configured -> fall back
      const msg = err instanceof Error ? err.message : 'API unavailable';
      setError(msg);
      setCourses(getFallbackCourses());
      setViewer({ userId: null, isInstructor: false, level: userLevel });
      setIsFallback(true);
    } finally {
      loadedOnce.current = true;
      setIsLoading(false);
    }
  }, [getFallbackCourses]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    viewer,
    isLoading,
    error,
    isFallback,
    refresh: fetchCourses,
  };
}
