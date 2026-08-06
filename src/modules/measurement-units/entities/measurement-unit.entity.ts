import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('measurement-unit')
@Index('UQ_measurement_unit_name', ['name'], { unique: true })
@Index('UQ_measurement_unit_value', ['value'], { unique: true })
export class MeasurementUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 5 })
  value: string;
}
