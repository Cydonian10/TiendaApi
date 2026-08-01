import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { AttributeValue } from "./attribute-value.entity";

@Entity('attribute')
export class Attribute {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @OneToMany(() => AttributeValue, (attributeValue) => attributeValue.attribute)
    values: AttributeValue[];
}