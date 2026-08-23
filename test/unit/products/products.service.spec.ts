import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Product } from '../../../src/modules/products/entities/producto.entity';
import { ProductDto } from '../../../src/modules/products/dtos/product/product.dto';
import { ProductFilterDto } from '../../../src/modules/products/dtos/product/filter-product.dto';
import { ProductsService } from '../../../src/modules/products/services/products.service';
import { UnitOfWork } from '../../../src/database/unitOfWork';

describe('ProductsService', () => {
  it('maps products without a persisted name', () => {
    const product = {
      id: 1,
      stock: '10.00',
      price: '1.50',
      baseProduct: { id: 2, name: 'Tornillo', units: [] },
      productAttributes: [],
    } as unknown as Product;

    const result = ProductDto.fromEntity(product);

    expect(result.baseProductName).toBe('Tornillo');
    expect(result).not.toHaveProperty('name');
    expect(result.productAttributes).toEqual([]);
  });

  it('searches by the base product name', async () => {
    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      find: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repository },
        { provide: UnitOfWork, useValue: {} },
      ],
    }).compile();
    const service = module.get(ProductsService);
    const filter = new ProductFilterDto();
    filter.page = 1;
    filter.limit = 20;
    filter.search = 'tornillo';

    await service.findAll(filter);

    expect(qb.leftJoin).toHaveBeenCalledWith('p.baseProduct', 'bp');
    expect(qb.andWhere).toHaveBeenCalledWith(
      'unaccent(LOWER(bp.name)) ILIKE unaccent(LOWER(:search))',
      { search: '%tornillo%' },
    );
  });
});
