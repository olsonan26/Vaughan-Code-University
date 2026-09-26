/**
 * GET /api/health
 *
 * Minimal Vercel Function proving the server-side layer works in previews and production.
 * Future server-only code (AI Gateway, publishing, Supabase service operations) lives in /api.
 * Reports only whether server config is present, never the values.
 */
export function GET(): Response {
  return Response.json({
    ok: true,
    service: 'vaughan-code-university',
    serverConfig: {
      supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    },
    time: new Date().toISOString(),
  });
}
