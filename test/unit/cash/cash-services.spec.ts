import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CashMovementsService } from '../../../src/modules/cash/services/cash-movements.service';
import { CashRegisterOpeningsService } from '../../../src/modules/cash/services/cash-register-openings.service';
import { PaymentMethodsService } from '../../../src/modules/cash/services/payment-methods.service';
import { SalesService } from '../../../src/modules/sales/services/sales.service';
import { CashMovementType } from '../../../src/modules/cash/entities/cash-movement.entity';
import { CashOpeningStatus } from '../../../src/modules/cash/entities/cash-register-opening.entity';

describe('Cash services', () => {
  const worker = {
    sub: 1,
    personId: 1,
    email: 'worker@example.com',
    roles: ['TRABAJADOR'],
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

  it('rejects a sale whose single payment differs from its final total', async () => {
    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockResolvedValue({ id: 1, status: CashOpeningStatus.OPEN }),
    };
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOneBy: jest
        .fn()
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1, active: true }),
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        price: '10.00',
        baseProduct: {
          name: 'Tornillo',
          units: [{ isMain: true, unit: { id: 1 } }],
        },
      }),
    };
    const service = new SalesService(
      {} as never,
      {} as never,
      unitOfWork(manager),
    );

    await expect(
      service.create(
        {
          cashOpeningId: 1,
          customerId: 2,
          details: [{ productId: 1, quantity: 2 }],
          payment: { paymentMethodId: 1, amount: 19 },
        },
        worker,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
