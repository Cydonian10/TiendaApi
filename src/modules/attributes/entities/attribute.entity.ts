import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttributeValue } from './attribute-value.entity';

@Entity('attribute')
@Index('UQ_attribute_name', ['name'], { unique: true })
export class Attribute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @OneToMany(() => AttributeValue, (attributeValue) => attributeValue.attribute)
  values: AttributeValue[];
}
