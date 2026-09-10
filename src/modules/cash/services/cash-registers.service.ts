import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegister } from '../entities/cash-register.entity';
import { CreateCashRegisterDto } from '../dtos/cash-register/create-cash-register.dto';
import { UpdateCashRegisterDto } from '../dtos/cash-register/update-cash-register.dto';
import { CashOpeningStatus } from '../entities/cash-register-opening.entity';
import { isUniqueViolation } from '@/common/utils/pg-errors';

@Injectable()
export class CashRegistersService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
  ) {}

  findAll(roles: string[]): Promise<CashRegister[]> {
    const query = this.cashRegisterRepository
      .createQueryBuilder('cashRegister')
      .leftJoinAndMapOne(
        'cashRegister.openOpening',
        'cashRegister.openings',
        'openOpening',
        'openOpening.status = :status AND openOpening.deletedAt IS NULL',
        { status: CashOpeningStatus.OPEN },
      )
      .leftJoinAndSelect('openOpening.responsible', 'responsible')
      .orderBy('cashRegister.id', 'ASC');

    if (!roles.includes('ADMINISTRADOR')) {
      query.where('cashRegister.active = true');
    }

    return query.getMany();
  }

  async create(dto: CreateCashRegisterDto): Promise<CashRegister> {
    return this.saveOrThrowConflict(
      this.cashRegisterRepository.create({
        code: this.trimRequired(dto.code, 'Código'),
        name: this.trimRequired(dto.name, 'Nombre'),
      }),
    );
  }

  async update(id: number, dto: UpdateCashRegisterDto): Promise<CashRegister> {
    const register = await this.findOneOrThrow(id);
    if (dto.code !== undefined) {
      register.code = this.trimRequired(dto.code, 'Código');
    }
    if (dto.name !== undefined) {
      register.name = this.trimRequired(dto.name, 'Nombre');
    }
    if (dto.active !== undefined) {
      if (!dto.active && register.active) {
        await this.ensureNoOpenOpening(id);
      }
      register.active = dto.active;
    }
    return this.saveOrThrowConflict(register);
  }

  async deactivate(id: number): Promise<CashRegister> {
    return this.update(id, { active: false });
  }

  private async findOneOrThrow(id: number): Promise<CashRegister> {
    const register = await this.cashRegisterRepository.findOneBy({ id });
    if (!register) {
      throw new NotFoundException(`CashRegister ${id} no encontrada`);
    }
    return register;
  }

  private trimRequired(value: string, field: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} es obligatorio`);
    }
    return trimmed;
  }

  private async ensureNoOpenOpening(id: number): Promise<void> {
    const register = await this.cashRegisterRepository.findOne({
      where: { id },
      relations: { openings: true },
    });
    if (
      register?.openings.some(
        (opening) => opening.status === CashOpeningStatus.OPEN,
      )
    ) {
      throw new ConflictException(
        'No se puede desactivar una caja con una sesión abierta',
      );
    }
  }

  private async saveOrThrowConflict(
    register: CashRegister,
  ): Promise<CashRegister> {
    try {
      return await this.cashRegisterRepository.save(register);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Ya existe una caja con el código "${register.code}"`,
        );
      }
      throw error;
    }
  }
}
