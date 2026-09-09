import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMethod } from '@/modules/sales/entities/payment-method.entity';
import { CashRegisterOpening } from './cash-register-opening.entity';

@Entity('closing_detail')
export class ClosingDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CashRegisterOpening, (opening) => opening.closingDetails, {
    nullable: false,
  })
  opening: CashRegisterOpening;

  @ManyToOne(() => PaymentMethod, { nullable: false })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  expectedAmount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  realAmount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  difference: string;
}
