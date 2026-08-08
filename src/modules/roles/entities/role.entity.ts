import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Person } from '@/modules/people/entities/person.entity';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @ManyToMany(() => Person, (person) => person.roles)
  persons: Person[];
}
