import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CashMovementsService } from '../../../src/modules/cash/services/cash-movements.service';
import { CashRegisterOpeningsService } from '../../../src/modules/cash/services/cash-register-openings.service';
import { CashRegistersService } from '../../../src/modules/cash/services/cash-registers.service';
import { PaymentMethodsService } from '../../../src/modules/cash/services/payment-methods.service';
import { SalesService } from '../../../src/modules/sales/services/sales.service';
import { CashMovementType } from '../../../src/modules/cash/entities/cash-movement.entity';
import { CashOpeningStatus } from '../../../src/modules/cash/entities/cash-register-opening.entity';
import { DateTime } from 'luxon';

describe('Cash services', () => {
  const worker = {
    sub: 1,
    personId: 1,
    email: 'worker@example.com',
    roles: ['TRABAJADOR'],
  };

  const administrator = {
    sub: 2,
    personId: 2,
    email: 'admin@example.com',
    roles: ['ADMINISTRADOR'],
  };

  const unitOfWork = (manager: Record<string, jest.Mock>) =>
    ({
      execute: <T>(work: (runner: { manager: typeof manager }) => Promise<T>) =>
        work({ manager }),
    }) as never;

  it('rejects opening an inactive cash register', async () => {
    const manager = {
      findOneBy: jest.fn().mockResolvedValue({ id: 1, active: false }),
    };
    const service = new CashRegisterOpeningsService(
      {} as never,
      unitOfWork(manager),
    );

    await expect(
      service.create({ cashRegisterId: 1, openingAmount: 10 }, worker),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a second open session for the same register', async () => {
    const manager = {
      findOneBy: jest
        .fn()
        .mockResolvedValueOnce({ id: 1, active: true })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 9 }),
    };
    const service = new CashRegisterOpeningsService(
      {} as never,
      unitOfWork(manager),
    );

    await expect(
      service.create({ cashRegisterId: 1, openingAmount: 10 }, worker),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('trims cash register values and converts duplicate codes to a conflict', async () => {
    const repository = {
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockRejectedValue({ code: '23505' }),
    };
    const service = new CashRegistersService(repository as never);

    await expect(
      service.create({ code: ' CAJA-01 ', name: ' Principal ' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).toHaveBeenCalledWith({
      code: 'CAJA-01',
      name: 'Principal',
    });
  });

  it('limits worker listings to active registers and leaves admins unrestricted', async () => {
    const queryBuilder = {
      leftJoinAndMapOne: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const service = new CashRegistersService(repository as never);

    await service.findAll(['TRABAJADOR']);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'cashRegister.active = true',
    );

    queryBuilder.where.mockClear();
    await service.findAll(['ADMINISTRADOR']);
    expect(queryBuilder.where).not.toHaveBeenCalled();
  });

  it('rejects deactivation while the cash register has an open session', async () => {
    const repository = {
      findOneBy: jest.fn().mockResolvedValue({ id: 1, active: true }),
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        openings: [{ status: CashOpeningStatus.OPEN }],
      }),
      save: jest.fn(),
    };
    const service = new CashRegistersService(repository as never);

    await expect(service.update(1, { active: false })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('assigns the selected eligible responsible to an administrator opening', async () => {
    const responsibleQuery = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 3 }),
    };
    const manager = {
      findOneBy: jest
        .fn()
        .mockResolvedValueOnce({ id: 1, active: true })
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce(null),
      createQueryBuilder: jest.fn().mockReturnValue(responsibleQuery),
      create: jest
        .fn()
        .mockImplementation((_entity: unknown, value: unknown) => value),
      save: jest
        .fn()
        .mockImplementation((value: unknown) => Promise.resolve(value)),
    };
    const service = new CashRegisterOpeningsService(
      {} as never,
      unitOfWork(manager),
    );

    const opening = await service.create(
      { cashRegisterId: 1, openingAmount: 10, responsibleId: 3 },
      administrator,
    );

    expect(opening.openedBy).toEqual({ id: 2 });
    expect(opening.responsible).toEqual({ id: 3 });
  });

  it('forces a worker to be their own responsible', async () => {
    const manager = {
      findOneBy: jest
        .fn()
        .mockResolvedValueOnce({ id: 1, active: true })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null),
      createQueryBuilder: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((_entity: unknown, value: unknown) => value),
      save: jest
        .fn()
        .mockImplementation((value: unknown) => Promise.resolve(value)),
    };
    const service = new CashRegisterOpeningsService(
      {} as never,
      unitOfWork(manager),
    );

    const opening = await service.create(
      { cashRegisterId: 1, openingAmount: 10, responsibleId: 99 },
      worker,
    );

    expect(opening.responsible).toBe(opening.openedBy);
    expect(manager.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects an administrator responsible without an operational account', async () => {
    const responsibleQuery = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const manager = {
      findOneBy: jest
        .fn()
        .mockResolvedValueOnce({ id: 1, active: true })
        .mockResolvedValueOnce({ id: 2 }),
      createQueryBuilder: jest.fn().mockReturnValue(responsibleQuery),
    };
    const service = new CashRegisterOpeningsService(
      {} as never,
      unitOfWork(manager),
    );

    await expect(
      service.create(
        { cashRegisterId: 1, openingAmount: 10, responsibleId: 3 },
        administrator,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filters openings by calendar month from newest to oldest', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const service = new CashRegisterOpeningsService(
      repository as never,
      {} as never,
    );

    await service.findAll({ cashRegisterId: 4, year: 2026, month: 9 });

    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      1,
      'opening.openedAt >= :startsAt',
      {
        startsAt: DateTime.fromObject(
          { year: 2026, month: 9, day: 1 },
          { zone: 'America/Lima' },
        )
          .toUTC()
          .toJSDate(),
      },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      'opening.openedAt < :endsAt',
      {
        endsAt: DateTime.fromObject(
          { year: 2026, month: 10, day: 1 },
          { zone: 'America/Lima' },
        )
          .toUTC()
          .toJSDate(),
      },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'opening.openedAt',
      'DESC',
    );
  });

  it('rejects a cash movement on a closed session', async () => {
    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ status: CashOpeningStatus.CLOSED }),
    };
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOneBy: jest.fn(),
    };
    const service = new CashMovementsService(unitOfWork(manager));

    await expect(
      service.create(
        {
          cashOpeningId: 1,
          type: CashMovementType.INCOME,
          amount: 10,
          reason: 'Prueba',
        },
        worker,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.findOneBy).not.toHaveBeenCalled();
  });

  it('allows only the opener or an administrator to close a session', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        status: CashOpeningStatus.OPEN,
        openedBy: { id: 2 },
      }),
    };
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const service = new CashRegisterOpeningsService(
      {} as never,
      unitOfWork(manager),
    );

    await expect(
      service.close(1, { details: [] }, worker),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(queryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
      undefined,
      ['opening'],
    );
  });

  it('does not allow deactivating Efectivo', async () => {
    const repository = {
      findOneBy: jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'Efectivo', active: true }),
    };
    const service = new PaymentMethodsService(repository as never);

    await expect(service.deactivate(1)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('lists only active payment methods for operational use', async () => {
    const repository = {
      findOneBy: jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'Efectivo', active: true }),
      find: jest
        .fn()
        .mockResolvedValue([{ id: 1, name: 'Efectivo', active: true }]),
    };
    const service = new PaymentMethodsService(repository as never);

    await expect(service.findAll()).resolves.toEqual([
      { id: 1, name: 'Efectivo', active: true },
    ]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { active: true },
      order: { id: 'ASC' },
    });
  });

  it('rejects payment when its amount differs from a pending sale total', async () => {
    const saleQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 1,
        status: 'PENDING',
        totalAmount: '20.00',
        cashOpening: { id: 1, status: CashOpeningStatus.OPEN },
        details: [],
      }),
    };
    const openingQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 1,
        status: CashOpeningStatus.OPEN,
        responsible: { id: worker.personId },
      }),
    };
    const manager = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(saleQueryBuilder)
        .mockReturnValueOnce(openingQueryBuilder),
      findOneBy: jest.fn().mockResolvedValue({ id: 1, active: true }),
    };
    const service = new SalesService({} as never, unitOfWork(manager));

    await expect(
      service.pay(1, { paymentMethodId: 1, amount: 19 }, worker),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(saleQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
      undefined,
      ['sale'],
    );
    expect(openingQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
      undefined,
      ['opening'],
    );
  });

  it('scopes sale and product locks to their root aliases', async () => {
    const sale = {
      id: 1,
      status: 'PENDING',
      totalAmount: '10.00',
      cashOpening: { id: 1 },
      details: [{ product: { id: 3 }, quantity: 1 }],
      payment: null,
    };
    const saleQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(sale),
    };
    const openingQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 1,
        status: CashOpeningStatus.OPEN,
        responsible: { id: worker.personId },
      }),
    };
    const productQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 3, stock: '2.00' }]),
    };
    const manager = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(saleQueryBuilder)
        .mockReturnValueOnce(openingQueryBuilder)
        .mockReturnValueOnce(productQueryBuilder),
      findOneBy: jest.fn().mockResolvedValue({ id: 1, active: true }),
      create: jest.fn().mockImplementation((_entity, value) => value),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
      findOne: jest.fn().mockResolvedValue(sale),
    };
    const service = new SalesService({} as never, unitOfWork(manager));

    await service.pay(1, { paymentMethodId: 1, amount: 10 }, worker);

    expect(saleQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
      undefined,
      ['sale'],
    );
    expect(productQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
      undefined,
      ['product'],
    );
    expect(sale.payment).toMatchObject({
      amount: '10.00',
      status: 'PAID',
      sale,
    });
  });

  it('rejects creating, editing, and paying sales from another responsible session', async () => {
    const foreignOpeningQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 4,
        status: CashOpeningStatus.OPEN,
        responsible: { id: administrator.personId },
      }),
    };
    const foreignSaleQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 1,
        status: 'PENDING',
        cashOpening: { id: 4 },
        details: [],
      }),
    };

    const createService = new SalesService(
      {} as never,
      unitOfWork({
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(foreignOpeningQueryBuilder),
      }),
    );
    await expect(
      createService.create(
        {
          cashOpeningId: 4,
          customerId: 3,
          details: [{ productId: 1, quantity: 1 }],
        },
        worker,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const updateService = new SalesService(
      {} as never,
      unitOfWork({
        createQueryBuilder: jest
          .fn()
          .mockReturnValueOnce(foreignSaleQueryBuilder)
          .mockReturnValueOnce(foreignOpeningQueryBuilder),
      }),
    );
    await expect(updateService.update(1, {}, worker)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const payService = new SalesService(
      {} as never,
      unitOfWork({
        createQueryBuilder: jest
          .fn()
          .mockReturnValueOnce(foreignSaleQueryBuilder)
          .mockReturnValueOnce(foreignOpeningQueryBuilder),
      }),
    );
    await expect(
      payService.pay(1, { paymentMethodId: 1, amount: 10 }, worker),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
