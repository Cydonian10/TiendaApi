import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/producto.entity';
import { Image } from './entities/image.entity';
import { ImagesService } from './services/images.service';
import { ImagesController } from './controllers/images.controller';
import { LocalStorageService } from './storage/local-storage.service';
import { MulterExceptionFilter } from './filters/multer.exception-filter';

@Module({
  imports: [TypeOrmModule.forFeature([Image, Product])],
  controllers: [ImagesController],
  providers: [
    ImagesService,
    {
      provide: 'STORAGE_SERVICE',
      useClass: LocalStorageService,
    },
    {
      provide: APP_FILTER,
      useClass: MulterExceptionFilter,
    },
  ],
  exports: [ImagesService],
})
export class ImagesModule {}
