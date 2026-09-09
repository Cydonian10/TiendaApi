import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegister } from '../entities/cash-register.entity';
import { CreateCashRegisterDto } from '../dtos/cash-register/create-cash-register.dto';
import { UpdateCashRegisterDto } from '../dtos/cash-register/update-cash-register.dto';

@Injectable()
export class CashRegistersService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
  ) {}

  findAll(): Promise<CashRegister[]> {
    return this.cashRegisterRepository.find({ order: { id: 'ASC' } });
  }

  create(dto: CreateCashRegisterDto): Promise<CashRegister> {
    return this.cashRegisterRepository.save(
      this.cashRegisterRepository.create({ name: dto.name }),
    );
  }

  async update(id: number, dto: UpdateCashRegisterDto): Promise<CashRegister> {
    const register = await this.findOneOrThrow(id);
    if (dto.name !== undefined) {
      register.name = dto.name;
    }
    return this.cashRegisterRepository.save(register);
  }

  async deactivate(id: number): Promise<CashRegister> {
    const register = await this.findOneOrThrow(id);
    register.active = false;
    return this.cashRegisterRepository.save(register);
  }

  private async findOneOrThrow(id: number): Promise<CashRegister> {
    const register = await this.cashRegisterRepository.findOneBy({ id });
    if (!register) {
      throw new NotFoundException(`CashRegister ${id} no encontrada`);
    }
    return register;
  }
}
