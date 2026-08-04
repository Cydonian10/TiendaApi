import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { ImagesService } from '../services/images.service';
import { CreateImageDto } from '../dtos/create-image.dto';
import { SetMainImageDto } from '../dtos/set-main-image.dto';

type MulterFile = Express.Multer.File;

const UPLOADS_DIR = join(process.cwd(), 'uploads');

const multerOptions = {
  storage: diskStorage({
    destination: (
      _req: Request,
      _file: MulterFile,
      cb: (error: Error | null, destination: string) => void,
    ) => {
      if (!existsSync(UPLOADS_DIR)) {
        mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      cb(null, UPLOADS_DIR);
    },
    filename: (
      _req: Request,
      file: MulterFile,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      const ext = file.originalname.split('.').pop();
      cb(null, `${randomUUID()}.${ext}`);
    },
  }),
  fileFilter: (
    _req: Request,
    file: MulterFile,
    cb: (error: Error | null, accepted: boolean) => void,
  ) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Formato de imagen no permitido'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImageDto,
  ) {
    return this.imagesService.create(file, dto);
  }

  @Get()
  findAll(
    @Query('entityType') entityType: string,
    @Query('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.imagesService.findAll(entityType, entityId);
  }

  @Patch(':id')
  setMain(@Param('id', ParseIntPipe) id: number, @Body() dto: SetMainImageDto) {
    return this.imagesService.setMain(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.imagesService.remove(id);
  }
}
