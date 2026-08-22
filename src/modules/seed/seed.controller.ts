import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { SeedService } from './seed.service';

@Public()
@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('add')
  @ApiOperation({ summary: 'Crear datos de prueba' })
  @ApiResponse({ status: 201, description: 'Datos de prueba creados' })
  @ApiResponse({ status: 409, description: 'Ya existe información sembrada' })
  add() {
    return this.seedService.add();
  }

  @Post('drop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar los datos principales de prueba' })
  @ApiResponse({ status: 200, description: 'Datos principales eliminados' })
  drop() {
    return this.seedService.drop();
  }
}
