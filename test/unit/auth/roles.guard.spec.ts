import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../src/modules/auth/guards/roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  function makeContext(
    handlerMeta: unknown,
    classMeta: unknown,
    user?: unknown,
  ) {
    const request = { user };
    return {
      getHandler: () => ({ constructor: { __proto__: {} } }),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as Parameters<RolesGuard['canActivate']>[0];
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows when route has no roles metadata (authenticated only)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = makeContext(undefined, undefined, {
      roles: ['CLIENTE'],
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows when user has a required role', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['ADMINISTRADOR']);
    const ctx = makeContext(undefined, undefined, {
      roles: ['ADMINISTRADOR', 'CLIENTE'],
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user lacks the required role', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['ADMINISTRADOR']);
    const ctx = makeContext(undefined, undefined, {
      roles: ['CLIENTE'],
    });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws UnauthorizedException when user is not authenticated', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['ADMINISTRADOR']);
    const ctx = makeContext(undefined, undefined, undefined);

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('allows public routes even with roles metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = makeContext(undefined, undefined, undefined);

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
