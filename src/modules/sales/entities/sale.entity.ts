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

export enum SaleStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

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

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.PENDING })
  status: SaleStatus;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @ManyToOne(() => Person, { nullable: true })
  cancelledBy: Person | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cancellationReason: string | null;

  @OneToMany(() => SaleDetail, (detail) => detail.sale, { cascade: true })
  details: SaleDetail[];

  @OneToOne(() => SalePayment, (payment) => payment.sale, { cascade: true })
  payment: SalePayment | null;

  @ManyToOne(() => CashRegisterOpening, (opening) => opening.sales, {
    nullable: false,
  })
  cashOpening: CashRegisterOpening;

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date | null;
}
