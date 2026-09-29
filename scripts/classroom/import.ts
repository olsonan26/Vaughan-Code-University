/** Import the built-in VC 101/201/301 catalog into Supabase (idempotent). Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/classroom/import.ts [--dry-run] */
import { getServiceClient } from '../../server/lib/supabase.js';
import { importCatalog, InMemoryClassroomImportRepository, SupabaseClassroomImportRepository } from '../../server/classroom/import.js';
import { INITIAL_COURSES } from '../../src/data/initialData.js';

const dry = process.argv.includes('--dry-run');
const db = getServiceClient();
const org = await db.from('organizations').select('id, name').order('created_at').limit(1).single();
if (org.error) throw org.error;
const owner = await db.from('user_roles').select('user_id, role').eq('organization_id', org.data.id).in('role', ['headmaster', 'admin']).limit(1).maybeSingle();
const repo = dry ? new InMemoryClassroomImportRepository() : new SupabaseClassroomImportRepository(db);
const counts = await importCatalog(repo as any, org.data.id, INITIAL_COURSES as any, { ownerUserId: owner.data?.user_id });
console.log(dry ? 'DRY RUN' : 'IMPORTED', org.data.name, counts);
