/**
 * Local Supabase stand-in for integration tests (NOT for production):
 *   /rest/v1/*     -> PostgREST (real Postgres + real RLS)
 *   /auth/v1/user  -> decodes the test JWT (HS256, shared secret)
 *   /storage/v1/*  -> minimal in-memory object store (sign upload, upload, list, download)
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createHmac } from 'node:crypto';

export const JWT_SECRET = 'local-test-secret-local-test-secret-000000';
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
export function signJwt(payload: Record<string, unknown>) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, ...payload });
  const sig = createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}
function verify(token: string) {
  const [h, b, s] = token.split('.');
  if (!s || createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url') !== s) return null;
  return JSON.parse(Buffer.from(b, 'base64url').toString());
}

const objects = new Map<string, { bytes: Uint8Array; type: string }>();
const uploadTokens = new Map<string, string>();

export function startLocalSupabase(port = 54321, postgrestUrl = 'http://127.0.0.1:3001') {
  const app = new Hono();
  app.all('/rest/v1/*', async (c) => {
    const url = new URL(c.req.url);
    const target = postgrestUrl + url.pathname.replace('/rest/v1', '') + url.search;
    const headers = new Headers(c.req.raw.headers);
    headers.delete('host');
    const res = await fetch(target, { method: c.req.method, headers, body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.arrayBuffer() });
    return new Response(res.body, { status: res.status, headers: res.headers });
  });
  app.get('/auth/v1/user', (c) => {
    const claims = verify((c.req.header('authorization') ?? '').replace(/^Bearer /, ''));
    if (!claims?.sub) return c.json({ msg: 'invalid JWT', code: 401 }, 401);
    return c.json({ id: claims.sub, email: claims.email ?? null, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} });
  });
  app.post('/storage/v1/object/upload/sign/:bucket/*', (c) => {
    const bucket = c.req.param('bucket');
    const path = c.req.path.split(`/upload/sign/${bucket}/`)[1];
    const token = crypto.randomUUID();
    uploadTokens.set(token, `${bucket}/${decodeURIComponent(path)}`);
    return c.json({ url: `/object/upload/sign/${bucket}/${path}?token=${token}` });
  });
  app.put('/storage/v1/object/upload/sign/:bucket/*', async (c) => {
    const key = uploadTokens.get(c.req.query('token') ?? '');
    if (!key) return c.json({ error: 'invalid token' }, 400);
    objects.set(key, { bytes: new Uint8Array(await c.req.arrayBuffer()), type: c.req.header('content-type') ?? 'application/octet-stream' });
    return c.json({ Key: key });
  });
  app.post('/storage/v1/object/list/:bucket', async (c) => {
    const bucket = c.req.param('bucket');
    const { prefix, search } = await c.req.json();
    const items = [...objects.keys()].filter((k) => k.startsWith(`${bucket}/${prefix}/`)).map((k) => ({ name: k.split('/').pop() })).filter((o) => !search || o.name!.includes(search));
    return c.json(items);
  });
  app.get('/storage/v1/object/:bucket/*', (c) => {
    const bucket = c.req.param('bucket');
    const path = decodeURIComponent(c.req.path.split(`/object/${bucket}/`)[1]);
    const o = objects.get(`${bucket}/${path}`);
    if (!o) return c.json({ error: 'not found' }, 404);
    return new Response(o.bytes, { headers: { 'content-type': o.type } });
  });
  app.post('/storage/v1/object/sign/:bucket/*', (c) => c.json({ signedURL: `/object/sign/${c.req.param('bucket')}/x?token=t` }));
  return serve({ fetch: app.fetch, port });
}
