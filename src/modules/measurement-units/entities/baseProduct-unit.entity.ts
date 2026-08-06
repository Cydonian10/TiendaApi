import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MeasurementUnit } from './measurement-unit.entity';
import { BaseProduct } from '@/modules/products/entities/base-product.entity';

@Entity('base-product-unit')
@Index('UQ_product_unit_productId_unitId', ['baseProduct', 'unit'], {
  unique: true,
})
@Index('UQ_product_unit_productId_isMain', ['baseProduct'], {
  unique: true,
  where: '"isMain"',
})
export class BaseProductUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BaseProduct, { nullable: false })
  baseProduct: BaseProduct;

  @ManyToOne(() => MeasurementUnit, { nullable: false })
  unit: MeasurementUnit;

  @Column({ type: 'boolean', default: false })
  isMain: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  factor: string;
}
