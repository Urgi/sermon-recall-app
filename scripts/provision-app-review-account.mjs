#!/usr/bin/env node
/**
 * Create / refresh the App Store review member on hosted Supabase.
 * Run: node mobile/scripts/provision-app-review-account.mjs
 * (Uses site/node_modules and site/.env.)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, '../../site');
const require = createRequire(resolve(siteRoot, 'package.json'));

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(resolve(siteRoot, '.env'));

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const REVIEW_EMAIL = 'apple-review@sermonrecall.com';
const REVIEW_CODE = '482719';
const CHURCH_CODE = 'GRACE001';
const FULL_NAME = 'App Store Reviewer';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in site/.env');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
const existing = list?.users?.find((u) => u.email?.toLowerCase() === REVIEW_EMAIL);

let userId = existing?.id;

if (existing) {
  const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
    password: REVIEW_CODE,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME },
  });
  if (error) {
    console.error('updateUser:', error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log('Updated existing review user:', REVIEW_EMAIL);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: REVIEW_EMAIL,
    password: REVIEW_CODE,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME },
  });
  if (error) {
    console.error('createUser:', error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log('Created review user:', REVIEW_EMAIL);
}

const { data: church, error: churchErr } = await admin
  .from('churches')
  .select('id, name')
  .eq('church_code', CHURCH_CODE)
  .maybeSingle();

if (churchErr || !church) {
  console.error('Church not found:', CHURCH_CODE, churchErr?.message);
  process.exit(1);
}

const { error: profileErr } = await admin.from('users').upsert(
  {
    id: userId,
    full_name: FULL_NAME,
    church_id: church.id,
    role: 'member',
    preferred_language: 'en',
  },
  { onConflict: 'id' },
);

if (profileErr) {
  console.error('profile upsert:', profileErr.message);
  process.exit(1);
}

console.log('Joined church:', church.name, `(${CHURCH_CODE})`);
console.log('');
console.log('App Review credentials:');
console.log('  Email:', REVIEW_EMAIL);
console.log('  Code: ', REVIEW_CODE);
console.log('');
console.log('Set on EAS production + mobile/.env:');
console.log(`  EXPO_PUBLIC_APP_REVIEW_EMAIL=${REVIEW_EMAIL}`);
console.log(`  EXPO_PUBLIC_APP_REVIEW_CODE=${REVIEW_CODE}`);
