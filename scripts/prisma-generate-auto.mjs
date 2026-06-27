import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const result = {};
  const text = readFileSync(path, 'utf8');

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

const envFile = parseEnvFile('.env');
const databaseUrl = process.env.DATABASE_URL || envFile.DATABASE_URL || 'file:./dev.db';
const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
const schema = isPostgres ? 'prisma/schema.prisma' : 'prisma/schema.sqlite.prisma';

console.log(`Prisma generate automatico: ${isPostgres ? 'PostgreSQL/hospedagem' : 'SQLite/local'} (${schema})`);

const result = spawnSync('prisma', ['generate', `--schema=${schema}`], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
  },
});

process.exit(result.status ?? 1);
