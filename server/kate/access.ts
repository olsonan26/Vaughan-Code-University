import type { AuthContext } from '../context.js';
import { HttpError } from '../lib/errors.js';

export async function assertCourseTeam(db: any, auth: AuthContext, courseId: string): Promise<boolean> {
  if (!courseId) {
    throw new HttpError(400, 'invalid_input', 'courseId is required');
  }

  if (auth && typeof auth.can === 'function' && auth.can('course.edit_all')) {
    return true;
  }

  if (db && typeof db.isCourseTeam === 'function') {
    const isTeam = await db.isCourseTeam(courseId, auth.userId);
    if (isTeam) return true;
    throw new HttpError(403, 'forbidden', 'User is not part of the course team');
  }

  if (db && typeof db.from === 'function') {
    const { data: course } = await db
      .from('courses')
      .select('created_by')
      .eq('id', courseId)
      .maybeSingle();

    if (course && course.created_by === auth.userId) {
      return true;
    }

    const { data: collab } = await db
      .from('course_collaborators')
      .select('id')
      .eq('course_id', courseId)
      .eq('user_id', auth.userId)
      .maybeSingle();

    if (collab) {
      return true;
    }
  }

  throw new HttpError(403, 'forbidden', 'User is not part of the course team');
}
