import { existsSync, readFileSync } from 'node:fs';

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
const get = (key) => (process.env[key] || envFile[key] || '').trim();
const errors = [];

const databaseUrl = get('DATABASE_URL');
const sessionSecret = get('SESSION_SECRET');
const adminEmail = get('ADMIN_EMAIL');
const adminPassword = get('ADMIN_PASSWORD');
const operationalEmail = get('OPERATIONAL_EMAIL');
const operationalPassword = get('OPERATIONAL_PASSWORD');

if (!databaseUrl) {
  errors.push('DATABASE_URL nao definido. Configure um PostgreSQL na hospedagem.');
} else if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  errors.push('DATABASE_URL da hospedagem precisa ser PostgreSQL. Valor atual nao comeca com postgresql:// ou postgres://.');
}

if (!sessionSecret || sessionSecret.length < 32) {
  errors.push('SESSION_SECRET precisa ter pelo menos 32 caracteres. Gere com: npm run secret:generate');
}

if (!adminEmail || !adminEmail.includes('@')) {
  errors.push('ADMIN_EMAIL invalido ou vazio.');
}

if (!adminPassword || adminPassword.length < 8) {
  errors.push('ADMIN_PASSWORD precisa ter pelo menos 8 caracteres na hospedagem.');
}

if (!operationalEmail || !operationalEmail.includes('@')) {
  errors.push('OPERATIONAL_EMAIL invalido ou vazio.');
}

if (!operationalPassword || operationalPassword.length < 8) {
  errors.push('OPERATIONAL_PASSWORD precisa ter pelo menos 8 caracteres na hospedagem.');
}

if (errors.length > 0) {
  console.error('\nFalha na validacao das variaveis de hospedagem:\n');
  for (const error of errors) console.error(`- ${error}`);
  console.error('\nUse .env.production.example como modelo.\n');
  process.exit(1);
}

console.log('Variaveis de hospedagem validadas.');
