import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Attribute } from "./attribute.entity";

@Entity('attribute_value')
export class AttributeValue {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    value: string;

    @ManyToOne(() => Attribute, (attribute) => attribute.values, { nullable: false })
    attribute: Attribute;
}