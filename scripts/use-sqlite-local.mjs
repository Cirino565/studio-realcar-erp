import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const envPath = '.env';
const defaults = {
  DATABASE_URL: 'file:./dev.db',
  SESSION_SECRET: 'studio-realcar-local-session-secret-change-before-production-2026',
  ADMIN_EMAIL: 'admin@studiorealcar.com',
  ADMIN_PASSWORD: '123456',
  ADMIN_NAME: 'Administrador',
  ADMIN_RESET_PASSWORD: 'false',
  OPERATIONAL_EMAIL: 'operacional@studiorealcar.com',
  OPERATIONAL_PASSWORD: '123456',
  OPERATIONAL_NAME: 'Operacional',
  OPERATIONAL_RESET_PASSWORD: 'false',
};

function parseEnv(text) {
  const result = {};
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

const current = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
const finalEnv = { ...defaults, ...current, DATABASE_URL: 'file:./dev.db' };

const content = `# Ambiente local sem Docker, usando SQLite.\n# Para hospedagem/homologacao publica, use .env.production.example com PostgreSQL.\nDATABASE_URL="${finalEnv.DATABASE_URL}"\n\n# Gere outra chave com: npm run secret:generate\nSESSION_SECRET="${finalEnv.SESSION_SECRET}"\n\n# Administrador inicial criado pelo seed\nADMIN_EMAIL="${finalEnv.ADMIN_EMAIL}"\nADMIN_PASSWORD="${finalEnv.ADMIN_PASSWORD}"\nADMIN_NAME="${finalEnv.ADMIN_NAME}"\nADMIN_RESET_PASSWORD="${finalEnv.ADMIN_RESET_PASSWORD}"\n\n# Usuario operacional local criado pelo seed para testar agenda e clientes\nOPERATIONAL_EMAIL="${finalEnv.OPERATIONAL_EMAIL}"\nOPERATIONAL_PASSWORD="${finalEnv.OPERATIONAL_PASSWORD}"\nOPERATIONAL_NAME="${finalEnv.OPERATIONAL_NAME}"\nOPERATIONAL_RESET_PASSWORD="${finalEnv.OPERATIONAL_RESET_PASSWORD}"\n`;

writeFileSync(envPath, content);
console.log('✅ .env local configurado para SQLite: DATABASE_URL="file:./dev.db"');
