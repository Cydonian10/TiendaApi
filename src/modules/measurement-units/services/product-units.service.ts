import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UnitOfWork } from '@/database/unitOfWork';
import { isUniqueViolation } from '@/common/utils/pg-errors';
import { MeasurementUnit } from '../entities/measurement-unit.entity';
import { BaseProductUnit } from '../entities/baseProduct-unit.entity';
import { BaseProduct } from '@/modules/products/entities/base-product.entity';
import { ProductUnitDto } from '../dtos/product-unit/product-unit.dto';
import { AddProductUnitDto } from '../dtos/product-unit/add-product-unit.dto';
import { UpdateProductUnitDto } from '../dtos/product-unit/update-product-unit.dto';

@Injectable()
export class ProductUnitsService {
  constructor(
    @InjectRepository(BaseProductUnit)
    private readonly productUnitRepository: Repository<BaseProductUnit>,
    @InjectRepository(BaseProduct)
    private readonly baseProductRepository: Repository<BaseProduct>,
    @InjectRepository(MeasurementUnit)
    private readonly measurementUnitRepository: Repository<MeasurementUnit>,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async findAll(baseProductId: number): Promise<ProductUnitDto[]> {
    await this.ensureBaseProductExists(baseProductId);
    const rows = await this.productUnitRepository.find({
      where: { baseProduct: { id: baseProductId } },
      relations: { unit: true },
      order: { id: 'ASC' },
    });
    return rows.map((row) => ProductUnitDto.fromEntity(row));
  }

  async add(
    baseProductId: number,
    dto: AddProductUnitDto,
  ): Promise<ProductUnitDto> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const baseProduct = await this.baseProductRepository.findOneBy({
        id: baseProductId,
      });
      if (!baseProduct) {
        throw new NotFoundException(
          `BaseProduct ${baseProductId} no encontrado`,
        );
      }

      const unit = await this.measurementUnitRepository.findOneBy({
        id: dto.unitId,
      });
      if (!unit) {
        throw new NotFoundException(
          `Unidad de medida ${dto.unitId} no encontrada`,
        );
      }

      const exists = await manager.findOneBy(BaseProductUnit, {
        baseProduct: { id: baseProductId },
        unit: { id: dto.unitId },
      });
      if (exists) {
        throw new ConflictException(
          `La unidad ${dto.unitId} ya está asociada al base-product ${baseProductId}`,
        );
      }

      if (dto.isMain) {
        await this.degradeMain(manager, baseProductId);
      }

      const productUnit = manager.create(BaseProductUnit, {
        baseProduct,
        unit,
        isMain: dto.isMain ?? false,
        factor: dto.factor?.toFixed(2) ?? '1.00',
      });

      let saved: BaseProductUnit;
      try {
        saved = await manager.save(productUnit);
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new ConflictException(
            `La unidad ${dto.unitId} ya está asociada al base-product ${baseProductId}`,
          );
        }
        throw e;
      }

      const result = await manager.findOneBy(BaseProductUnit, {
        id: saved.id,
      });
      result.unit = unit;
      return ProductUnitDto.fromEntity(result);
    });
  }

  async update(
    baseProductId: number,
    unitId: number,
    dto: UpdateProductUnitDto,
  ): Promise<ProductUnitDto> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const productUnit = await this.findOwned(manager, baseProductId, unitId);

      if (dto.factor !== undefined) {
        productUnit.factor = dto.factor.toFixed(2);
      }
      if (dto.isMain !== undefined && dto.isMain !== productUnit.isMain) {
        if (dto.isMain) {
          await this.degradeMain(manager, baseProductId);
        }
        productUnit.isMain = dto.isMain;
      }

      await manager.save(productUnit);
      const result = await manager.findOneBy(BaseProductUnit, {
        id: productUnit.id,
      });
      result.unit = productUnit.unit;
      return ProductUnitDto.fromEntity(result);
    });
  }

  async remove(baseProductId: number, unitId: number): Promise<void> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;
      const productUnit = await this.findOwned(manager, baseProductId, unitId);

      if (productUnit.isMain) {
        throw new ConflictException(
          `No se puede quitar la unidad ${unitId} porque es la principal del base-product ${baseProductId}. Marca otra como principal antes.`,
        );
      }

      await manager.remove(productUnit);
    });
  }

  private async ensureBaseProductExists(baseProductId: number): Promise<void> {
    const baseProduct = await this.baseProductRepository.findOneBy({
      id: baseProductId,
    });
    if (!baseProduct) {
      throw new NotFoundException(`BaseProduct ${baseProductId} no encontrado`);
    }
  }

  private async findOwned(
    manager: EntityManager,
    baseProductId: number,
    unitId: number,
  ): Promise<BaseProductUnit> {
    const productUnit = await manager.findOne(BaseProductUnit, {
      where: { baseProduct: { id: baseProductId }, unit: { id: unitId } },
      relations: { unit: true },
    });
    if (!productUnit) {
      throw new NotFoundException(
        `La unidad ${unitId} no está asociada al base-product ${baseProductId}`,
      );
    }
    return productUnit;
  }

  private async degradeMain(
    manager: EntityManager,
    baseProductId: number,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(BaseProductUnit)
      .set({ isMain: false })
      .where('"baseProductId" = :baseProductId AND "isMain" = true', {
        baseProductId,
      })
      .execute();
  }
}
