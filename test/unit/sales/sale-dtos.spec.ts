import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CancelSaleDto } from '@/modules/sales/dtos/sale/cancel-sale.dto';
import { PaySaleDto } from '@/modules/sales/dtos/sale/pay-sale.dto';

describe('sale DTOs', () => {
  it('requires a cancellation reason between 1 and 500 characters', async () => {
    const empty = plainToInstance(CancelSaleDto, { cancellationReason: '' });
    const tooLong = plainToInstance(CancelSaleDto, {
      cancellationReason: 'a'.repeat(501),
    });
    const valid = plainToInstance(CancelSaleDto, {
      cancellationReason: 'Cliente desistió de la compra',
    });

    await expect(validate(empty)).resolves.not.toHaveLength(0);
    await expect(validate(tooLong)).resolves.not.toHaveLength(0);
    await expect(validate(valid)).resolves.toHaveLength(0);
  });

  it('transforms and validates payment values', async () => {
    const valid = plainToInstance(PaySaleDto, {
      paymentMethodId: '1',
      amount: '10.50',
    });
    const invalid = plainToInstance(PaySaleDto, {
      paymentMethodId: 0,
      amount: -1,
    });

    expect(valid.paymentMethodId).toBe(1);
    expect(valid.amount).toBe(10.5);
    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });
});
