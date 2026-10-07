import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  DATABASE_URL: required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/inventory'),
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY ?? '7d',

  COOKIE_SECRET: process.env.COOKIE_SECRET ?? 'dev-cookie-secret',

  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? 'no-reply@inventory.io',

  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',

  UPLOAD_DIR: process.env.UPLOAD_DIR ?? 'uploads',
};
