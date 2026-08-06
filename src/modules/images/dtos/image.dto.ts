import { ApiProperty } from '@nestjs/swagger';
import { Image } from '../entities/image.entity';

export class ImageDto {
  @ApiProperty({ example: 1, description: 'ID de la imagen' })
  id: number;

  @ApiProperty({
    example: '/uploads/uuid.jpg',
    description: 'URL de la imagen',
  })
  url: string;

  @ApiProperty({ example: 'product', description: 'Tipo de entidad' })
  entityType: string;

  @ApiProperty({ example: 1, description: 'ID de la entidad' })
  entityId: number;

  @ApiProperty({ example: false, description: 'Es la imagen principal' })
  isMain: boolean;

  static fromEntity(img: Image): ImageDto {
    const dto = new ImageDto();
    dto.id = img.id;
    dto.url = img.url;
    dto.entityType = img.entityType;
    dto.entityId = img.entityId;
    dto.isMain = img.isMain;
    return dto;
  }
}
