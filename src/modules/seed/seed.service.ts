import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { hashPassword } from '@/common/utils/password';
import { isUniqueViolation } from '@/common/utils/pg-errors';
import { UnitOfWork } from '@/database/unitOfWork';
import { Attribute } from '@/modules/attributes/entities/attribute.entity';
import { AttributeValue } from '@/modules/attributes/entities/attribute-value.entity';
import { Auth } from '@/modules/auth/entities/auth.entity';
import { BaseProductUnit } from '@/modules/measurement-units/entities/baseProduct-unit.entity';
import { MeasurementUnit } from '@/modules/measurement-units/entities/measurement-unit.entity';
import { Person } from '@/modules/people/entities/person.entity';
import { BaseProduct } from '@/modules/products/entities/base-product.entity';
import { Brand } from '@/modules/products/entities/brand.entity';
import { Category } from '@/modules/products/entities/category.entity';
import { ProductAttribute } from '@/modules/products/entities/product-attribute.entity';
import { Product } from '@/modules/products/entities/producto.entity';
import { Role } from '@/modules/roles/entities/role.entity';

@Injectable()
export class SeedService {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async add() {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const existingUnits = await manager.count(MeasurementUnit);
      if (existingUnits > 0) {
        throw new ConflictException(
          'Ya existe información sembrada. Ejecuta POST /seed/drop antes de volver a sembrar.',
        );
      }

      try {
        const units = await manager.save(MeasurementUnit, [
          { name: 'Kilogramo', value: 'kg' },
          { name: 'Gramo', value: 'g' },
          { name: 'Metro', value: 'm' },
          { name: 'Unidad', value: 'u' },
        ]);

        const color = await manager.save(Attribute, { name: 'Color' });
        const size = await manager.save(Attribute, { name: 'Tamaño' });
        const [red, blue, large, small] = await manager.save(AttributeValue, [
          { value: 'Rojo', attributeId: color.id },
          { value: 'Azul', attributeId: color.id },
          { value: 'Grande', attributeId: size.id },
          { value: 'Pequeño', attributeId: size.id },
        ]);

        const [ceramica, sika] = await manager.save(Brand, [
          {
            name: 'Cerámica Norte',
            description: 'Marca de materiales cerámicos',
          },
          {
            name: 'Sika',
            description: 'Marca de soluciones para construcción',
          },
        ]);
        const [hardware, construction] = await manager.save(Category, [
          { name: 'Ferretería', description: 'Herramientas y accesorios' },
          { name: 'Construcción', description: 'Materiales para construcción' },
        ]);

        const [adminRole, workerRole, customerRole] = await manager.save(Role, [
          { name: 'ADMINISTRADOR' },
          { name: 'TRABAJADOR' },
          { name: 'CLIENTE' },
        ]);

        const [admin, worker, customer] = await manager.save(Person, [
          {
            firstName: 'Admin',
            lastName: 'Seed',
            birthDate: '1985-01-15',
            address: 'Av. Principal 100',
            dni: 'SEED-ADMIN-001',
            roles: [adminRole],
          },
          {
            firstName: 'María',
            lastName: 'Trabajadora',
            birthDate: '1990-05-20',
            address: 'Calle Comercio 200',
            dni: 'SEED-WORKER-001',
            roles: [workerRole],
          },
          {
            firstName: 'Carlos',
            lastName: 'Cliente',
            birthDate: '1995-09-10',
            address: 'Jr. Los Álamos 300',
            dni: 'SEED-CUSTOMER-001',
            roles: [customerRole],
          },
        ]);

        const password = await hashPassword('secret123');
        await manager.save(Auth, [
          {
            email: 'admin@seed.com',
            password,
            google: false,
            personId: admin.id,
          },
          {
            email: 'worker@seed.com',
            password,
            google: false,
            personId: worker.id,
          },
        ]);

        const nail = await this.createBaseProduct(manager, {
          name: 'Clavo',
          brand: ceramica,
          categories: [hardware, construction],
          units: [
            { unit: units[0], factor: '1.00', isMain: true },
            { unit: units[1], factor: '1000.00', isMain: false },
          ],
          price: '10.50',
          stock: '100.00',
        });
        const screw = await this.createBaseProduct(manager, {
          name: 'Tornillo',
          brand: sika,
          categories: [hardware],
          units: [{ unit: units[3], factor: '1.00', isMain: true }],
          price: '2.75',
          stock: '250.00',
        });

        await manager.save(ProductAttribute, {
          product: nail.product,
          attribute: color,
          attributeValue: red,
          order: 1,
        });
        await manager.save(ProductAttribute, {
          product: nail.product,
          attribute: size,
          attributeValue: large,
          order: 2,
        });
        await manager.save(ProductAttribute, {
          product: screw.product,
          attribute: color,
          attributeValue: blue,
          order: 1,
        });
        await manager.save(ProductAttribute, {
          product: screw.product,
          attribute: size,
          attributeValue: small,
          order: 2,
        });

        return {
          message: 'Datos de prueba creados',
          users: [admin.id, worker.id, customer.id],
          baseProducts: [nail.baseProduct.id, screw.baseProduct.id],
          credentials: {
            email: 'admin@seed.com',
            password: 'secret123',
          },
        };
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new ConflictException(
            'Ya existe información sembrada en alguna tabla (unidad, atributo, marca, categoría, rol o persona). Ejecuta POST /seed/drop antes de volver a sembrar.',
          );
        }
        throw e;
      }
    });
  }

  async drop() {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const tables = [
        'product_attribute',
        'product',
        'base_product_category',
        '"base-product-unit"',
        'base_product',
        'auth',
        'person_role',
        'person',
        'role',
        'attribute_value',
        'attribute',
        'category',
        'brand',
        '"measurement-unit"',
      ];

      for (const table of tables) {
        await manager.query(`DELETE FROM ${table}`);
      }

      return { message: 'Datos principales de prueba eliminados' };
    });
  }

  private async createBaseProduct(
    manager: EntityManager,
    data: {
      name: string;
      brand: Brand;
      categories: Category[];
      units: Array<{
        unit: MeasurementUnit;
        factor: string;
        isMain: boolean;
      }>;
      price: string;
      stock: string;
    },
  ) {
    const baseProduct = manager.create(BaseProduct, {
      name: data.name,
      brand: data.brand,
      brandId: data.brand.id,
      categories: data.categories,
    });
    const savedBaseProduct = await manager.save(baseProduct);

    await manager.save(
      BaseProductUnit,
      data.units.map((item) =>
        manager.create(BaseProductUnit, {
          baseProduct: savedBaseProduct,
          unit: item.unit,
          factor: item.factor,
          isMain: item.isMain,
        }),
      ),
    );

    const product = await manager.save(
      manager.create(Product, {
        name: data.name,
        stock: data.stock,
        price: data.price,
        attributeKey: '',
        baseProduct: savedBaseProduct,
      }),
    );

    return { baseProduct: savedBaseProduct, product };
  }
}
