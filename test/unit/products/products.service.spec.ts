import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Product } from '../../../src/modules/products/entities/producto.entity';
import { ProductAttribute } from '../../../src/modules/products/entities/product-attribute.entity';
import { ProductDto } from '../../../src/modules/products/dtos/product/product.dto';
import { ProductFilterDto } from '../../../src/modules/products/dtos/product/filter-product.dto';
import { ProductsService } from '../../../src/modules/products/services/products.service';
import { UnitOfWork } from '../../../src/database/unitOfWork';

describe('ProductsService', () => {
  const createService = (manager: Record<string, jest.Mock>) =>
    new ProductsService(
      {} as any,
      {
        execute: (callback: (queryRunner: any) => unknown) =>
          callback({ manager }),
      } as any,
    );

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

  it('updates a product without attributes when the replacement is empty', async () => {
    const loadedProduct = {
      id: 5,
      stock: '10.00',
      price: '1.50',
      attributeKey: '1:10',
      baseProduct: { id: 2, name: 'Tornillo', units: [] },
      productAttributes: [],
    } as unknown as Product;
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 5,
          stock: '10.00',
          price: '1.50',
          attributeKey: '1:10',
          baseProduct: { id: 2, name: 'Tornillo', units: [] },
          productAttributes: [],
        })
        .mockResolvedValueOnce(loadedProduct),
      delete: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = createService(manager);

    const result = await service.update(5, { productAttributes: [] });

    expect(manager.delete).toHaveBeenCalledWith(ProductAttribute, {
      product: { id: 5 },
    });
    expect(manager.save).toHaveBeenNthCalledWith(1, ProductAttribute, []);
    expect(manager.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ attributeKey: '' }),
    );
    expect(result.productAttributes).toEqual([]);
  });

  it('updates only the requested product attribute orders', async () => {
    const firstAttribute = {
      attribute: { id: 1, name: 'Color' },
      attributeValue: { id: 10, value: 'Rojo' },
      order: 1,
    } as unknown as ProductAttribute;
    const secondAttribute = {
      attribute: { id: 2, name: 'Tamaño' },
      attributeValue: { id: 20, value: 'Grande' },
      order: 2,
    } as unknown as ProductAttribute;
    const loadedProduct = {
      id: 5,
      stock: '10.00',
      price: '1.50',
      baseProduct: { id: 2, name: 'Tornillo', units: [] },
      productAttributes: [firstAttribute, secondAttribute],
    } as unknown as Product;
    const manager = {
      findOneBy: jest.fn().mockResolvedValue({ id: 5 }),
      find: jest.fn().mockResolvedValue([firstAttribute, secondAttribute]),
      save: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(loadedProduct),
    };
    const service = createService(manager);

    const result = await service.updateAttributeOrders(5, [
      { attributeId: 1, order: 2.5 },
    ]);

    expect(firstAttribute.order).toBe(2.5);
    expect(secondAttribute.order).toBe(2);
    expect(manager.save).toHaveBeenCalledWith(ProductAttribute, [
      firstAttribute,
    ]);
    expect(result.productAttributes[0].order).toBe(2.5);
  });

  it('rejects duplicate attribute ids in an order update', async () => {
    const manager = {
      findOneBy: jest.fn().mockResolvedValue({ id: 5 }),
      find: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const service = createService(manager);

    await expect(
      service.updateAttributeOrders(5, [
        { attributeId: 1, order: 1 },
        { attributeId: 1, order: 2 },
      ]),
    ).rejects.toThrow('está repetido');
    expect(manager.find).not.toHaveBeenCalled();
  });

  it('rejects an order update for a missing product', async () => {
    const manager = {
      findOneBy: jest.fn().mockResolvedValue(null),
      find: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const service = createService(manager);

    await expect(
      service.updateAttributeOrders(5, [{ attributeId: 1, order: 1 }]),
    ).rejects.toThrow('Product 5 no encontrado');
    expect(manager.find).not.toHaveBeenCalled();
  });

  it('rejects an attribute that does not belong to the product', async () => {
    const productAttribute = {
      attribute: { id: 1, name: 'Color' },
      attributeValue: { id: 10, value: 'Rojo' },
      order: 1,
    } as unknown as ProductAttribute;
    const manager = {
      findOneBy: jest.fn().mockResolvedValue({ id: 5 }),
      find: jest.fn().mockResolvedValue([productAttribute]),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const service = createService(manager);

    await expect(
      service.updateAttributeOrders(5, [{ attributeId: 2, order: 2 }]),
    ).rejects.toThrow('no pertenece al producto');
    expect(manager.save).not.toHaveBeenCalled();
  });
});
