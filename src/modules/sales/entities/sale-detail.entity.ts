import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '@/modules/products/entities/producto.entity';
import { MeasurementUnit } from '@/modules/measurement-units/entities/measurement-unit.entity';
import { Sale } from './sale.entity';

@Entity('sale_detail')
export class SaleDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, (sale) => sale.details, { nullable: false })
  sale: Sale;

  @ManyToOne(() => Product, { nullable: false })
  product: Product;

  @Column({ type: 'varchar', length: 255 })
  productName: string;

  @Column({ type: 'varchar', length: 255 })
  baseProductName: string;

  @ManyToOne(() => MeasurementUnit, { nullable: false })
  unit: MeasurementUnit;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;
}
