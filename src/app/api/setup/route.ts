// ============================================================
// /api/setup — One-time DB schema migration endpoint
// Runs supabase/schema.sql against the Supabase Postgres DB
// This endpoint uses 'pg' package and works on Vercel (IPv6 OK)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const SETUP_SECRET = 'magang-cerdas-setup-2024'; // simple guard

export async function POST(req: NextRequest) {
  try {
    // Guard: require secret in body to prevent unauthorized runs
    const body = await req.json().catch(() => ({}));
    if (body?.secret !== SETUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: invalid setup secret' }, { status: 401 });
    }

    const dbPassword = process.env.SUPABASE_DB_PASSWORD;
    if (!dbPassword) {
      return NextResponse.json({ error: 'SUPABASE_DB_PASSWORD env var not set' }, { status: 500 });
    }

    // Read schema file
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({ error: 'supabase/schema.sql not found' }, { status: 500 });
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Connect to Supabase Postgres (direct connection — Vercel supports IPv6)
    const client = new pg.Client({
      host: 'db.ktfyzoowgxvllwauqpir.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000
    });

    await client.connect();
    const results: { stmt: string; status: 'ok' | 'error'; error?: string }[] = [];

    // Split by semicolon + newline (basic, but works for our DDL)
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        results.push({ stmt: stmt.slice(0, 80), status: 'ok' });
      } catch (e: any) {
        results.push({ stmt: stmt.slice(0, 80), status: 'error', error: e.message });
      }
    }

    // Verify tables created
    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    await client.end();

    return NextResponse.json({
      success: true,
      message: `Executed ${results.length} statements. ${results.filter((r) => r.status === 'ok').length} OK, ${results.filter((r) => r.status === 'error').length} errors.`,
      tables: res.rows.map((r) => r.table_name),
      details: results
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/setup',
    method: 'POST',
    description: 'Run supabase/schema.sql against the Supabase Postgres database. Use this ONCE after first deploy.',
    usage: 'POST /api/setup with body: { "secret": "magang-cerdas-setup-2024" }'
  });
}
