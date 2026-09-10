import {
  Column,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Person } from '@/modules/people/entities/person.entity';
import { CashRegister } from './cash-register.entity';
import { CashMovement } from './cash-movement.entity';
import { ClosingDetail } from './closing-detail.entity';
import { Sale } from '@/modules/sales/entities/sale.entity';

export enum CashOpeningStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('cash_register_opening')
export class CashRegisterOpening {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CashRegister, (register) => register.openings, {
    nullable: false,
  })
  cashRegister: CashRegister;

  @ManyToOne(() => Person, { nullable: false })
  openedBy: Person;

  @ManyToOne(() => Person, { nullable: false })
  responsible: Person;

  @ManyToOne(() => Person, { nullable: true })
  closedBy: Person | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  openedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({
    type: 'enum',
    enum: CashOpeningStatus,
    default: CashOpeningStatus.OPEN,
  })
  status: CashOpeningStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  openingAmount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  expectedAmount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  realAmount: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  difference: string | null;

  @OneToMany(() => Sale, (sale) => sale.cashOpening)
  sales: Sale[];

  @OneToMany(() => CashMovement, (movement) => movement.opening)
  cashMovements: CashMovement[];

  @OneToMany(() => ClosingDetail, (detail) => detail.opening)
  closingDetails: ClosingDetail[];

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date | null;
}
