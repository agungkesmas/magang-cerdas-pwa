// ============================================================
// AUTH HELPERS — JWT + bcrypt
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { createServerClient } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'magang-cerdas-jwt-secret-fallback-change-me';
const ADMIN_COOKIE = 'magang_admin_token';
const INTERN_COOKIE = 'magang_intern_token';
const BKK_COOKIE = 'magang_bkk_token';
const PEMBINA_COOKIE = 'magang_pembina_token';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// ============================================================
// Username & Password generator for interns
// Format: Username = [first letter of first name uppercased] + [6 random alphanumeric]
//         Password = [Magang] + [year] + [!@#$%^&* random symbol] + [4 random alphanumeric]
// ============================================================
export function generateInternCredentials(name: string): { username: string; password: string } {
  const firstLetter = name.trim().charAt(0).toUpperCase();
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // skip I, L, O, 0, 1 (avoid confusion)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  const username = `${firstLetter}${code}`;

  // Password: Magang + year + symbol + 4 alphanum
  const symbols = '!@#$%&*';
  const alphanum = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const year = new Date().getFullYear();
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  let tail = '';
  for (let i = 0; i < 4; i++) {
    tail += alphanum[Math.floor(Math.random() * alphanum.length)];
  }
  const password = `Magang${year}${symbol}${tail}`;
  return { username, password };
}

// ============================================================
// JWT Tokens
// ============================================================
export interface AdminTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  type: 'admin';
}

export interface InternTokenPayload {
  sub: string;
  intern_id: string;
  name: string;
  username: string;
  department: string;
  type: 'intern';
}

export interface BKKTokenPayload {
  sub: string;
  teacher_id: string;
  email: string;
  name: string;
  // Schools this teacher can supervise (array of school names for filtering interns)
  schools: string[];
  type: 'bkk';
}

export interface PembinaTokenPayload {
  sub: string;
  pembina_id: string; // UUID
  pembina_code: string; // PB-XXXX
  email: string;
  name: string;
  department: string;
  type: 'pembina';
}

export function signAdminToken(payload: Omit<AdminTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

export function signInternToken(payload: Omit<InternTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'intern' }, JWT_SECRET, { expiresIn: '7d' });
}

export function signBKKToken(payload: Omit<BKKTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'bkk' }, JWT_SECRET, { expiresIn: '7d' });
}

export function signPembinaToken(payload: Omit<PembinaTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'pembina' }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken<T = AdminTokenPayload | InternTokenPayload | BKKTokenPayload | PembinaTokenPayload>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch {
    return null;
  }
}

// ============================================================
// Cookie helpers (server-side only)
// ============================================================
export async function setAdminCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 // 24h
  });
}

export async function setInternCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(INTERN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7d
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function clearInternCookie(): Promise<void> {
  const store = await cookies();
  store.delete(INTERN_COOKIE);
}

export async function setBKKCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(BKK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7d
  });
}

export async function clearBKKCookie(): Promise<void> {
  const store = await cookies();
  store.delete(BKK_COOKIE);
}

export async function setPembinaCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(PEMBINA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7d
  });
}

export async function clearPembinaCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PEMBINA_COOKIE);
}

export async function getAdminToken(): Promise<AdminTokenPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken<AdminTokenPayload>(token);
  if (!payload || payload.type !== 'admin') return null;
  return payload;
}

export async function getInternToken(): Promise<InternTokenPayload | null> {
  const store = await cookies();
  const token = store.get(INTERN_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken<InternTokenPayload>(token);
  if (!payload || payload.type !== 'intern') return null;
  return payload;
}

export async function getBKKToken(): Promise<BKKTokenPayload | null> {
  const store = await cookies();
  const token = store.get(BKK_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken<BKKTokenPayload>(token);
  if (!payload || payload.type !== 'bkk') return null;

  // P1-8: Cek is_active di DB — BKK yang di-archive harus kehilangan akses meski JWT masih valid
  // (mencegah BKK yang sudah di-nonaktifkan tetap bisa akses sampai JWT expire 7 hari)
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('bkk_teachers')
      .select('is_active')
      .eq('id', payload.teacher_id)
      .maybeSingle();
    if (!data || !data.is_active) return null;
  } catch {
    // DB error jangan block login (fail-open) — supabase down tidak harus logout semua BKK
  }
  return payload;
}

export async function getPembinaToken(): Promise<PembinaTokenPayload | null> {
  const store = await cookies();
  const token = store.get(PEMBINA_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken<PembinaTokenPayload>(token);
  if (!payload || payload.type !== 'pembina') return null;

  // P1-8: Cek is_active di DB — pembina yang di-archive harus kehilangan akses meski JWT masih valid
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('pembina_magang')
      .select('is_active')
      .eq('id', payload.pembina_id)
      .maybeSingle();
    if (!data || !data.is_active) return null;
  } catch {
    // DB error jangan block login (fail-open)
  }
  return payload;
}

// ============================================================
// Client-side auth helpers (for browser)
// ============================================================
export const CLIENT_ADMIN_COOKIE = 'magang_admin_token';
export const CLIENT_INTERN_COOKIE = 'magang_intern_token';
export const CLIENT_BKK_COOKIE = 'magang_bkk_token';
export const CLIENT_PEMBINA_COOKIE = 'magang_pembina_token';

export function getClientToken(type: 'admin' | 'intern' | 'bkk' | 'pembina'): string | null {
  if (typeof document === 'undefined') return null;
  const name = type === 'admin' ? CLIENT_ADMIN_COOKIE
    : type === 'intern' ? CLIENT_INTERN_COOKIE
    : type === 'bkk' ? CLIENT_BKK_COOKIE
    : CLIENT_PEMBINA_COOKIE;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export function getClientInternToken(): InternTokenPayload | null {
  const token = getClientToken('intern');
  if (!token) return null;
  return verifyToken<InternTokenPayload>(token);
}

export function getClientAdminToken(): AdminTokenPayload | null {
  const token = getClientToken('admin');
  if (!token) return null;
  return verifyToken<AdminTokenPayload>(token);
}
