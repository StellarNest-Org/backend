import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwt: JwtService;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as JwtService;
    service = new AuthService(prisma as unknown as PrismaService, jwt);
  });

  it('rejects sign up when the email is already registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@family.com' });
    await expect(service.signUp('a@family.com', 'password123', 'Ada')).rejects.toThrow(
      ConflictException,
    );
  });

  it('creates a new user with a hashed password on sign up', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 'u1', ...data }));

    const result = await service.signUp('a@family.com', 'password123', 'Ada');

    expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    const createdData = prisma.user.create.mock.calls[0][0].data;
    expect(createdData.passwordHash).not.toBe('password123');
    expect(await bcrypt.compare('password123', createdData.passwordHash)).toBe(true);
  });

  it('rejects sign in with a wrong password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@family.com', passwordHash });

    await expect(service.signIn('a@family.com', 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('issues a token on sign in with the correct password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@family.com', passwordHash });

    const result = await service.signIn('a@family.com', 'correct-password');
    expect(result).toEqual({ accessToken: 'signed.jwt.token' });
  });
});
