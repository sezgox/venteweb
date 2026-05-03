import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService activation gate', () => {
  let service: AuthService;
  let userRepository: {
    findByUniqueInput: jest.Mock;
    findOne: jest.Mock;
    activate: jest.Mock;
    login: jest.Mock;
    updateEmailSent: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let activationTokens: {
    revokePendingForUser: jest.Mock;
    createRawToken: jest.Mock;
    hashToken: jest.Mock;
    activationExpiresAt: jest.Mock;
    createPending: jest.Mock;
    deleteById: jest.Mock;
    consumeAndActivate: jest.Mock;
  };
  let activationMail: { sendActivationEmail: jest.Mock };

  beforeEach(() => {
    userRepository = {
      findByUniqueInput: jest.fn(),
      findOne: jest.fn(),
      activate: jest.fn(),
      login: jest.fn(),
      updateEmailSent: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    };
    activationTokens = {
      revokePendingForUser: jest.fn(),
      createRawToken: jest.fn(),
      hashToken: jest.fn(),
      activationExpiresAt: jest.fn(),
      createPending: jest.fn(),
      deleteById: jest.fn(),
      consumeAndActivate: jest.fn(),
    };
    activationMail = { sendActivationEmail: jest.fn() };
    service = new AuthService(
      userRepository as any,
      jwtService as unknown as JwtService,
      activationTokens as any,
      activationMail as any,
    );
  });

  it('blocks password login when account is inactive (no Firebase activation)', async () => {
    const password = await bcrypt.hash('password123', 10);
    userRepository.findByUniqueInput.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      username: 'newuser',
      name: 'New User',
      password,
      active: false,
      emailSent: false,
    });

    await expect(
      service.login({
        email: 'new@example.com',
        username: undefined,
        password: 'password123',
      } as any),
    ).rejects.toMatchObject({
      activationRequired: true,
      emailSent: false,
    });
  });

  it('allows password login when account is active', async () => {
    const password = await bcrypt.hash('password123', 10);
    const activeUser = {
      id: 'user-1',
      email: 'new@example.com',
      username: 'newuser',
      name: 'New User',
      password,
      active: true,
      emailSent: true,
    };
    userRepository.findByUniqueInput.mockResolvedValue(activeUser);
    userRepository.login.mockResolvedValue(activeUser);

    const result = await service.login({
      email: 'new@example.com',
      username: undefined,
      password: 'password123',
    } as any);

    expect(userRepository.activate).not.toHaveBeenCalled();
    expect(result.userData.active).toBe(true);
    expect(result.access_token).toBe('signed-token');
  });

  it('blocks inactive refresh tokens', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      refreshToken: 'hash',
      active: false,
    });

    await expect(service.refreshToken('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
