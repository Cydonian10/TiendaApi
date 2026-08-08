import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { Auth } from '../../../src/modules/auth/entities/auth.entity';
import { LoginDto } from '../../../src/modules/auth/dtos/auth/login.dto';

jest.mock('../../../src/common/utils/password', () => ({
  comparePassword: jest.fn(),
}));

import { comparePassword } from '../../../src/common/utils/password';

describe('AuthService', () => {
  let service: AuthService;
  let authRepo: { findOne: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  const mockedCompare = comparePassword as jest.Mock;

  beforeEach(async () => {
    authRepo = { findOne: jest.fn() };
    jwtService = { signAsync: jest.fn().mockResolvedValue('token') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Auth), useValue: authRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  function makeDto(email: string, password: string): LoginDto {
    const dto = new LoginDto();
    dto.email = email;
    dto.password = password;
    return dto;
  }

  const authEntity = {
    id: 1,
    email: 'admin@correo.com',
    password: 'hash',
    google: false,
    personId: 2,
    person: { roles: [{ id: 2, name: 'ADMINISTRADOR' }] },
  };

  it('returns accessToken and user on valid credentials', async () => {
    authRepo.findOne.mockResolvedValue(authEntity);
    mockedCompare.mockResolvedValue(true);

    const result = await service.login(makeDto('admin@correo.com', 'secret'));

    expect(authRepo.findOne).toHaveBeenCalledWith({
      where: { email: 'admin@correo.com' },
      relations: { person: { roles: true } },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 1,
      personId: 2,
      email: 'admin@correo.com',
      roles: ['ADMINISTRADOR'],
    });
    expect(result).toEqual({
      accessToken: 'token',
      user: {
        id: 1,
        email: 'admin@correo.com',
        personId: 2,
        roles: ['ADMINISTRADOR'],
      },
    });
  });

  it('throws UnauthorizedException when email does not exist', async () => {
    authRepo.findOne.mockResolvedValue(null);

    await expect(
      service.login(makeDto('nobody@correo.com', 'secret')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when password does not match', async () => {
    authRepo.findOne.mockResolvedValue(authEntity);
    mockedCompare.mockResolvedValue(false);

    await expect(
      service.login(makeDto('admin@correo.com', 'wrong')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException for google accounts (no password login)', async () => {
    authRepo.findOne.mockResolvedValue({
      ...authEntity,
      google: true,
      password: null,
    });

    await expect(
      service.login(makeDto('google@correo.com', 'secret')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
