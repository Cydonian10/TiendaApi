import {
  Column,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SalePayment } from './sale-payment.entity';

@Entity('payment_method')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => SalePayment, (payment) => payment.paymentMethod)
  salePayments: SalePayment[];

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date | null;
}
