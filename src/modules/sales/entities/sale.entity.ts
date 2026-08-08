import {
  Column,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Person } from '@/modules/people/entities/person.entity';
import { SaleDetail } from './sale-detail.entity';

@Entity('sale')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  saleDate: Date;

  @ManyToOne(() => Person, (person) => person.sales, { nullable: false })
  customer: Person;

  @ManyToOne(() => Person, (person) => person.salesAsSeller, {
    nullable: false,
  })
  seller: Person;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: string;

  @OneToMany(() => SaleDetail, (detail) => detail.sale, { cascade: true })
  details: SaleDetail[];

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date | null;
}
