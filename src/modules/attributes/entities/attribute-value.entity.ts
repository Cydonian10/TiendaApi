import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Attribute } from './attribute.entity';

@Entity('attribute_value')
@Index('UQ_attribute_value_attributeId_value', ['attribute', 'value'], {
  unique: true,
})
export class AttributeValue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  value: string;

  @ManyToOne(() => Attribute, (attribute) => attribute.values, {
    nullable: false,
  })
  attribute: Attribute;
}
