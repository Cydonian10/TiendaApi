import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Person } from '../entities/person.entity';
import { Role } from '@/modules/roles/entities/role.entity';
import { PersonDto } from '../dtos/person/person.dto';
import { CreatePersonDto } from '../dtos/person/create-person.dto';
import { UpdatePersonDto } from '../dtos/person/update-person.dto';
import { FilterPersonDto } from '../dtos/person/filter-person.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import { UnitOfWork } from '@/database/unitOfWork';
import { isUniqueViolation } from '@/common/utils/pg-errors';

@Injectable()
export class PeopleService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(dto: CreatePersonDto): Promise<PersonDto> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const roles = await this.loadRolesOrThrow(manager, dto.roleIds);

      const person = manager.create(Person, {
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: dto.birthDate,
        address: dto.address,
        dni: dto.dni,
        roles,
      });

      let saved: Person;
      try {
        saved = await manager.save(person);
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new ConflictException(
            `Ya existe una persona con el dni "${dto.dni}"`,
          );
        }
        throw e;
      }

      return this.loadPersonDto(manager, saved.id);
    });
  }

  async findAll(filter: FilterPersonDto): Promise<PaginatedResult<PersonDto>> {
    const qb = this.personRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.roles', 'r')
      .orderBy('p.id', 'ASC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit);

    if (filter.roleName) {
      qb.andWhere('r.name = :roleName', { roleName: filter.roleName });
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((p) => PersonDto.fromEntity(p)),
      total,
      page: filter.page,
      limit: filter.limit,
      lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: number): Promise<PersonDto> {
    const person = await this.personRepository.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!person) {
      throw new NotFoundException(`Person ${id} no encontrada`);
    }
    return PersonDto.fromEntity(person);
  }

  async update(id: number, dto: UpdatePersonDto): Promise<PersonDto> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const person = await manager.findOne(Person, {
        where: { id },
        relations: { roles: true },
      });
      if (!person) {
        throw new NotFoundException(`Person ${id} no encontrada`);
      }

      if (dto.firstName !== undefined) {
        person.firstName = dto.firstName;
      }
      if (dto.lastName !== undefined) {
        person.lastName = dto.lastName;
      }
      if (dto.birthDate !== undefined) {
        person.birthDate = dto.birthDate;
      }
      if (dto.address !== undefined) {
        person.address = dto.address;
      }
      if (dto.dni !== undefined) {
        person.dni = dto.dni;
      }

      if (dto.roleIds !== undefined) {
        person.roles = await this.loadRolesOrThrow(manager, dto.roleIds);
      }

      try {
        await manager.save(person);
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new ConflictException(
            `Ya existe una persona con el dni "${dto.dni ?? person.dni}"`,
          );
        }
        throw e;
      }

      return this.loadPersonDto(manager, id);
    });
  }

  async remove(id: number): Promise<void> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const person = await manager.findOne(Person, { where: { id } });
      if (!person) {
        throw new NotFoundException(`Person ${id} no encontrada`);
      }
      await manager.softRemove(person);
    });
  }

  private async loadRolesOrThrow(
    manager: EntityManager,
    ids: number[] | undefined,
  ): Promise<Role[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    const roles = await manager.find(Role, { where: { id: In(ids) } });
    if (roles.length !== ids.length) {
      const found = new Set(roles.map((r) => r.id));
      const missing = ids.find((id) => !found.has(id));
      throw new NotFoundException(`Role ${missing} no encontrado`);
    }
    return roles;
  }

  private async loadPersonDto(
    manager: EntityManager,
    id: number,
  ): Promise<PersonDto> {
    const person = await manager.findOne(Person, {
      where: { id },
      relations: { roles: true },
    });
    if (!person) {
      throw new NotFoundException(`Person ${id} no encontrada`);
    }
    return PersonDto.fromEntity(person);
  }
}
