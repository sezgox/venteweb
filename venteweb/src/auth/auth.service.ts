import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, DecodedIdToken, getAuth } from 'firebase-admin/auth';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { firebaseAdminAppName, firebaseAdminConfig } from 'src/core/consts/firebase-config.const';
import { jwtConfig, mobileJwtConfig, refreshTokenConfig } from 'src/core/consts/jwt-config.const';
import { UserRepository } from 'src/user/user.repository';
import { UserLoginDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
  ) {}

  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  async login(userLoginDto: UserLoginDto) {
    const uniqueInput = userLoginDto.username ? { username: userLoginDto.username } : { email: userLoginDto.email };
    const userData = await this.userRepository.findByUniqueInput(uniqueInput);
    if (!userData) {
      throw new BadRequestException('User not found');
    }

    const passwordIsCorrect = await bcrypt.compare(userLoginDto.password, userData.password);
    if (!passwordIsCorrect) {
      throw new UnauthorizedException('Incorrect password');
    }

    const access_token = await this.createJwtToken(userData);
    const refresh_token = await this.createRefreshToken(userData.id);
    await this.saveLogin(userData.id, refresh_token, new Date());
    return { userData, access_token, refresh_token };
  }

  async loginWithMobileFirebase(idToken: string) {
    const decodedToken = await this.verifyFirebaseIdToken(idToken);
    const user = await this.findOrCreateFirebaseUser(decodedToken);
    await this.userRepository.updateLastLogin(user.id, new Date());
    const access_token = await this.createMobileJwtToken(user);
    return { userData: user, access_token };
  }

  async saveLogin(userId: string, refreshToken: string, lastLogin?: Date) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    return await this.userRepository.login(userId, hashedRefreshToken, lastLogin);
  }

  logout(userId: string) {
    this.userRepository.logout(userId).catch((err) => {
      console.error('Failed to clear refresh token for user', userId, err);
    });
  }

  async refreshToken(refreshToken: string) {
    const decoded = await this.jwtService.verifyAsync(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const user = await this.userRepository.findOne(decoded.sub);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('User not found or no refresh token stored');
    }

    const validRefreshToken = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!validRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const access_token = await this.createJwtToken(user);
    const rotatedRefreshToken = await this.createRefreshToken(user.id);
    await this.saveLogin(user.id, rotatedRefreshToken);
    return { user, access_token, rotatedRefreshToken };
  }

  private getTokenPayload(userData: any) {
    return {
      sub: userData.id,
      permission: userData.permission,
      level: userData.level,
      email: userData.email,
      photo: userData.photo,
      username: userData.username,
      name: userData.name,
      locale: userData.locale,
      bio: userData.bio,
    };
  }

  async createJwtToken(userData: any) {
    const payload = this.getTokenPayload(userData);
    return await this.jwtService.signAsync(payload, jwtConfig);
  }

  async createMobileJwtToken(userData: any) {
    const payload = { ...this.getTokenPayload(userData), authSource: 'mobile' };
    return await this.jwtService.signAsync(payload, mobileJwtConfig);
  }

  async createRefreshToken(userId: string) {
    return this.jwtService.signAsync({ sub: userId }, refreshTokenConfig);
  }

  async loginWithGoogle(tokenId: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, locale } = payload;

    let user = await this.userRepository.findByUniqueInput({ email });
    if (!user) {
      user = await this.userRepository.create({
        name,
        username: `user${googleId}`,
        email,
        password: null,
        locale,
      });
    }

    const access_token = await this.createJwtToken(user);
    const refresh_token = await this.createRefreshToken(user.id);
    await this.saveLogin(user.id, refresh_token, new Date());

    return { userData: user, access_token, refresh_token };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private getFirebaseAuthClient(): Auth {
    const { projectId, clientEmail, privateKey } = firebaseAdminConfig;
    if (!projectId || !clientEmail || !privateKey) {
      throw new BadRequestException('Firebase Admin credentials are not configured');
    }

    const app =
      getApps().find((existingApp) => existingApp.name === firebaseAdminAppName) ??
      initializeApp(
        {
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
        },
        firebaseAdminAppName,
      );

    return getAuth(app);
  }

  private async verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!idToken?.trim()) {
      throw new BadRequestException('Firebase idToken is required');
    }

    try {
      return await this.getFirebaseAuthClient().verifyIdToken(idToken);
    } catch (err){
      throw new UnauthorizedException('Invalid Firebase id token: ' + err.message);
    }
  }

  private async findOrCreateFirebaseUser(decodedToken: DecodedIdToken) {
    const firebaseUid = decodedToken.uid?.trim();
    if (!firebaseUid) {
      throw new UnauthorizedException('Firebase token does not contain a valid uid');
    }

    const email = decodedToken.email?.toLowerCase().trim() || `${firebaseUid.toLowerCase()}@mobile.firebase.local`;
    let user = await this.userRepository.findByUniqueInput({ email });
    if (user) {
      return user;
    }

    const baseUsername = this.normalizeMobileUsername(`m_${firebaseUid}`);
    user = await this.userRepository.findByUsername(baseUsername);
    if (user) {
      return user;
    }

    const username = await this.ensureUniqueUsername(baseUsername);
    return this.userRepository.create({
      name: this.buildMobileDisplayName(decodedToken),
      username,
      email,
      password: null,
      locale:
        typeof decodedToken.firebase?.sign_in_provider === 'string'
          ? decodedToken.firebase.sign_in_provider
          : undefined,
    });
  }

  private normalizeMobileUsername(rawValue: string): string {
    const sanitized = rawValue.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const truncated = (sanitized || 'm_user').slice(0, 20);

    if (truncated.length >= 3) {
      return truncated;
    }

    return `${truncated}usr`.slice(0, 20);
  }

  private async ensureUniqueUsername(baseUsername: string): Promise<string> {
    let candidate = baseUsername;
    let counter = 1;

    while (await this.userRepository.findByUsername(candidate)) {
      const suffix = `_${counter}`;
      candidate = `${baseUsername.slice(0, 20 - suffix.length)}${suffix}`;
      counter += 1;
    }

    return candidate;
  }

  private buildMobileDisplayName(decodedToken: DecodedIdToken): string {
    const tokenName = decodedToken.name?.trim();
    if (tokenName) {
      return tokenName;
    }

    const tokenEmail = decodedToken.email?.trim();
    if (tokenEmail) {
      return tokenEmail.split('@')[0];
    }

    return 'Mobile user';
  }
}
