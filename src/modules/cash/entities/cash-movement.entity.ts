import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CashRegisterOpening } from './cash-register-opening.entity';

export enum CashMovementType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('cash_movement')
export class CashMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CashRegisterOpening, (opening) => opening.cashMovements, {
    nullable: false,
  })
  opening: CashRegisterOpening;

  @Column({ type: 'enum', enum: CashMovementType })
  type: CashMovementType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
