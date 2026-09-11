import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '@/common/utils/pg-errors';
import { PaymentMethod } from '@/modules/sales/entities/payment-method.entity';
import { CreatePaymentMethodDto } from '../dtos/payment-method/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dtos/payment-method/update-payment-method.dto';

const CASH_PAYMENT_METHOD = 'Efectivo';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
  ) {}

  async findAll(): Promise<PaymentMethod[]> {
    await this.ensureCashPaymentMethod();
    return this.paymentMethodRepository.find({
      where: { active: true },
      order: { id: 'ASC' },
    });
  }

  async create(dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    try {
      return await this.paymentMethodRepository.save(
        this.paymentMethodRepository.create({ name: dto.name }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Ya existe el método de pago "${dto.name}"`,
        );
      }
      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    const method = await this.findOneOrThrow(id);
    if (method.name === CASH_PAYMENT_METHOD && dto.name !== undefined) {
      throw new ConflictException('El método Efectivo no puede ser renombrado');
    }
    if (dto.name !== undefined) {
      method.name = dto.name;
    }
    try {
      return await this.paymentMethodRepository.save(method);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Ya existe el método de pago "${dto.name}"`,
        );
      }
      throw error;
    }
  }

  async activate(id: number): Promise<PaymentMethod> {
    const method = await this.findOneOrThrow(id);
    method.active = true;
    return this.paymentMethodRepository.save(method);
  }

  async deactivate(id: number): Promise<PaymentMethod> {
    const method = await this.findOneOrThrow(id);
    if (method.name === CASH_PAYMENT_METHOD) {
      throw new ConflictException('El método Efectivo debe permanecer activo');
    }
    method.active = false;
    return this.paymentMethodRepository.save(method);
  }

  private async ensureCashPaymentMethod(): Promise<void> {
    const method = await this.paymentMethodRepository.findOneBy({
      name: CASH_PAYMENT_METHOD,
    });
    if (!method) {
      await this.paymentMethodRepository.save(
        this.paymentMethodRepository.create({
          name: CASH_PAYMENT_METHOD,
          active: true,
        }),
      );
    } else if (!method.active) {
      method.active = true;
      await this.paymentMethodRepository.save(method);
    }
  }

  private async findOneOrThrow(id: number): Promise<PaymentMethod> {
    const method = await this.paymentMethodRepository.findOneBy({ id });
    if (!method) {
      throw new NotFoundException(`PaymentMethod ${id} no encontrado`);
    }
    return method;
  }
}
