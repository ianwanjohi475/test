import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { pool, q, one } from './index.js';

const here = dirname(fileURLToPath(import.meta.url));

export async function migrate(): Promise<void> {
  const schema = readFileSync(join(here, 'schema.sql'), 'utf8');
  await pool.query(schema);

  // Seed the first admin (ext 100) and Zuri's virtual extension on a fresh DB.
  const existing = await one('SELECT id FROM users LIMIT 1');
  if (!existing) {
    const adminPass = process.env.ADMIN_PASSWORD ?? randomBytes(9).toString('base64url');
    await q(
      `INSERT INTO users (name, email, password_hash, role, extension, sip_password)
       VALUES ($1,$2,$3,'admin','100',$4)`,
      [
        process.env.ADMIN_NAME ?? 'Admin',
        process.env.ADMIN_EMAIL ?? 'admin@simupbx.local',
        await bcrypt.hash(adminPass, 10),
        randomBytes(18).toString('base64url'),
      ],
    );
    await q(
      `INSERT INTO settings (key, value) VALUES
       ('business_hours', '{"tz":"Africa/Nairobi","weekdays":"08:00-18:00","saturday":"09:00-13:00","sunday":"closed"}'),
       ('zuri', '{"enabled":true,"languages":["en","sw"],"screening":true,"after_hours_only":false}')
       ON CONFLICT (key) DO NOTHING`,
    );
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`Seeded admin login: ${process.env.ADMIN_EMAIL ?? 'admin@simupbx.local'} / ${adminPass}`);
    }
  }
}

// Allow `npm run db:migrate`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrate()
    .then(() => {
      console.log('Migration complete');
      return pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
