import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Auth } from './entities/auth.entity';
import { LoginDto } from './dtos/auth/login.dto';
import type { JwtUser } from './decorators/current-user.decorator';
import { comparePassword } from '@/common/utils/password';

export interface LoginResult {
  accessToken: string;
  user: {
    id: number;
    email: string;
    personId: number;
    roles: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const auth = await this.authRepository.findOne({
      where: { email: dto.email },
      relations: { person: { roles: true } },
    });

    if (!auth || auth.google || !auth.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await comparePassword(dto.password, auth.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const roles = (auth.person?.roles ?? []).map((r) => r.name);
    const payload: JwtUser = {
      sub: auth.id,
      personId: auth.personId,
      email: auth.email,
      roles,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user: {
        id: auth.id,
        email: auth.email,
        personId: auth.personId,
        roles,
      },
    };
  }
}
