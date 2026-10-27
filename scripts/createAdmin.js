// scripts/createAdmin.js
// Create the first admin user
// Usage: node scripts/createAdmin.js

import { readFileSync } from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
try {
  const envFile = readFileSync(path.join(__dirname, '../.env'), 'utf8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.substring(0, eq).trim();
    const value = trimmed.substring(eq + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = value;
  });
} catch { /* ignore */ }

import { findOne, appendRow, readSheet } from '../api/lib/sheets.js';
import { hashPassword } from '../api/lib/auth.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
  return new Promise((res) => rl.question(q, res));
}

async function main() {
  console.log('\n👤 4N Planet — Create First Administrator');
  console.log('═'.repeat(50));

  const existing = await readSheet('Users');
  const existingAdmins = existing.filter((u) => u.role === 'admin');
  if (existingAdmins.length > 0) {
    console.log(`\n⚠️  Admin user already exists: ${existingAdmins[0].email}`);
    const confirm = await ask('Create another admin anyway? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      rl.close();
      return;
    }
  }

  const name = await ask('Full name: ');
  const email = await ask('Email address: ');
  const password = await ask('Password (min 8 chars): ');

  if (!name || !email || !password) {
    console.error('All fields are required.');
    rl.close();
    return;
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    rl.close();
    return;
  }

  const existing_user = await findOne('Users', 'email', email.toLowerCase());
  if (existing_user) {
    console.error(`\n❌ Email already exists: ${email}`);
    rl.close();
    return;
  }

  const user_id = `USR-${String(existing.length + 1).padStart(6, '0')}`;
  const now = new Date().toISOString();

  await appendRow('Users', {
    user_id,
    name,
    email: email.toLowerCase(),
    password_hash: hashPassword(password),
    role: 'admin',
    is_active: 'true',
    phone: '',
    created_at: now,
    updated_at: now,
    last_login: '',
  });

  console.log(`\n✅ Admin created successfully!`);
  console.log(`   Name: ${name}`);
  console.log(`   Email: ${email}`);
  console.log(`   Role: admin`);
  console.log(`\nYou can now log in at: ${process.env.APP_URL || 'http://localhost:5173'}\n`);

  rl.close();
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  rl.close();
  process.exit(1);
});
