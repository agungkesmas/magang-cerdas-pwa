// ============================================================
// /api/setup — One-time DB schema migration endpoint
// Tries multiple Supabase connection methods:
// 1. Connection pooler (IPv4, all regions)
// 2. Direct DB (IPv6, may fail on IPv4-only networks)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const SETUP_SECRET = 'magang-cerdas-setup-2024';

async function tryConnect(config: pg.ClientConfig): Promise<{ client: pg.Client | null; error: string | null }> {
  const client = new pg.Client({
    ...config,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });
  try {
    await client.connect();
    return { client, error: null };
  } catch (e: any) {
    try { await client.end(); } catch (_) {}
    return { client: null, error: e.message };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.secret !== SETUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: invalid setup secret' }, { status: 401 });
    }

    const dbPassword = process.env.SUPABASE_DB_PASSWORD;
    if (!dbPassword) {
      return NextResponse.json({ error: 'SUPABASE_DB_PASSWORD env var not set' }, { status: 500 });
    }

    const projectRef = 'ktfyzoowgxvllwauqpir';
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({ error: 'supabase/schema.sql not found' }, { status: 500 });
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Try multiple connection methods in order
    const connectionAttempts = [
      {
        label: 'Pooler ap-southeast-1 (Singapore)',
        config: {
          host: 'aws-0-ap-southeast-1.pooler.supabase.com',
          port: 5432,
          database: 'postgres',
          user: `postgres.${projectRef}`,
          password: dbPassword
        }
      },
      {
        label: 'Pooler us-east-1',
        config: {
          host: 'aws-0-us-east-1.pooler.supabase.com',
          port: 5432,
          database: 'postgres',
          user: `postgres.${projectRef}`,
          password: dbPassword
        }
      },
      {
        label: 'Pooler ap-northeast-1 (Tokyo)',
        config: {
          host: 'aws-0-ap-northeast-1.pooler.supabase.com',
          port: 5432,
          database: 'postgres',
          user: `postgres.${projectRef}`,
          password: dbPassword
        }
      },
      {
        label: 'Pooler eu-west-1',
        config: {
          host: 'aws-0-eu-west-1.pooler.supabase.com',
          port: 5432,
          database: 'postgres',
          user: `postgres.${projectRef}`,
          password: dbPassword
        }
      },
      {
        label: 'Direct DB (IPv6)',
        config: {
          host: `db.${projectRef}.supabase.co`,
          port: 5432,
          database: 'postgres',
          user: 'postgres',
          password: dbPassword
        }
      }
    ];

    let client: pg.Client | null = null;
    let usedLabel = '';
    const connectionLog: string[] = [];

    for (const attempt of connectionAttempts) {
      connectionLog.push(`Trying ${attempt.label}...`);
      const { client: c, error } = await tryConnect(attempt.config);
      if (c) {
        client = c;
        usedLabel = attempt.label;
        connectionLog.push(`✅ Connected via ${attempt.label}`);
        break;
      } else {
        connectionLog.push(`❌ ${attempt.label} failed: ${error}`);
      }
    }

    if (!client) {
      return NextResponse.json({
        error: 'All connection methods failed. Please run schema.sql manually in Supabase SQL Editor.',
        connectionLog
      }, { status: 500 });
    }

    const results: { stmt: string; status: 'ok' | 'error'; error?: string }[] = [];
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

    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    await client.end();

    return NextResponse.json({
      success: true,
      connectionMethod: usedLabel,
      message: `Executed ${results.length} statements. ${results.filter((r) => r.status === 'ok').length} OK, ${results.filter((r) => r.status === 'error').length} errors.`,
      tables: res.rows.map((r) => r.table_name),
      connectionLog,
      details: results.filter((r) => r.status === 'error').slice(0, 10)
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
    usage: 'POST /api/setup with body: { "secret": "magang-cerdas-setup-2024" }',
    note: 'Tries Supabase pooler (IPv4) first, falls back to direct DB (IPv6)'
  });
}
