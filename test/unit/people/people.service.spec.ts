/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                     @typescript-eslint/no-unsafe-return,
                     @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { PeopleService } from '../../../src/modules/people/services/people.service';
import { Person } from '../../../src/modules/people/entities/person.entity';
import { Auth } from '../../../src/modules/auth/entities/auth.entity';
import { CreatePersonDto } from '../../../src/modules/people/dtos/person/create-person.dto';
import { UpdatePersonDto } from '../../../src/modules/people/dtos/person/update-person.dto';
import { FilterPersonDto } from '../../../src/modules/people/dtos/person/filter-person.dto';
import { UnitOfWork } from '../../../src/database/unitOfWork';

jest.mock('../../../src/common/utils/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

function pgError(code: string) {
  const error = new Error(`pg error ${code}`) as Error & { code?: string };
  error.code = code;
  return error;
}

function makeDto(roleIds?: number[]): CreatePersonDto {
  const dto = new CreatePersonDto();
  dto.firstName = 'Juan';
  dto.lastName = 'Pérez';
  dto.birthDate = '1990-05-15';
  dto.address = 'Av. Los Clavos 123';
  dto.dni = '12345678';
  if (roleIds) {
    dto.roleIds = roleIds;
  }
  return dto;
}

const personEntity = {
  id: 1,
  firstName: 'Juan',
  lastName: 'Pérez',
  birthDate: '1990-05-15',
  address: 'Av. Los Clavos 123',
  dni: '12345678',
  roles: [],
  auth: null,
};

const personWithRole = {
  ...personEntity,
  roles: [{ id: 1, name: 'CLIENTE' }],
};

describe('PeopleService', () => {
  let service: PeopleService;
  let personRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
    softRemove: jest.Mock;
  };
  let queryRunner: Record<string, unknown>;

  function buildQueryRunnerStub() {
    return {
      manager: undefined as unknown,
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
  }

  function makeUnitOfWork(qr: unknown) {
    return {
      execute: jest.fn(
        async <T>(work: (q: QueryRunner) => Promise<T>): Promise<T> => {
          try {
            const result = await work(qr as QueryRunner);
            await (qr as { commitTransaction: jest.Mock }).commitTransaction();
            return result;
          } catch (e) {
            await (
              qr as { rollbackTransaction: jest.Mock }
            ).rollbackTransaction();
            throw e;
          } finally {
            await (qr as { release: jest.Mock }).release();
          }
        },
      ),
    } as unknown as UnitOfWork;
  }

  beforeEach(async () => {
    personRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      softRemove: jest.fn(),
    };
    queryRunner = buildQueryRunnerStub();

    const module = await Test.createTestingModule({
      providers: [
        PeopleService,
        { provide: getRepositoryToken(Person), useValue: personRepo },
        { provide: UnitOfWork, useValue: makeUnitOfWork(queryRunner) },
      ],
    }).compile();
    service = module.get(PeopleService);
  });

  function attachManager(manager: unknown) {
    (queryRunner as { manager: unknown }).manager = manager;
  }

  function makeManager(overrides: Record<string, unknown> = {}) {
    return {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softRemove: jest.fn(),
      ...overrides,
    };
  }

  describe('create', () => {
    it('creates a person without roles and returns PersonDto', async () => {
      const manager = makeManager({
        create: jest
          .fn()
          .mockImplementation((_t: unknown, data: unknown) => data),
        save: jest.fn().mockResolvedValue(personEntity),
        findOne: jest.fn().mockResolvedValue(personEntity),
        find: jest.fn().mockResolvedValue([]),
      });
      attachManager(manager);

      const result = await service.create(makeDto());

      expect(manager.create).toHaveBeenCalledWith(Person, {
        firstName: 'Juan',
        lastName: 'Pérez',
        birthDate: '1990-05-15',
        address: 'Av. Los Clavos 123',
        dni: '12345678',
        roles: [],
      });
      expect(manager.save).toHaveBeenCalledTimes(1);
      expect(manager.findOne).toHaveBeenCalledWith(Person, {
        where: { id: 1 },
        relations: { roles: true, auth: true },
      });
      expect(result).toEqual({
        id: 1,
        firstName: 'Juan',
        lastName: 'Pérez',
        birthDate: '1990-05-15',
        address: 'Av. Los Clavos 123',
        dni: '12345678',
        roles: [],
        hasAuth: false,
        auth: null,
      });
    });

    it('attaches roles when roleIds is provided', async () => {
      const roles = [{ id: 1, name: 'CLIENTE' }];
      const manager = makeManager({
        create: jest.fn().mockImplementation((_t: unknown, data: any) => data),
        save: jest.fn().mockResolvedValue({ ...personEntity, roles }),
        findOne: jest.fn().mockResolvedValue({ ...personEntity, roles }),
        find: jest.fn().mockResolvedValue(roles),
      });
      attachManager(manager);

      const result = await service.create(makeDto([1]));

      expect(manager.create).toHaveBeenCalledWith(
        Person,
        expect.objectContaining({ roles }),
      );
      expect(result.roles).toEqual([{ id: 1, name: 'CLIENTE' }]);
    });

    it('throws BadRequestException when staff role without email/password', async () => {
      const manager = makeManager();
      attachManager(manager);
      manager.find.mockResolvedValue([{ id: 1, name: 'TRABAJADOR' }]);

      await expect(service.create(makeDto([1]))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(manager.save).not.toHaveBeenCalled();
      expect(
        (queryRunner.rollbackTransaction as jest.Mock).mock.calls.length,
      ).toBe(1);
    });

    it('creates auth for staff roles with email/password', async () => {
      const roles = [{ id: 1, name: 'TRABAJADOR' }];
      const saved = { ...personEntity, roles, id: 5 };
      const manager = makeManager({
        create: jest.fn().mockImplementation((_t: unknown, data: any) => data),
        save: jest.fn().mockResolvedValue(saved),
        findOne: jest.fn().mockResolvedValue({
          ...saved,
          auth: { id: 99, email: 'trabajador@correo.com' },
        }),
        find: jest.fn().mockResolvedValue(roles),
      });
      attachManager(manager);
      const dto = makeDto([1]);
      dto.email = 'trabajador@correo.com';
      dto.password = 'secret123';

      const result = await service.create(dto);

      expect(manager.create).toHaveBeenCalledWith(Auth, {
        email: 'trabajador@correo.com',
        password: 'hashed-password',
        google: false,
        personId: 5,
      });
      expect(manager.save).toHaveBeenCalledTimes(2);
      expect(result.hasAuth).toBe(true);
    });

    it('throws ConflictException on duplicate auth email (rollback)', async () => {
      const roles = [{ id: 1, name: 'ADMINISTRADOR' }];
      const saved = { ...personEntity, roles, id: 5 };
      const manager = makeManager({
        create: jest.fn().mockImplementation((_t: unknown, data: any) => data),
        save: jest
          .fn()
          .mockResolvedValueOnce(saved)
          .mockRejectedValueOnce(pgError('23505')),
        find: jest.fn().mockResolvedValue(roles),
      });
      attachManager(manager);
      const dto = makeDto([1]);
      dto.email = 'dup@correo.com';
      dto.password = 'secret123';

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(
        (queryRunner.rollbackTransaction as jest.Mock).mock.calls.length,
      ).toBe(1);
    });

    it('throws NotFoundException (404) when a roleId does not exist (rollback)', async () => {
      const manager = makeManager();
      attachManager(manager);
      manager.find.mockResolvedValue([{ id: 1, name: 'CLIENTE' }]);

      await expect(service.create(makeDto([1, 999]))).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(
        (queryRunner.rollbackTransaction as jest.Mock).mock.calls.length,
      ).toBe(1);
      expect(
        (queryRunner.commitTransaction as jest.Mock).mock.calls.length,
      ).toBe(0);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException (409) on duplicate dni (rollback)', async () => {
      const manager = makeManager({
        create: jest
          .fn()
          .mockImplementation((_t: unknown, data: unknown) => data),
        save: jest.fn().mockRejectedValue(pgError('23505')),
        find: jest.fn().mockResolvedValue([]),
      });
      attachManager(manager);

      await expect(service.create(makeDto())).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(
        (queryRunner.rollbackTransaction as jest.Mock).mock.calls.length,
      ).toBe(1);
    });
  });

  describe('findAll', () => {
    function setupQueryBuilder(rows: Person[], total: number) {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
      };
      personRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('paginates and maps persons with empty roles', async () => {
      setupQueryBuilder([personEntity as unknown as Person], 1);

      const filter = new FilterPersonDto();
      filter.page = 1;
      filter.limit = 20;

      const result = await service.findAll(filter);

      expect(personRepo.createQueryBuilder).toHaveBeenCalledWith('p');
      expect(result).toEqual({
        data: [
          {
            id: 1,
            firstName: 'Juan',
            lastName: 'Pérez',
            birthDate: '1990-05-15',
            address: 'Av. Los Clavos 123',
            dni: '12345678',
            roles: [],
            hasAuth: false,
            auth: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        lastPage: 1,
      });
    });

    it('applies roleName filter via andWhere', async () => {
      const qb = setupQueryBuilder([], 0);
      const filter = new FilterPersonDto();
      filter.page = 1;
      filter.limit = 20;
      filter.roleName = 'CLIENTE';

      await service.findAll(filter);

      expect(qb.andWhere).toHaveBeenCalledWith('r.name = :roleName', {
        roleName: 'CLIENTE',
      });
    });

    it('applies hasAuth filter', async () => {
      const qb = setupQueryBuilder([], 0);
      const filter = new FilterPersonDto();
      filter.page = 1;
      filter.limit = 20;
      filter.hasAuth = true;

      await service.findAll(filter);

      expect(qb.andWhere).toHaveBeenCalledWith('a.id IS NOT NULL');
    });

    it('computes lastPage as 0 when no rows', async () => {
      setupQueryBuilder([], 0);
      const filter = new FilterPersonDto();
      filter.page = 1;
      filter.limit = 20;

      const result = await service.findAll(filter);

      expect(result.lastPage).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns PersonDto when exists', async () => {
      personRepo.findOne.mockResolvedValue(personWithRole);

      const result = await service.findOne(1);

      expect(personRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { roles: true, auth: true },
      });
      expect(result.roles).toEqual([{ id: 1, name: 'CLIENTE' }]);
      expect(result.hasAuth).toBe(false);
    });

    it('throws NotFoundException when does not exist', async () => {
      personRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      const updated = { ...personEntity, firstName: 'Carlos' };
      const manager = makeManager({
        findOne: jest.fn().mockResolvedValue({ ...personEntity }),
        save: jest.fn().mockResolvedValue(updated),
      });
      attachManager(manager);
      const dto = new UpdatePersonDto();
      dto.firstName = 'Carlos';

      const result = await service.update(1, dto);

      expect(result.firstName).toBe('Carlos');
      expect(result.lastName).toBe('Pérez');
    });

    it('replaces roles when roleIds is sent (including empty to clear)', async () => {
      const manager = makeManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce({ ...personWithRole })
          .mockResolvedValueOnce({ ...personEntity, roles: [] }),
        save: jest.fn().mockResolvedValue({ ...personEntity, roles: [] }),
        find: jest.fn().mockResolvedValue([]),
      });
      attachManager(manager);
      const dto = new UpdatePersonDto();
      dto.roleIds = [];

      const result = await service.update(1, dto);

      expect(result.roles).toEqual([]);
    });

    it('keeps roles untouched when roleIds is undefined', async () => {
      const manager = makeManager({
        findOne: jest.fn().mockResolvedValue({ ...personWithRole }),
        save: jest.fn().mockResolvedValue(personWithRole),
      });
      attachManager(manager);
      const dto = new UpdatePersonDto();
      dto.address = 'Nueva dir';

      const result = await service.update(1, dto);

      expect(result.address).toBe('Nueva dir');
      expect(result.roles).toEqual([{ id: 1, name: 'CLIENTE' }]);
    });

    it('throws NotFoundException when person does not exist', async () => {
      const manager = makeManager({
        findOne: jest.fn().mockResolvedValue(null),
      });
      attachManager(manager);
      const dto = new UpdatePersonDto();
      dto.firstName = 'X';

      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ConflictException on unique violation when changing dni', async () => {
      const manager = makeManager({
        findOne: jest.fn().mockResolvedValue({ ...personEntity }),
        save: jest.fn().mockRejectedValue(pgError('23505')),
      });
      attachManager(manager);
      const dto = new UpdatePersonDto();
      dto.dni = '99999999';

      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('creates auth when escalating a person to staff role', async () => {
      const roles = [{ id: 1, name: 'TRABAJADOR' }];
      const manager = makeManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce({ ...personEntity })
          .mockResolvedValueOnce({
            ...personEntity,
            roles,
            auth: { id: 99, email: 'staff@correo.com' },
          }),
        save: jest.fn().mockResolvedValue({ ...personEntity, roles }),
        find: jest.fn().mockResolvedValue(roles),
      });
      attachManager(manager);
      const dto = new UpdatePersonDto();
      dto.roleIds = [1];
      dto.email = 'staff@correo.com';
      dto.password = 'secret123';

      const result = await service.update(1, dto);

      expect(manager.create).toHaveBeenCalledWith(Auth, {
        email: 'staff@correo.com',
        password: 'hashed-password',
        google: false,
        personId: 1,
      });
      expect(result.hasAuth).toBe(true);
    });

    it('throws BadRequestException when escalating to staff without email/password', async () => {
      const manager = makeManager({
        findOne: jest.fn().mockResolvedValue({ ...personEntity }),
        find: jest.fn().mockResolvedValue([{ id: 1, name: 'TRABAJADOR' }]),
      });
      attachManager(manager);
      const dto = new UpdatePersonDto();
      dto.roleIds = [1];

      await expect(service.update(1, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(manager.create).not.toHaveBeenCalled();
    });

    it('updates existing auth email and password', async () => {
      const existingAuth = {
        id: 9,
        email: 'old@correo.com',
        password: 'old-hash',
        google: false,
        personId: 1,
      };
      const personWithAuth = {
        ...personEntity,
        roles: [{ id: 1, name: 'TRABAJADOR' }],
        auth: existingAuth,
      };
      const manager = makeManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(personWithAuth)
          .mockResolvedValueOnce(personWithAuth),
        save: jest.fn().mockResolvedValue(personWithAuth),
      });
      attachManager(manager);
      const dto = new UpdatePersonDto();
      dto.email = 'new@correo.com';
      dto.password = 'newpass123';

      await service.update(1, dto);

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@correo.com',
          password: 'hashed-password',
        }),
      );
    });

    it('keeps auth when staff roles are removed', async () => {
      const existingAuth = {
        id: 9,
        email: 'staff@correo.com',
        password: 'hash',
        google: false,
        personId: 1,
      };
      const personWithAuth = {
        ...personEntity,
        roles: [{ id: 1, name: 'TRABAJADOR' }],
        auth: existingAuth,
      };
      const manager = makeManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(personWithAuth)
          .mockResolvedValueOnce({
            ...personEntity,
            roles: [{ id: 2, name: 'CLIENTE' }],
            auth: existingAuth,
          }),
        save: jest.fn().mockResolvedValue(personWithAuth),
        find: jest.fn().mockResolvedValue([{ id: 2, name: 'CLIENTE' }]),
      });
      attachManager(manager);
      const dto = new UpdatePersonDto();
      dto.roleIds = [2];

      const result = await service.update(1, dto);

      expect(manager.create).not.toHaveBeenCalled();
      expect(result.roles).toEqual([{ id: 2, name: 'CLIENTE' }]);
      expect(result.hasAuth).toBe(true);
    });
  });

  describe('remove', () => {
    it('soft removes the person (204)', async () => {
      const manager = makeManager({
        findOne: jest.fn().mockResolvedValue({ ...personEntity }),
        softRemove: jest.fn().mockResolvedValue(undefined),
      });
      attachManager(manager);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(manager.softRemove).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when does not exist', async () => {
      const manager = makeManager({
        findOne: jest.fn().mockResolvedValue(null),
      });
      attachManager(manager);

      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
      expect(manager.softRemove).not.toHaveBeenCalled();
    });
  });
});
