import {
  Column,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Person } from '@/modules/people/entities/person.entity';
import { SaleDetail } from './sale-detail.entity';
import { SalePayment } from './sale-payment.entity';
import { CashRegisterOpening } from '@/modules/cash/entities/cash-register-opening.entity';

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

  @OneToOne(() => SalePayment, (payment) => payment.sale, { cascade: true })
  payment: SalePayment;

  @ManyToOne(() => CashRegisterOpening, (opening) => opening.sales, {
    nullable: false,
  })
  cashOpening: CashRegisterOpening;

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date | null;
}
