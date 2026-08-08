import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { RoleDto } from '../dtos/role/role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<RoleDto[]> {
    const roles = await this.roleRepository.find({ order: { id: 'ASC' } });
    return roles.map((role) => RoleDto.fromEntity(role));
  }
}
