import type { Hono } from 'hono';
import type { AppEnv } from '../context.js';
import { meRoutes } from './me.js';
import { adminRoutes } from './admin.js';
import { jobsRoutes } from './jobs.js';
import { knowledgeRoutes } from './knowledge.js';
import { studioRoutes } from './studio.js';
import { classroomRoutes } from './classroom.js';
import { studioClassroomRoutes } from './studioClassroom.js';
import { kateRoutes } from './kate.js';
import { kateChangeSetRoutes } from './kateChangeSets.js';
import { courseBuildRoutes } from './courseBuilds.js';
import { registerKnowledgeHandlers } from '../knowledge/processor.js';
import { registerCourseBuildHandlers } from '../kate/courseBuild.js';

registerKnowledgeHandlers();
registerCourseBuildHandlers();

/**
 * Route registry. Each feature exports a Hono sub-app and is mounted here.
 * Final paths are /api/<mount>/...
 */
export function registerRoutes(app: Hono<AppEnv>) {
  app.route('/me', meRoutes);
  app.route('/admin', adminRoutes);
  app.route('/jobs', jobsRoutes);
  app.route('/knowledge', knowledgeRoutes);
  app.route('/classroom', classroomRoutes);
  app.route('/studio/classroom', studioClassroomRoutes);
  app.route('/kate/change-sets', kateChangeSetRoutes);
  app.route('/kate', kateRoutes);
  app.route('/studio/builds', courseBuildRoutes);
  app.route('/studio', studioRoutes);
}
