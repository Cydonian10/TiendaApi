import {
  Column,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CashRegisterOpening } from './cash-register-opening.entity';

@Entity('cash_register')
export class CashRegister {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => CashRegisterOpening, (opening) => opening.cashRegister)
  openings: CashRegisterOpening[];

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date | null;
}
