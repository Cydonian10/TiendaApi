import { Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Attribute } from '../../attributes/entities/attribute.entity';
import { AttributeValue } from '../../attributes/entities/attribute-value.entity';
import { Product } from './producto.entity';

@Entity('product_attribute')
@Index('UQ_product_attribute_productId_attributeId', ['product', 'attribute'], {
  unique: true,
})
export class ProductAttribute {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.productAttributes, {
    nullable: false,
  })
  product: Product;

  @ManyToOne(() => Attribute, { nullable: false })
  attribute: Attribute;

  @ManyToOne(() => AttributeValue, { nullable: false })
  attributeValue: AttributeValue;
}
