/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                     @typescript-eslint/no-unsafe-return,
                     @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { PeopleService } from '../../../src/modules/people/services/people.service';
import { Person } from '../../../src/modules/people/entities/person.entity';
import { CreatePersonDto } from '../../../src/modules/people/dtos/person/create-person.dto';
import { UpdatePersonDto } from '../../../src/modules/people/dtos/person/update-person.dto';
import { FilterPersonDto } from '../../../src/modules/people/dtos/person/filter-person.dto';
import { UnitOfWork } from '../../../src/database/unitOfWork';

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
        relations: { roles: true },
      });
      expect(result).toEqual({
        id: 1,
        firstName: 'Juan',
        lastName: 'Pérez',
        birthDate: '1990-05-15',
        address: 'Av. Los Clavos 123',
        dni: '12345678',
        roles: [],
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
        relations: { roles: true },
      });
      expect(result.roles).toEqual([{ id: 1, name: 'CLIENTE' }]);
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
