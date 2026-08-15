import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseProduct } from './base-product.entity';

@Entity('brand')
export class Brand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @OneToMany(() => BaseProduct, (bp) => bp.brand)
  baseProducts: BaseProduct[];
}
