import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const createContext = (user: unknown) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  it('rejects inactive JWT payloads', async () => {
    const guard = new AuthGuard({} as any);

    await expect(
      guard.canActivate(createContext({ sub: 'user-1', active: false })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows active JWT payloads', async () => {
    const guard = new AuthGuard({} as any);

    await expect(
      guard.canActivate(createContext({ sub: 'user-1', active: true })),
    ).resolves.toBe(true);
  });
});
