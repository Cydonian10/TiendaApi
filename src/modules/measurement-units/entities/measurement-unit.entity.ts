import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('measurement-unit')
export class MeasurementUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 5 })
  value: string;
}
