import { ApiProperty } from '@nestjs/swagger';
import { CashMovement } from '../entities/cash-movement.entity';
import { CashRegister } from '../entities/cash-register.entity';
import {
  CashOpeningStatus,
  CashRegisterOpening,
} from '../entities/cash-register-opening.entity';
import { ClosingDetail } from '../entities/closing-detail.entity';
import { PaymentMethod } from '@/modules/sales/entities/payment-method.entity';
import { Person } from '@/modules/people/entities/person.entity';

export class CashResponsibleDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Ana' })
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  lastName: string;

  static fromEntity(person: Person): CashResponsibleDto {
    return Object.assign(new CashResponsibleDto(), {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
    });
  }
}

export class CashRegisterOpeningSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2026-09-09T10:00:00.000Z' })
  openedAt: Date;

  @ApiProperty({ example: 100 })
  openingAmount: number;

  @ApiProperty({ example: 'open', enum: ['open'] })
  status: CashOpeningStatus.OPEN;

  @ApiProperty({ type: () => CashResponsibleDto })
  responsible: CashResponsibleDto;

  static fromEntity(
    opening: CashRegisterOpening,
  ): CashRegisterOpeningSummaryDto {
    return Object.assign(new CashRegisterOpeningSummaryDto(), {
      id: opening.id,
      openedAt: opening.openedAt,
      openingAmount: Number(opening.openingAmount),
      status: CashOpeningStatus.OPEN,
      responsible: CashResponsibleDto.fromEntity(opening.responsible),
    });
  }
}

export class CashRegisterDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'CAJA-01' })
  code: string;

  @ApiProperty({ example: 'Caja principal' })
  name: string;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ type: () => CashRegisterOpeningSummaryDto, nullable: true })
  openOpening: CashRegisterOpeningSummaryDto | null;

  static fromEntity(register: CashRegister): CashRegisterDto {
    return Object.assign(new CashRegisterDto(), {
      id: register.id,
      code: register.code,
      name: register.name,
      active: register.active,
      openOpening: register.openOpening
        ? CashRegisterOpeningSummaryDto.fromEntity(register.openOpening)
        : null,
    });
  }
}

export class PaymentMethodDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Efectivo' })
  name: string;

  @ApiProperty({ example: true })
  active: boolean;

  static fromEntity(method: PaymentMethod): PaymentMethodDto {
    return Object.assign(new PaymentMethodDto(), {
      id: method.id,
      name: method.name,
      active: method.active,
    });
  }
}

export class ClosingDetailDto {
  @ApiProperty({ type: () => PaymentMethodDto })
  paymentMethod: PaymentMethodDto;

  @ApiProperty({ example: 120 })
  expectedAmount: number;

  @ApiProperty({ example: 118 })
  realAmount: number;

  @ApiProperty({ example: -2 })
  difference: number;

  static fromEntity(detail: ClosingDetail): ClosingDetailDto {
    return Object.assign(new ClosingDetailDto(), {
      paymentMethod: PaymentMethodDto.fromEntity(detail.paymentMethod),
      expectedAmount: Number(detail.expectedAmount),
      realAmount: Number(detail.realAmount),
      difference: Number(detail.difference),
    });
  }
}

export class CashRegisterOpeningDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ type: () => CashRegisterDto })
  cashRegister: CashRegisterDto;

  @ApiProperty({ example: 1 })
  openedById: number;

  @ApiProperty({ type: () => CashResponsibleDto })
  openedBy: CashResponsibleDto;

  @ApiProperty({ type: () => CashResponsibleDto })
  responsible: CashResponsibleDto;

  @ApiProperty({ example: 1, nullable: true })
  closedById: number | null;

  @ApiProperty({ example: 'open', enum: ['open', 'closed'] })
  status: string;

  @ApiProperty({ example: '2026-09-09T10:00:00.000Z' })
  openedAt: Date;

  @ApiProperty({ example: 100 })
  openingAmount: number;

  @ApiProperty({ example: 120 })
  expectedAmount: number;

  @ApiProperty({ example: 118, nullable: true })
  realAmount: number | null;

  @ApiProperty({ example: -2, nullable: true })
  difference: number | null;

  @ApiProperty({ type: () => [ClosingDetailDto] })
  closingDetails: ClosingDetailDto[];

  static fromEntity(opening: CashRegisterOpening): CashRegisterOpeningDto {
    return Object.assign(new CashRegisterOpeningDto(), {
      id: opening.id,
      cashRegister: CashRegisterDto.fromEntity(opening.cashRegister),
      openedById: opening.openedBy.id,
      openedBy: CashResponsibleDto.fromEntity(opening.openedBy),
      responsible: CashResponsibleDto.fromEntity(opening.responsible),
      closedById: opening.closedBy?.id ?? null,
      status: opening.status,
      openedAt: opening.openedAt,
      openingAmount: Number(opening.openingAmount),
      expectedAmount: Number(opening.expectedAmount),
      realAmount:
        opening.realAmount === null ? null : Number(opening.realAmount),
      difference:
        opening.difference === null ? null : Number(opening.difference),
      closingDetails: (opening.closingDetails ?? []).map((detail) =>
        ClosingDetailDto.fromEntity(detail),
      ),
    });
  }
}

export class CashMovementDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  cashOpeningId: number;

  @ApiProperty({ example: 1 })
  createdById: number;

  @ApiProperty({ enum: ['income', 'expense'] })
  type: string;

  @ApiProperty({ example: 20 })
  amount: number;

  @ApiProperty({ example: 'Cambio inicial adicional' })
  reason: string;

  static fromEntity(movement: CashMovement): CashMovementDto {
    return Object.assign(new CashMovementDto(), {
      id: movement.id,
      cashOpeningId: movement.opening.id,
      createdById: movement.createdBy.id,
      type: movement.type,
      amount: Number(movement.amount),
      reason: movement.reason,
    });
  }
}
