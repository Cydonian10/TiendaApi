import { ApiProperty } from '@nestjs/swagger';
import { SaleDetail } from '../../entities/sale-detail.entity';
import { Sale } from '../../entities/sale.entity';

export class SaleDetailDto {
  @ApiProperty({ example: 1, description: 'ID del detalle' })
  id: number;

  @ApiProperty({ example: 1, description: 'ID del producto' })
  productId: number;

  @ApiProperty({
    example: 'Tornillo - Color: Rojo, Tamaño: Grande',
    description: 'Nombre del producto',
  })
  productName: string;

  @ApiProperty({ example: 2, description: 'Cantidad vendida' })
  quantity: number;

  @ApiProperty({
    example: 1.5,
    description: 'Precio unitario al momento de la venta',
  })
  unitPrice: number;

  @ApiProperty({ example: 3, description: 'Subtotal (quantity * unitPrice)' })
  subtotal: number;

  static fromEntity(detail: SaleDetail): SaleDetailDto {
    const dto = new SaleDetailDto();
    dto.id = detail.id;
    dto.productId = detail.product.id;
    dto.productName = detail.product.name;
    dto.quantity = detail.quantity;
    dto.unitPrice = parseFloat(detail.unitPrice);
    dto.subtotal = parseFloat(detail.subtotal);
    return dto;
  }
}

export class SaleDto {
  @ApiProperty({ example: 1, description: 'ID de la venta' })
  id: number;

  @ApiProperty({
    example: '2026-08-08T10:00:00.000Z',
    description: 'Fecha de la venta',
  })
  saleDate: Date;

  @ApiProperty({ example: 1, description: 'ID del cliente (Person)' })
  customerId: number;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo del cliente',
  })
  customerName: string;

  @ApiProperty({ example: 2, description: 'ID del vendedor (Person)' })
  sellerId: number;

  @ApiProperty({
    example: 'Ana Gómez',
    description: 'Nombre completo del vendedor',
  })
  sellerName: string;

  @ApiProperty({ example: 2.5, description: 'Descuento en monto fijo' })
  discount: number;

  @ApiProperty({ example: 12.5, description: 'Total de la venta' })
  totalAmount: number;

  @ApiProperty({
    type: () => [SaleDetailDto],
    description: 'Líneas de la venta',
  })
  details: SaleDetailDto[];

  static fromEntity(sale: Sale): SaleDto {
    const dto = new SaleDto();
    dto.id = sale.id;
    dto.saleDate = sale.saleDate;
    dto.customerId = sale.customer.id;
    dto.customerName = `${sale.customer.firstName} ${sale.customer.lastName}`;
    dto.sellerId = sale.seller.id;
    dto.sellerName = `${sale.seller.firstName} ${sale.seller.lastName}`;
    dto.discount = parseFloat(sale.discount);
    dto.totalAmount = parseFloat(sale.totalAmount);
    dto.details = (sale.details ?? []).map((d) => SaleDetailDto.fromEntity(d));
    return dto;
  }
}
