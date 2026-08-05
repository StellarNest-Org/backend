import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signUp(email: string, password: string, displayName: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, displayName },
    });
    return this.issueToken(user.id, user.email);
  }

  async signIn(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueToken(user.id, user.email);
  }

  /** Links a Stellar public key (never a secret key) to the account for signature-based flows. */
  async linkStellarAddress(userId: string, stellarPublicKey: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { stellarPublicKey },
    });
  }

  private issueToken(sub: string, email: string) {
    const accessToken = this.jwt.sign({ sub, email });
    return { accessToken };
  }
}
