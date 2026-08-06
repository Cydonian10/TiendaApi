import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './producto.entity';
import { BaseProductUnit } from '../../measurement-units/entities/baseProduct-unit.entity';

@Entity('base_product')
export class BaseProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @OneToMany(() => Product, (product) => product.baseProduct)
  products: Product[];

  @OneToMany(() => BaseProductUnit, (bpu) => bpu.baseProduct)
  units: BaseProductUnit[];

  productCount?: number;
}
