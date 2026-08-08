import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '@/modules/roles/entities/role.entity';
import { Auth } from '@/modules/auth/entities/auth.entity';

@Entity('person')
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'date' })
  birthDate: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  dni: string;

  @ManyToMany(() => Role, (role) => role.persons)
  @JoinTable({
    name: 'person_role',
    joinColumn: { name: 'personId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToOne(() => Auth, (auth) => auth.person)
  auth?: Auth | null;

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date | null;
}
