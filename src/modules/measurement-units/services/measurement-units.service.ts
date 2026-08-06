import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeasurementUnit } from '../entities/measurement-unit.entity';
import { MeasurementUnitDto } from '../dtos/measurement-unit/measurement-unit.dto';
import { MeasurementUnitFilterDto } from '../dtos/measurement-unit/measurement-unit-filter.dto';
import { CreateMeasurementUnitDto } from '../dtos/measurement-unit/create-measurement-unit.dto';
import { UpdateMeasurementUnitDto } from '../dtos/measurement-unit/update-measurement-unit.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '@/common/utils/pg-errors';

@Injectable()
export class MeasurementUnitsService {
  constructor(
    @InjectRepository(MeasurementUnit)
    private readonly measurementUnitRepository: Repository<MeasurementUnit>,
  ) {}

  async findAll(
    filter: MeasurementUnitFilterDto,
  ): Promise<PaginatedResult<MeasurementUnitDto>> {
    const qb = this.measurementUnitRepository.createQueryBuilder('mu');
    if (filter.search) {
      qb.andWhere(`unaccent(LOWER(mu.name)) ILIKE unaccent(LOWER(:q))`, {
        q: `%${filter.search}%`,
      });
    }
    qb.skip((filter.page - 1) * filter.limit).take(filter.limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => MeasurementUnitDto.fromEntity(row)),
      total,
      page: filter.page,
      limit: filter.limit,
      lastPage: total === 0 ? 0 : Math.ceil(total / filter.limit),
    };
  }

  async findOne(id: number): Promise<MeasurementUnitDto> {
    const unit = await this.measurementUnitRepository.findOneBy({ id });
    if (!unit) {
      throw new NotFoundException(`Unidad de medida ${id} no encontrada`);
    }
    return MeasurementUnitDto.fromEntity(unit);
  }

  async create(dto: CreateMeasurementUnitDto): Promise<MeasurementUnitDto> {
    const unit = this.measurementUnitRepository.create({
      name: dto.name,
      value: dto.value,
    });
    try {
      await this.measurementUnitRepository.save(unit);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe una unidad con nombre "${dto.name}" o abreviatura "${dto.value}"`,
        );
      }
      throw e;
    }
    return MeasurementUnitDto.fromEntity(unit);
  }

  async update(
    id: number,
    dto: UpdateMeasurementUnitDto,
  ): Promise<MeasurementUnitDto> {
    const unit = await this.measurementUnitRepository.findOneBy({ id });
    if (!unit) {
      throw new NotFoundException(`Unidad de medida ${id} no encontrada`);
    }
    if (dto.name !== undefined) {
      unit.name = dto.name;
    }
    if (dto.value !== undefined) {
      unit.value = dto.value;
    }
    try {
      await this.measurementUnitRepository.save(unit);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException(
          `Ya existe una unidad con nombre "${dto.name}" o abreviatura "${dto.value}"`,
        );
      }
      throw e;
    }
    return MeasurementUnitDto.fromEntity(unit);
  }

  async remove(id: number): Promise<void> {
    const unit = await this.measurementUnitRepository.findOneBy({ id });
    if (!unit) {
      throw new NotFoundException(`Unidad de medida ${id} no encontrada`);
    }
    try {
      await this.measurementUnitRepository.delete(id);
    } catch (e) {
      if (isForeignKeyViolation(e)) {
        throw new ConflictException(
          `No se puede eliminar la unidad ${id} porque está asociada a productos base`,
        );
      }
      throw e;
    }
  }
}
