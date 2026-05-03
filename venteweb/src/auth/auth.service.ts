import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, DecodedIdToken, getAuth } from 'firebase-admin/auth';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import {
  firebaseAdminAppName,
  firebaseAdminConfig,
} from 'src/core/consts/firebase-config.const';
import {
  jwtConfig,
  mobileJwtConfig,
  refreshTokenConfig,
} from 'src/core/consts/jwt-config.const';
import { resendConfig } from 'src/core/consts/resend-config.const';
import { UserRepository } from 'src/user/user.repository';
import { ActivationMailService } from './activation-mail.service';
import { ActivationTokenRepository } from './activation-token.repository';
import { UserLoginDto } from './dto/login-user.dto';
import { ConfirmActivationDto } from './dto/confirm-activation.dto';
import { RequestActivationEmailDto } from './dto/request-activation-email.dto';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private activationTokens: ActivationTokenRepository,
    private activationMail: ActivationMailService,
  ) {}

  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  async login(userLoginDto: UserLoginDto) {
    const uniqueInput = userLoginDto.username
      ? { username: userLoginDto.username }
      : { email: userLoginDto.email };
    const userData = await this.userRepository.findByUniqueInput(uniqueInput);
    if (!userData) {
      throw new BadRequestException('User not found');
    }
    if (!userData.password) {
      throw new UnauthorizedException('Use a social login provider for this account');
    }

    const passwordIsCorrect = await bcrypt.compare(
      userLoginDto.password,
      userData.password,
    );
    if (!passwordIsCorrect) {
      throw new UnauthorizedException('Incorrect password');
    }

    const activeUser = await this.ensurePasswordUserIsActive(userData);

    const access_token = await this.createJwtToken(activeUser);
    const refresh_token = await this.createRefreshToken(activeUser.id);
    await this.saveLogin(activeUser.id, refresh_token, new Date());
    return { userData: activeUser, access_token, refresh_token };
  }

  async loginWithMobileFirebase(idToken: string) {
    const decodedToken = await this.verifyFirebaseIdToken(idToken);
    const user = await this.findOrCreateFirebaseUser(decodedToken);
    if (!user.active) {
      this.throwActivationRequired(user.emailSent, user.email);
    }
    await this.userRepository.updateLastLogin(user.id, new Date());
    const access_token = await this.createMobileJwtToken(user);
    return { userData: user, access_token };
  }

  /**
   * Creates a one-time activation token (7d), sends the link via Resend, sets emailSent on success.
   */
  async requestActivationEmail(dto: RequestActivationEmailDto): Promise<void> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findByUniqueInput({
      email: normalizedEmail,
    });
    if (!user?.password) {
      throw new BadRequestException('User not found');
    }
    const passwordIsCorrect = await bcrypt.compare(dto.password, user.password);
    if (!passwordIsCorrect) {
      throw new UnauthorizedException('Incorrect password');
    }
    if (user.active) {
      throw new BadRequestException('Account is already active');
    }

    await this.activationTokens.revokePendingForUser(user.id);

    const rawToken = this.activationTokens.createRawToken();
    const tokenHash = this.activationTokens.hashToken(rawToken);
    const expiresAt = this.activationTokens.activationExpiresAt();

    const { id: tokenRowId } = await this.activationTokens.createPending(
      user.id,
      tokenHash,
      expiresAt,
    );

    const webActivationUrl = this.buildActivationWebUrl(rawToken);

    try {
      await this.activationMail.sendActivationEmail({
        to: user.email,
        recipientName: user.name?.trim() || user.username,
        webActivationUrl,
      });
    } catch (err) {
      await this.activationTokens.deleteById(tokenRowId);
      throw err;
    }

    await this.userRepository.updateEmailSent(user.id, true);
  }

  async confirmActivation(dto: ConfirmActivationDto): Promise<void> {
    const raw = dto.token?.trim();
    if (!raw) {
      throw new BadRequestException('Activation token is required');
    }

    const tokenHash = this.activationTokens.hashToken(raw);
    const result = await this.activationTokens.consumeAndActivate(tokenHash);

    if (result.ok === false) {
      if (result.reason === 'used') {
        throw new BadRequestException(
          'This activation link was already used',
        );
      }
      if (result.reason === 'expired') {
        throw new BadRequestException('This activation link has expired');
      }
      throw new BadRequestException('Invalid activation link');
    }
  }

  private buildActivationWebUrl(rawToken: string): string {
    const q = `token=${encodeURIComponent(rawToken)}`;
    const webBase = resendConfig.activationPublicWebOrigin.replace(/\/+$/, '');
    return `${webBase}/validate-account?${q}`;
  }

  async saveLogin(userId: string, refreshToken: string, lastLogin?: Date) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    return await this.userRepository.login(
      userId,
      hashedRefreshToken,
      lastLogin,
    );
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
      throw new UnauthorizedException(
        'User not found or no refresh token stored',
      );
    }
    if (!user.active) {
      this.throwActivationRequired();
    }

    const validRefreshToken = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
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
      active: userData.active,
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
        active: false,
        activatedAt: null,
        emailSent: false,
        locale: this.normalizeSupportedLocale(locale),
      });
    }

    if (!user.active) {
      this.throwActivationRequired(user.emailSent, user.email);
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

  /** Used only to verify Firebase ID tokens from the mobile Google Sign-In SDK (not for email activation). */
  private getFirebaseAuthClient(): Auth {
    const { projectId, clientEmail, privateKey } = firebaseAdminConfig;
    if (!projectId || !clientEmail || !privateKey) {
      throw new BadRequestException(
        'Firebase Admin credentials are not configured',
      );
    }

    const app =
      getApps().find(
        (existingApp) => existingApp.name === firebaseAdminAppName,
      ) ??
      initializeApp(
        {
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
        },
        firebaseAdminAppName,
      );

    return getAuth(app);
  }

  private async verifyFirebaseIdToken(
    idToken: string,
  ): Promise<DecodedIdToken> {
    if (!idToken?.trim()) {
      throw new BadRequestException('Firebase idToken is required');
    }

    try {
      return await this.getFirebaseAuthClient().verifyIdToken(idToken);
    } catch (err) {
      throw new UnauthorizedException(
        'Invalid Firebase id token: ' + err.message,
      );
    }
  }

  private async ensurePasswordUserIsActive(userData: any) {
    if (userData.active) {
      return userData;
    }

    this.throwActivationRequired(userData.emailSent, userData.email);
  }

  private throwActivationRequired(
    emailSent?: boolean,
    activationEmail?: string,
  ): never {
    const error = new UnauthorizedException(
      'Account activation is required before login',
    ) as UnauthorizedException & {
      activationRequired?: boolean;
      emailSent?: boolean;
      activationEmail?: string;
    };
    error.activationRequired = true;
    if (emailSent !== undefined) {
      error.emailSent = emailSent;
    }
    if (activationEmail !== undefined) {
      error.activationEmail = activationEmail;
    }
    throw error;
  }

  private async findOrCreateFirebaseUser(decodedToken: DecodedIdToken) {
    const firebaseUid = decodedToken.uid?.trim();
    if (!firebaseUid) {
      throw new UnauthorizedException(
        'Firebase token does not contain a valid uid',
      );
    }

    const email =
      decodedToken.email?.toLowerCase().trim() ||
      `${firebaseUid.toLowerCase()}@mobile.firebase.local`;
    let user = await this.userRepository.findByUniqueInput({ email });
    if (user) {
      if (!user.active) {
        this.throwActivationRequired(user.emailSent, user.email);
      }
      return user;
    }

    const baseUsername = this.normalizeMobileUsername(`m_${firebaseUid}`);
    user = await this.userRepository.findByUsername(baseUsername);
    if (user) {
      if (!user.active) {
        this.throwActivationRequired(user.emailSent, user.email);
      }
      return user;
    }

    const username = await this.ensureUniqueUsername(baseUsername);
    return this.userRepository.create({
      name: this.buildMobileDisplayName(decodedToken),
      username,
      email,
      password: null,
      active: false,
      activatedAt: null,
      firebaseUid: null,
      emailSent: false,
      locale: this.normalizeFirebaseLocale(decodedToken),
    });
  }

  private normalizeFirebaseLocale(
    decodedToken: DecodedIdToken,
  ): string | undefined {
    const candidates = [
      decodedToken.locale,
      decodedToken.firebase?.tenant,
      decodedToken.firebase?.identities?.['locale']?.[0],
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeSupportedLocale(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private normalizeSupportedLocale(locale: unknown): 'en' | 'es' | undefined {
    if (typeof locale !== 'string') {
      return undefined;
    }

    const normalized = locale.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }

    return normalized.startsWith('es') ? 'es' : 'en';
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
