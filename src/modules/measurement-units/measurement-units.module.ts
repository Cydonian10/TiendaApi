import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseProduct } from '@/modules/products/entities/base-product.entity';
import { MeasurementUnit } from './entities/measurement-unit.entity';
import { BaseProductUnit } from './entities/baseProduct-unit.entity';
import { MeasurementUnitsService } from './services/measurement-units.service';
import { ProductUnitsService } from './services/product-units.service';
import { MeasurementUnitsController } from './controllers/measurement-units.controller';
import { ProductUnitsController } from './controllers/product-units.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeasurementUnit, BaseProductUnit, BaseProduct]),
  ],
  controllers: [MeasurementUnitsController, ProductUnitsController],
  providers: [MeasurementUnitsService, ProductUnitsService],
})
export class MeasurementUnitsModule {}
