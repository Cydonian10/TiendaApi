import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '@/database/unitOfWork';
import type { JwtUser } from '@/modules/auth/decorators/current-user.decorator';
import { Person } from '@/modules/people/entities/person.entity';
import { CashMovement } from '../entities/cash-movement.entity';
import {
  CashOpeningStatus,
  CashRegisterOpening,
} from '../entities/cash-register-opening.entity';
import { CreateCashMovementDto } from '../dtos/cash-movement/create-cash-movement.dto';

@Injectable()
export class CashMovementsService {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async create(
    dto: CreateCashMovementDto,
    user: JwtUser,
  ): Promise<CashMovement> {
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
          'Solo se permiten movimientos en una sesión abierta',
        );
      }
      const createdBy = await manager.findOneBy(Person, { id: user.personId });
      if (!createdBy) {
        throw new NotFoundException(`Person ${user.personId} no encontrada`);
      }
      return manager.save(
        manager.create(CashMovement, {
          opening,
          createdBy,
          type: dto.type,
          amount: this.round2(dto.amount),
          reason: dto.reason,
        }),
      );
    });
  }

  private round2(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
  }
}
