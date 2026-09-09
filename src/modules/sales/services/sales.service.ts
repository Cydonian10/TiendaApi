import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { Product } from '@/modules/products/entities/producto.entity';
import { UnitOfWork } from '@/database/unitOfWork';
import type { JwtUser } from '@/modules/auth/decorators/current-user.decorator';
import { Person } from '@/modules/people/entities/person.entity';
import {
  CashOpeningStatus,
  CashRegisterOpening,
} from '@/modules/cash/entities/cash-register-opening.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { SaleDetail } from '../entities/sale-detail.entity';
import { SalePayment } from '../entities/sale-payment.entity';
import { CreateSaleDto } from '../dtos/sale/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(dto: CreateSaleDto, user: JwtUser): Promise<Sale> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const opening = await manager
        .createQueryBuilder(CashRegisterOpening, 'opening')
        .setLock('pessimistic_write')
        .where('opening.id = :id', { id: dto.cashOpeningId })
        .getOne();
      if (!opening) {
        throw new NotFoundException(
          `CashRegisterOpening ${dto.cashOpeningId} no encontrada`,
        );
      }
      if (opening.status !== CashOpeningStatus.OPEN) {
        throw new BadRequestException(
          'Solo se puede vender en una sesión abierta',
        );
      }
      const customer = await manager.findOneBy(Person, { id: dto.customerId });
      if (!customer) {
        throw new NotFoundException(`Person ${dto.customerId} no encontrada`);
      }
      const seller = await manager.findOneBy(Person, { id: user.personId });
      if (!seller) {
        throw new NotFoundException(`Person ${user.personId} no encontrada`);
      }
      const paymentMethod = await manager.findOneBy(PaymentMethod, {
        id: dto.payment.paymentMethodId,
      });
      if (!paymentMethod) {
        throw new NotFoundException(
          `PaymentMethod ${dto.payment.paymentMethodId} no encontrado`,
        );
      }
      if (!paymentMethod.active) {
        throw new BadRequestException('El método de pago está inactivo');
      }

      const products = await Promise.all(
        dto.details.map(async (detail) => {
          const product = await manager.findOne(Product, {
            where: { id: detail.productId },
            relations: { baseProduct: { units: { unit: true } } },
          });
          if (!product) {
            throw new NotFoundException(
              `Product ${detail.productId} no encontrado`,
            );
          }
          const mainUnit = product.baseProduct.units.find(
            (unit) => unit.isMain,
          );
          if (!mainUnit) {
            throw new BadRequestException(
              `Product ${detail.productId} no tiene una unidad principal`,
            );
          }
          return { dto: detail, product, mainUnit };
        }),
      );
      const subtotal = products.reduce(
        (total, item) => total + Number(item.product.price) * item.dto.quantity,
        0,
      );
      const discount = dto.discount ?? 0;
      if (discount > subtotal) {
        throw new BadRequestException(
          'El descuento no puede exceder el subtotal',
        );
      }
      const totalAmount = this.round2(subtotal - discount);
      if (this.round2(dto.payment.amount) !== totalAmount) {
        throw new BadRequestException(
          'El importe del pago debe coincidir con el total final de la venta',
        );
      }

      const sale = await manager.save(
        manager.create(Sale, {
          customer,
          seller,
          cashOpening: opening,
          discount: this.round2(discount),
          totalAmount,
        }),
      );
      await manager.save(
        products.map(({ dto: detail, product, mainUnit }) =>
          manager.create(SaleDetail, {
            sale,
            product,
            productName: product.baseProduct.name,
            baseProductName: product.baseProduct.name,
            unit: mainUnit.unit,
            quantity: detail.quantity,
            unitPrice: this.round2(Number(product.price)),
            discount: '0.00',
            subtotal: this.round2(Number(product.price) * detail.quantity),
            notes: null,
          }),
        ),
      );
      await manager.save(
        manager.create(SalePayment, {
          sale,
          paymentMethod,
          amount: totalAmount,
        }),
      );
      return this.findOne(manager, sale.id);
    });
  }

  private async findOne(
    manager: import('typeorm').EntityManager,
    id: number,
  ): Promise<Sale> {
    const sale = await manager.findOne(Sale, {
      where: { id },
      relations: {
        customer: true,
        seller: true,
        cashOpening: true,
        payment: { paymentMethod: true },
        details: { product: { baseProduct: true } },
      },
    });
    if (!sale) {
      throw new NotFoundException(`Sale ${id} no encontrada`);
    }
    return sale;
  }

  private round2(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
  }
}
