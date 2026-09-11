import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UnitOfWork } from '@/database/unitOfWork';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import type { JwtUser } from '@/modules/auth/decorators/current-user.decorator';
import { Person } from '@/modules/people/entities/person.entity';
import { Product } from '@/modules/products/entities/producto.entity';
import {
  CashMovement,
  CashMovementType,
} from '@/modules/cash/entities/cash-movement.entity';
import {
  CashOpeningStatus,
  CashRegisterOpening,
} from '@/modules/cash/entities/cash-register-opening.entity';
import { CancelSaleDto } from '../dtos/sale/cancel-sale.dto';
import { CreateSaleDto } from '../dtos/sale/create-sale.dto';
import { FilterSaleDto } from '../dtos/sale/filter-sale.dto';
import { PaySaleDto } from '../dtos/sale/pay-sale.dto';
import { SaleDto } from '../dtos/sale/sale.dto';
import { UpdateSaleDto } from '../dtos/sale/update-sale.dto';
import { PaymentMethod } from '../entities/payment-method.entity';
import { SaleDetail } from '../entities/sale-detail.entity';
import {
  SalePayment,
  SalePaymentStatus,
} from '../entities/sale-payment.entity';
import { Sale, SaleStatus } from '../entities/sale.entity';

type SaleDetailInput = CreateSaleDto['details'][number];

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(dto: CreateSaleDto, user: JwtUser): Promise<Sale> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const opening = await this.findOpenOpeningOrThrow(
        manager,
        dto.cashOpeningId,
        true,
      );
      this.assertOpeningResponsible(opening, user);
      const customer = await this.findPersonOrThrow(manager, dto.customerId);
      const seller = await this.findPersonOrThrow(manager, user.personId);
      const sale = await manager.save(
        manager.create(Sale, {
          customer,
          seller,
          cashOpening: opening,
          status: SaleStatus.PENDING,
          discount: '0.00',
          totalAmount: '0.00',
        }),
      );
      await this.replaceDetails(manager, sale, dto.details, dto.discount ?? 0);
      return this.findOneWithRelations(manager, sale.id);
    });
  }

  async update(id: number, dto: UpdateSaleDto, user: JwtUser): Promise<Sale> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const sale = await this.findSaleForUpdateOrThrow(manager, id);
      this.assertPending(sale);
      const opening = await this.findOpenOpeningOrThrow(
        manager,
        sale.cashOpening.id,
        true,
      );
      this.assertOpeningResponsible(opening, user);

      if (dto.customerId !== undefined) {
        sale.customer = await this.findPersonOrThrow(manager, dto.customerId);
      }
      const discount = dto.discount ?? Number(sale.discount);
      const details =
        dto.details ??
        sale.details.map((detail) => ({
          productId: detail.product.id,
          quantity: detail.quantity,
        }));
      await this.replaceDetails(manager, sale, details, discount);
      return this.findOneWithRelations(manager, sale.id);
    });
  }

  async pay(id: number, dto: PaySaleDto, user: JwtUser): Promise<Sale> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const sale = await this.findSaleForUpdateOrThrow(manager, id);
      this.assertPending(sale);
      const opening = await this.findOpenOpeningOrThrow(
        manager,
        sale.cashOpening.id,
        true,
      );
      this.assertOpeningResponsible(opening, user);

      const paymentMethod = await manager.findOneBy(PaymentMethod, {
        id: dto.paymentMethodId,
      });
      if (!paymentMethod) {
        throw new NotFoundException(
          `PaymentMethod ${dto.paymentMethodId} no encontrado`,
        );
      }
      if (!paymentMethod.active) {
        throw new BadRequestException('El método de pago está inactivo');
      }
      if (this.round2(dto.amount) !== sale.totalAmount) {
        throw new BadRequestException(
          'El importe del pago debe coincidir con el total final de la venta',
        );
      }

      const products = await this.findProductsForUpdateOrThrow(
        manager,
        sale.details.map((detail) => detail.product.id),
      );
      const quantities = this.quantitiesByProduct(
        sale.details.map((detail) => ({
          productId: detail.product.id,
          quantity: detail.quantity,
        })),
      );
      for (const product of products) {
        const quantity = quantities.get(product.id) ?? 0;
        if (Number(product.stock) < quantity) {
          throw new BadRequestException(
            `Stock insuficiente para Product ${product.id}`,
          );
        }
        product.stock = this.round2(Number(product.stock) - quantity);
      }
      await manager.save(products);
      const payment = manager.create(SalePayment, {
        sale,
        paymentMethod,
        amount: sale.totalAmount,
        status: SalePaymentStatus.PAID,
      });
      await manager.save(payment);
      sale.payment = payment;
      sale.status = SaleStatus.PAID;
      sale.paidAt = new Date();
      await manager.save(sale);
      return this.findOneWithRelations(manager, sale.id);
    });
  }

  async cancel(id: number, dto: CancelSaleDto, user: JwtUser): Promise<Sale> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const sale = await this.findSaleForUpdateOrThrow(manager, id);
      await this.findOpenOpeningOrThrow(manager, sale.cashOpening.id, true);
      if (
        sale.seller.id !== user.personId &&
        !user.roles.includes('ADMINISTRADOR')
      ) {
        throw new ForbiddenException(
          'Solo el vendedor original o un ADMINISTRADOR puede cancelar la venta',
        );
      }
      if (sale.status === SaleStatus.CANCELLED) {
        throw new BadRequestException('La venta ya está cancelada');
      }

      const cancelledBy = await this.findPersonOrThrow(manager, user.personId);
      if (sale.status === SaleStatus.PAID) {
        if (!sale.payment) {
          throw new BadRequestException(
            'La venta pagada no tiene un pago asociado',
          );
        }
        const products = await this.findProductsForUpdateOrThrow(
          manager,
          sale.details.map((detail) => detail.product.id),
        );
        const quantities = this.quantitiesByProduct(
          sale.details.map((detail) => ({
            productId: detail.product.id,
            quantity: detail.quantity,
          })),
        );
        for (const product of products) {
          product.stock = this.round2(
            Number(product.stock) + (quantities.get(product.id) ?? 0),
          );
        }
        await manager.save(products);
        sale.payment.status = SalePaymentStatus.CANCELLED;
        await manager.save(sale.payment);
        await manager.save(
          manager.create(CashMovement, {
            opening: sale.cashOpening,
            type: CashMovementType.EXPENSE,
            amount: sale.totalAmount,
            reason: `Anulación de venta #${sale.id}: ${dto.cancellationReason}`,
            createdBy: cancelledBy,
          }),
        );
      }

      sale.status = SaleStatus.CANCELLED;
      sale.cancelledAt = new Date();
      sale.cancelledBy = cancelledBy;
      sale.cancellationReason = dto.cancellationReason;
      await manager.save(sale);
      return this.findOneWithRelations(manager, sale.id);
    });
  }

  async findAll(
    filter: FilterSaleDto,
    user: JwtUser,
  ): Promise<PaginatedResult<SaleDto>> {
    const qb = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('sale.seller', 'seller')
      .leftJoinAndSelect('sale.cancelledBy', 'cancelledBy')
      .leftJoinAndSelect('sale.cashOpening', 'cashOpening')
      .leftJoinAndSelect('sale.payment', 'payment')
      .leftJoinAndSelect('payment.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('sale.details', 'details')
      .leftJoinAndSelect('details.product', 'product')
      .leftJoinAndSelect('product.baseProduct', 'baseProduct')
      .orderBy('sale.saleDate', 'DESC');

    if (!user.roles.includes('ADMINISTRADOR')) {
      qb.andWhere('seller.id = :sellerId', { sellerId: user.personId });
    } else if (filter.sellerId !== undefined) {
      qb.andWhere('seller.id = :sellerId', { sellerId: filter.sellerId });
    }
    if (filter.status) {
      qb.andWhere('sale.status = :status', { status: filter.status });
    }
    if (filter.cashOpeningId !== undefined) {
      qb.andWhere('cashOpening.id = :cashOpeningId', {
        cashOpeningId: filter.cashOpeningId,
      });
    }
    if (filter.startDate) {
      qb.andWhere('sale.saleDate >= :startDate', {
        startDate: new Date(filter.startDate),
      });
    }
    if (filter.endDate) {
      qb.andWhere('sale.saleDate <= :endDate', {
        endDate: new Date(filter.endDate),
      });
    }
    qb.skip((filter.page - 1) * filter.limit).take(filter.limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((sale) => SaleDto.fromEntity(sale)),
      total,
      page: filter.page,
      limit: filter.limit,
      lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: number, user: JwtUser): Promise<Sale> {
    const sale = await this.findOneWithRelations(
      this.saleRepository.manager,
      id,
    );
    if (
      !user.roles.includes('ADMINISTRADOR') &&
      sale.seller.id !== user.personId
    ) {
      throw new ForbiddenException(
        'No puede consultar ventas de otro vendedor',
      );
    }
    return sale;
  }

  private async replaceDetails(
    manager: EntityManager,
    sale: Sale,
    details: SaleDetailInput[],
    discount: number,
  ): Promise<void> {
    const products = await this.findProductsForUpdateOrThrow(
      manager,
      details.map((detail) => detail.productId),
    );
    const quantities = this.quantitiesByProduct(details);
    for (const product of products) {
      if (Number(product.stock) < (quantities.get(product.id) ?? 0)) {
        throw new BadRequestException(
          `Stock insuficiente para Product ${product.id}`,
        );
      }
    }
    const subtotal = details.reduce((total, detail) => {
      const product = products.find((item) => item.id === detail.productId);
      return total + Number(product?.price) * detail.quantity;
    }, 0);
    if (discount > subtotal) {
      throw new BadRequestException(
        'El descuento no puede exceder el subtotal',
      );
    }
    await manager
      .createQueryBuilder()
      .delete()
      .from(SaleDetail)
      .where('"saleId" = :saleId', { saleId: sale.id })
      .execute();
    const saleDetails = details.map((detail) => {
      const product = products.find((item) => item.id === detail.productId);
      const mainUnit = product.baseProduct.units.find((unit) => unit.isMain);
      if (!mainUnit) {
        throw new BadRequestException(
          `Product ${product.id} no tiene una unidad principal`,
        );
      }
      return manager.create(SaleDetail, {
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
      });
    });
    await manager.save(saleDetails);
    sale.details = saleDetails;
    sale.discount = this.round2(discount);
    sale.totalAmount = this.round2(subtotal - discount);
    await manager.save(sale);
  }

  private async findSaleForUpdateOrThrow(
    manager: EntityManager,
    id: number,
  ): Promise<Sale> {
    const sale = await manager
      .createQueryBuilder(Sale, 'sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('sale.seller', 'seller')
      .leftJoinAndSelect('sale.cashOpening', 'cashOpening')
      .leftJoinAndSelect('sale.payment', 'payment')
      .leftJoinAndSelect('sale.details', 'details')
      .leftJoinAndSelect('details.product', 'detailProduct')
      .setLock('pessimistic_write', undefined, ['sale'])
      .where('sale.id = :id', { id })
      .getOne();
    if (!sale) {
      throw new NotFoundException(`Sale ${id} no encontrada`);
    }
    return sale;
  }

  private async findOneWithRelations(
    manager: EntityManager,
    id: number,
  ): Promise<Sale> {
    const sale = await manager.findOne(Sale, {
      where: { id },
      relations: {
        customer: true,
        seller: true,
        cancelledBy: true,
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

  private async findOpenOpeningOrThrow(
    manager: EntityManager,
    id: number,
    lock = false,
  ): Promise<CashRegisterOpening> {
    const qb = manager
      .createQueryBuilder(CashRegisterOpening, 'opening')
      .leftJoinAndSelect('opening.responsible', 'responsible')
      .where('opening.id = :id', { id });
    if (lock) {
      qb.setLock('pessimistic_write', undefined, ['opening']);
    }
    const opening = await qb.getOne();
    if (!opening) {
      throw new NotFoundException(`CashRegisterOpening ${id} no encontrada`);
    }
    if (opening.status !== CashOpeningStatus.OPEN) {
      throw new BadRequestException(
        'Solo se puede operar en una sesión abierta',
      );
    }
    return opening;
  }

  private assertOpeningResponsible(
    opening: CashRegisterOpening,
    user: JwtUser,
  ): void {
    if (opening.responsible.id !== user.personId) {
      throw new ForbiddenException(
        'Solo la persona responsable de la sesión puede operar ventas',
      );
    }
  }

  private assertPending(sale: Sale): void {
    if (sale.status !== SaleStatus.PENDING) {
      throw new BadRequestException('La venta debe estar pendiente');
    }
  }

  private async findProductsForUpdateOrThrow(
    manager: EntityManager,
    productIds: number[],
  ): Promise<Product[]> {
    const ids = [...new Set(productIds)].sort((a, b) => a - b);
    const products = await manager
      .createQueryBuilder(Product, 'product')
      .leftJoinAndSelect('product.baseProduct', 'baseProduct')
      .leftJoinAndSelect('baseProduct.units', 'units')
      .leftJoinAndSelect('units.unit', 'unit')
      .setLock('pessimistic_write', undefined, ['product'])
      .where('product.id IN (:...ids)', { ids })
      .getMany();
    if (products.length !== ids.length) {
      const foundIds = new Set(products.map((product) => product.id));
      const missingId = ids.find((id) => !foundIds.has(id));
      throw new NotFoundException(`Product ${missingId} no encontrado`);
    }
    return products;
  }

  private quantitiesByProduct(
    details: Array<{ productId: number; quantity: number }>,
  ): Map<number, number> {
    return details.reduce((quantities, detail) => {
      quantities.set(
        detail.productId,
        (quantities.get(detail.productId) ?? 0) + detail.quantity,
      );
      return quantities;
    }, new Map<number, number>());
  }

  private async findPersonOrThrow(
    manager: EntityManager,
    id: number,
  ): Promise<Person> {
    const person = await manager.findOneBy(Person, { id });
    if (!person) {
      throw new NotFoundException(`Person ${id} no encontrada`);
    }
    return person;
  }

  private round2(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
  }
}
