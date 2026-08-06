import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitOfWork } from '@/database/unitOfWork';
import { Product } from '../../products/entities/producto.entity';
import { Image } from '../entities/image.entity';
import { ImageDto } from '../dtos/image.dto';
import { CreateImageDto } from '../dtos/create-image.dto';
import { SetMainImageDto } from '../dtos/set-main-image.dto';
import type { StorageService } from '../storage/storage.service';

@Injectable()
export class ImagesService {
  constructor(
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject('STORAGE_SERVICE')
    private readonly storageService: StorageService,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(
    file: Express.Multer.File | undefined,
    dto: CreateImageDto,
  ): Promise<ImageDto> {
    if (!file) {
      throw new BadRequestException('El archivo es obligatorio');
    }

    await this.assertEntityExists(dto.entityType, dto.entityId);

    const url = await this.storageService.save(file);

    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;

      const existingCount = await manager.count(Image, {
        where: {
          entityType: dto.entityType,
          entityId: dto.entityId,
        },
      });

      const image = manager.create(Image, {
        url,
        entityType: dto.entityType,
        entityId: dto.entityId,
        isMain: existingCount === 0,
      });

      try {
        await manager.save(image);
      } catch (error) {
        await this.storageService.remove(url);
        throw error;
      }

      return ImageDto.fromEntity(image);
    });
  }

  async findAll(entityType: string, entityId: number): Promise<ImageDto[]> {
    const images = await this.imageRepository.find({
      where: { entityType, entityId },
      order: { isMain: 'DESC', id: 'ASC' },
    });
    return images.map((img) => ImageDto.fromEntity(img));
  }

  async setMain(id: number, dto: SetMainImageDto): Promise<ImageDto> {
    if (dto.isMain !== true) {
      throw new BadRequestException('Solo se admite isMain: true');
    }

    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;

      const image = await manager.findOne(Image, { where: { id } });
      if (!image) {
        throw new NotFoundException(`Image ${id} no encontrada`);
      }

      await manager.update(
        Image,
        { entityType: image.entityType, entityId: image.entityId },
        { isMain: false },
      );
      image.isMain = true;
      await manager.save(image);

      return ImageDto.fromEntity(image);
    });
  }

  async remove(id: number): Promise<void> {
    return this.unitOfWork.execute(async (queryRunner) => {
      const manager = queryRunner.manager;

      const image = await manager.findOne(Image, { where: { id } });
      if (!image) {
        throw new NotFoundException(`Image ${id} no encontrada`);
      }

      await manager.delete(Image, { id });
      await this.storageService.remove(image.url);
    });
  }

  private async assertEntityExists(
    entityType: string,
    entityId: number,
  ): Promise<void> {
    if (entityType === 'product') {
      const product = await this.productRepository.findOneBy({ id: entityId });
      if (!product) {
        throw new NotFoundException(`Product ${entityId} no encontrado`);
      }
      return;
    }
    throw new BadRequestException(`entityType "${entityType}" no soportado`);
  }
}
