import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { UnitOfWork } from '@/database/unitOfWork';
import { BUSINESS_TIME_ZONE } from '@/common/constants/business-time-zone';
import { isUniqueViolation } from '@/common/utils/pg-errors';
import type { JwtUser } from '@/modules/auth/decorators/current-user.decorator';
import { Person } from '@/modules/people/entities/person.entity';
import {
  SalePayment,
  SalePaymentStatus,
} from '@/modules/sales/entities/sale-payment.entity';
import { PaymentMethod } from '@/modules/sales/entities/payment-method.entity';
import {
  CashMovement,
  CashMovementType,
} from '../entities/cash-movement.entity';
import { CashRegister } from '../entities/cash-register.entity';
import {
  CashOpeningStatus,
  CashRegisterOpening,
} from '../entities/cash-register-opening.entity';
import { ClosingDetail } from '../entities/closing-detail.entity';
import { CloseCashRegisterOpeningDto } from '../dtos/cash-register-opening/close-cash-register-opening.dto';
import { CreateCashRegisterOpeningDto } from '../dtos/cash-register-opening/create-cash-register-opening.dto';
import { FilterCashRegisterOpeningsDto } from '../dtos/cash-register-opening/filter-cash-register-openings.dto';

const STAFF_ROLES = ['TRABAJADOR', 'ADMINISTRADOR'];

type AmountRow = { paymentMethodId?: number; amount?: string };

@Injectable()
export class CashRegisterOpeningsService {
  constructor(
    @InjectRepository(CashRegisterOpening)
    private readonly openingRepository: Repository<CashRegisterOpening>,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(
    dto: CreateCashRegisterOpeningDto,
    user: JwtUser,
  ): Promise<CashRegisterOpening> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const register = await manager.findOneBy(CashRegister, {
        id: dto.cashRegisterId,
      });
      if (!register) {
        throw new NotFoundException(
          `CashRegister ${dto.cashRegisterId} no encontrada`,
        );
      }
      if (!register.active) {
        throw new BadRequestException('No se puede abrir una caja inactiva');
      }
      const openedBy = await this.findPersonOrThrow(manager, user.personId);
      const responsible = user.roles.includes('TRABAJADOR')
        ? openedBy
        : await this.findCashResponsibleOrThrow(manager, dto.responsibleId);
      const existing = await manager.findOneBy(CashRegisterOpening, {
        cashRegister: { id: register.id },
        status: CashOpeningStatus.OPEN,
      });
      if (existing) {
        throw new ConflictException('La caja ya tiene una sesión abierta');
      }
      try {
        return await manager.save(
          manager.create(CashRegisterOpening, {
            cashRegister: register,
            openedBy,
            responsible,
            openingAmount: this.round2(dto.openingAmount),
          }),
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictException('La caja ya tiene una sesión abierta');
        }
        throw error;
      }
    });
  }

  findAll(
    filter: FilterCashRegisterOpeningsDto,
  ): Promise<CashRegisterOpening[]> {
    const startsAt = DateTime.fromObject(
      { year: filter.year, month: filter.month, day: 1 },
      { zone: BUSINESS_TIME_ZONE },
    )
      .startOf('day')
      .toUTC()
      .toJSDate();
    const endsAt = DateTime.fromObject(
      { year: filter.year, month: filter.month, day: 1 },
      { zone: BUSINESS_TIME_ZONE },
    )
      .plus({ months: 1 })
      .startOf('day')
      .toUTC()
      .toJSDate();

    return this.openingRepository
      .createQueryBuilder('opening')
      .leftJoinAndSelect('opening.cashRegister', 'cashRegister')
      .leftJoinAndSelect('opening.openedBy', 'openedBy')
      .leftJoinAndSelect('opening.responsible', 'responsible')
      .leftJoinAndSelect('opening.closedBy', 'closedBy')
      .where('cashRegister.id = :cashRegisterId', {
        cashRegisterId: filter.cashRegisterId,
      })
      .andWhere('opening.openedAt >= :startsAt', { startsAt })
      .andWhere('opening.openedAt < :endsAt', { endsAt })
      .orderBy('opening.openedAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<CashRegisterOpening> {
    const opening = await this.openingRepository.findOne({
      where: { id },
      relations: {
        cashRegister: true,
        openedBy: true,
        responsible: true,
        closedBy: true,
        closingDetails: { paymentMethod: true },
      },
    });
    if (!opening) {
      throw new NotFoundException(`CashRegisterOpening ${id} no encontrada`);
    }
    return opening;
  }

  async close(
    id: number,
    dto: CloseCashRegisterOpeningDto,
    user: JwtUser,
  ): Promise<CashRegisterOpening> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const opening = await manager
        .createQueryBuilder(CashRegisterOpening, 'opening')
        .leftJoinAndSelect('opening.openedBy', 'openedBy')
        .setLock('pessimistic_write', undefined, ['opening'])
        .where('opening.id = :id', { id })
        .getOne();
      if (!opening) {
        throw new NotFoundException(`CashRegisterOpening ${id} no encontrada`);
      }
      if (opening.status !== CashOpeningStatus.OPEN) {
        throw new ConflictException('La sesión ya está cerrada');
      }
      if (
        opening.openedBy.id !== user.personId &&
        !user.roles.includes('ADMINISTRADOR')
      ) {
        throw new ForbiddenException(
          'Solo quien abrió la sesión o un ADMINISTRADOR puede cerrarla',
        );
      }
      const activeMethods = await manager.find(PaymentMethod, {
        where: { active: true },
        order: { id: 'ASC' },
      });
      const submittedIds = new Set(
        dto.details.map((detail) => detail.paymentMethodId),
      );
      if (
        activeMethods.length !== dto.details.length ||
        activeMethods.some((method) => !submittedIds.has(method.id))
      ) {
        throw new BadRequestException(
          'Debe informar el monto real de cada método de pago activo',
        );
      }

      const expectedByMethod = await this.paymentAmounts(manager, id);
      const movementAmounts = await this.movementAmounts(manager, id);
      const details = activeMethods.map((method) => {
        const paymentAmount = expectedByMethod.get(method.id) ?? 0;
        const expected =
          method.name === 'Efectivo'
            ? Number(opening.openingAmount) +
              paymentAmount +
              movementAmounts.income -
              movementAmounts.expense
            : paymentAmount;
        const real = dto.details.find(
          (detail) => detail.paymentMethodId === method.id,
        )?.realAmount;
        if (real === undefined) {
          throw new BadRequestException(
            'Falta el monto real de un método de pago activo',
          );
        }
        return manager.create(ClosingDetail, {
          opening,
          paymentMethod: method,
          expectedAmount: this.round2(expected),
          realAmount: this.round2(real),
          difference: this.round2(real - expected),
        });
      });
      await manager.save(details);

      const expectedAmount = details.reduce(
        (total, detail) => total + Number(detail.expectedAmount),
        0,
      );
      const realAmount = details.reduce(
        (total, detail) => total + Number(detail.realAmount),
        0,
      );
      opening.status = CashOpeningStatus.CLOSED;
      opening.closedAt = new Date();
      opening.closedBy = await this.findPersonOrThrow(manager, user.personId);
      opening.expectedAmount = this.round2(expectedAmount);
      opening.realAmount = this.round2(realAmount);
      opening.difference = this.round2(realAmount - expectedAmount);
      await manager.save(opening);
      return this.findOneWithDetails(manager, opening.id);
    });
  }

  private async paymentAmounts(
    manager: EntityManager,
    openingId: number,
  ): Promise<Map<number, number>> {
    const rows = await manager
      .createQueryBuilder(SalePayment, 'payment')
      .innerJoin('payment.sale', 'sale')
      .select('payment."paymentMethodId"', 'paymentMethodId')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'amount')
      .where('sale."cashOpeningId" = :openingId', { openingId })
      .andWhere('payment.status = :paymentStatus', {
        paymentStatus: SalePaymentStatus.PAID,
      })
      .groupBy('payment."paymentMethodId"')
      .getRawMany<AmountRow>();
    return new Map(
      rows.map((row) => [Number(row.paymentMethodId), Number(row.amount)]),
    );
  }

  private async movementAmounts(
    manager: EntityManager,
    openingId: number,
  ): Promise<{ income: number; expense: number }> {
    const rows = await manager
      .createQueryBuilder(CashMovement, 'movement')
      .select(
        `COALESCE(SUM(CASE WHEN movement.type = :income THEN movement.amount ELSE 0 END), 0)`,
        'income',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN movement.type = :expense THEN movement.amount ELSE 0 END), 0)`,
        'expense',
      )
      .where('movement."openingId" = :openingId', { openingId })
      .setParameters({
        income: CashMovementType.INCOME,
        expense: CashMovementType.EXPENSE,
      })
      .getRawOne<{ income: string; expense: string }>();
    return {
      income: Number(rows?.income ?? 0),
      expense: Number(rows?.expense ?? 0),
    };
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

  private async findCashResponsibleOrThrow(
    manager: EntityManager,
    id: number | undefined,
  ): Promise<Person> {
    if (!id) {
      throw new BadRequestException(
        'Un ADMINISTRADOR debe indicar un responsable operativo',
      );
    }
    const person = await manager
      .createQueryBuilder(Person, 'person')
      .innerJoin('person.auth', 'auth')
      .innerJoin('person.roles', 'role')
      .where('person.id = :id', { id })
      .andWhere('role.name IN (:...roles)', { roles: STAFF_ROLES })
      .getOne();
    if (!person) {
      throw new BadRequestException(
        'El responsable no es una persona operativa',
      );
    }
    return person;
  }

  private async findOneWithDetails(
    manager: EntityManager,
    id: number,
  ): Promise<CashRegisterOpening> {
    const opening = await manager.findOne(CashRegisterOpening, {
      where: { id },
      relations: {
        cashRegister: true,
        openedBy: true,
        responsible: true,
        closedBy: true,
        closingDetails: { paymentMethod: true },
      },
    });
    if (!opening) {
      throw new NotFoundException(`CashRegisterOpening ${id} no encontrada`);
    }
    return opening;
  }

  private round2(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
  }
}
