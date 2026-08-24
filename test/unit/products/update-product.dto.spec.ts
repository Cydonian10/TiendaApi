import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from '@jest/globals';

import { UpdateProductDto } from '../../../src/modules/products/dtos/product/update-product.dto';

describe('UpdateProductDto', () => {
  it('accepts an empty productAttributes array', async () => {
    const dto = plainToInstance(UpdateProductDto, { productAttributes: [] });

    await expect(validate(dto)).resolves.toEqual([]);
  });
});
