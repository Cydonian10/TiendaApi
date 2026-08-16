import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './producto.entity';
import { BaseProductUnit } from '../../measurement-units/entities/baseProduct-unit.entity';
import { Brand } from './brand.entity';
import { Category } from './category.entity';

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

  @ManyToOne(() => Brand, (brand) => brand.baseProducts, { nullable: true })
  @JoinColumn({ name: 'brandId' })
  brand: Brand | null;

  @Column({ type: 'integer', nullable: true })
  brandId: number | null;

  @ManyToMany(() => Category, (category) => category.baseProducts)
  @JoinTable({
    name: 'base_product_category',
    joinColumn: { name: 'baseProductId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories: Category[];

  productCount?: number;

  unitCount?: number;
}
