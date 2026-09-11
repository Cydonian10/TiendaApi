import { SalesController } from '@/modules/sales/controllers/sales.controller';
import { SaleStatus } from '@/modules/sales/entities/sale.entity';

const user = {
  sub: 1,
  personId: 2,
  email: 'seller@example.com',
  roles: ['TRABAJADOR'],
};

const sale = {
  id: 1,
  saleDate: new Date('2026-09-11T10:00:00.000Z'),
  customer: { id: 3, firstName: 'Cliente', lastName: 'Uno' },
  seller: { id: 2, firstName: 'Vendedor', lastName: 'Uno' },
  cashOpening: { id: 4 },
  discount: '0.00',
  totalAmount: '10.00',
  status: SaleStatus.PENDING,
  paidAt: null,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  payment: null,
  details: [],
};

describe('SalesController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    pay: jest.fn(),
    cancel: jest.fn(),
  };
  const controller = new SalesController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates creation and serializes a pending sale without payment', async () => {
    service.create.mockResolvedValue(sale);

    await expect(
      controller.create(
        {
          cashOpeningId: 4,
          customerId: 3,
          details: [{ productId: 1, quantity: 1 }],
        },
        user,
      ),
    ).resolves.toMatchObject({ status: SaleStatus.PENDING, payment: null });
    expect(service.create).toHaveBeenCalledWith(
      {
        cashOpeningId: 4,
        customerId: 3,
        details: [{ productId: 1, quantity: 1 }],
      },
      user,
    );
  });

  it('delegates read, update, payment, and cancellation operations', async () => {
    service.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      lastPage: 0,
    });
    service.findOne.mockResolvedValue(sale);
    service.update.mockResolvedValue(sale);
    service.pay.mockResolvedValue(sale);
    service.cancel.mockResolvedValue(sale);

    await controller.findAll({ page: 1, limit: 20 }, user);
    await controller.findOne(1, user);
    await controller.update(1, { discount: 1 }, user);
    await controller.pay(1, { paymentMethodId: 1, amount: 9 }, user);
    await controller.cancel(
      1,
      { cancellationReason: 'Cliente desistió' },
      user,
    );

    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 }, user);
    expect(service.findOne).toHaveBeenCalledWith(1, user);
    expect(service.update).toHaveBeenCalledWith(1, { discount: 1 }, user);
    expect(service.pay).toHaveBeenCalledWith(
      1,
      {
        paymentMethodId: 1,
        amount: 9,
      },
      user,
    );
    expect(service.cancel).toHaveBeenCalledWith(
      1,
      { cancellationReason: 'Cliente desistió' },
      user,
    );
  });
});
