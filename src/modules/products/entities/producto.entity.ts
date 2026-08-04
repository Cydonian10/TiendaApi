import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseProduct } from './base-product.entity';
import { ProductAttribute } from './product-attribute.entity';

@Entity('product')
@Index(
  'UQ_product_baseProductId_attributeKey',
  ['baseProduct', 'attributeKey'],
  {
    unique: true,
  },
)
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stock: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  attributeKey: string;

  @ManyToOne(() => BaseProduct, (baseProduct) => baseProduct.products, {
    nullable: false,
  })
  baseProduct: BaseProduct;

  @OneToMany(
    () => ProductAttribute,
    (productAttribute) => productAttribute.product,
  )
  productAttributes: ProductAttribute[];
}
