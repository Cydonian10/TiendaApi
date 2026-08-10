import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sale } from './sale.entity';
import { PaymentMethod } from './payment-method.entity';

@Entity('sale_payment')
export class SalePayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, (sale) => sale.payments, { nullable: false })
  sale: Sale;

  @ManyToOne(() => PaymentMethod, (method) => method.salePayments, {
    nullable: false,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;
}
