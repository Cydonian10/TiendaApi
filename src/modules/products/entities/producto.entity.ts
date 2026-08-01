import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseProduct } from "./base-product.entity";

@Entity('product')
export class Product {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @ManyToOne(() => BaseProduct, (baseProduct) => baseProduct.products, { nullable: false })
    baseProduct: BaseProduct;

}