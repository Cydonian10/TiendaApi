import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sale } from './sale.entity';
import { PaymentMethod } from './payment-method.entity';

export enum SalePaymentStatus {
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity('sale_payment')
export class SalePayment {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Sale, (sale) => sale.payment, { nullable: false })
  @JoinColumn()
  sale: Sale;

  @ManyToOne(() => PaymentMethod, (method) => method.salePayments, {
    nullable: false,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({
    type: 'enum',
    enum: SalePaymentStatus,
    default: SalePaymentStatus.PAID,
  })
  status: SalePaymentStatus;
}
