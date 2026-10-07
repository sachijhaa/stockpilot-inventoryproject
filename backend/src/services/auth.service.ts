import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';
import { sendMail, passwordResetTemplate } from './mailer.service';
import { env } from '../config/env';
import { Role } from '@prisma/client';

interface SignupInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
  warehouseId?: string;
}

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role ?? Role.VIEWER,
      warehouseId: input.warehouseId,
    },
  });

  return issueTokens(user.id, user.role, user.warehouseId);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Contact an administrator.');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const tokens = await issueTokens(user.id, user.role, user.warehouseId);
  return {
    ...tokens,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, warehouseId: user.warehouseId },
  };
}

async function issueTokens(userId: string, role: Role, warehouseId?: string | null) {
  const accessToken = signAccessToken({ userId, role, warehouseId });
  const refreshToken = signRefreshToken({ userId });
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } });

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.refreshTokenHash) {
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!matches) {
    throw ApiError.unauthorized('Session invalid, please log in again');
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role, warehouseId: user.warehouseId });
  return { accessToken };
}

export async function logout(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond success to avoid user enumeration, but only send email if user exists.
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.user.update({ where: { id: user.id }, data: { resetTokenHash, resetTokenExpiry } });

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
  await sendMail(user.email, 'Reset your password', passwordResetTemplate(user.name, resetUrl));
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await prisma.user.findFirst({
    where: { resetTokenHash, resetTokenExpiry: { gt: new Date() } },
  });

  if (!user) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetTokenHash: null, resetTokenExpiry: null, refreshTokenHash: null },
  });
}
