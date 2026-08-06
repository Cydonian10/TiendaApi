import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductUnitsService } from '../services/product-units.service';
import { AddProductUnitDto } from '../dtos/product-unit/add-product-unit.dto';
import { UpdateProductUnitDto } from '../dtos/product-unit/update-product-unit.dto';

@ApiTags('Base Product Units')
@Controller('base-products/:baseProductId/units')
export class ProductUnitsController {
  constructor(private readonly productUnitsService: ProductUnitsService) {}

  @Get()
  findAll(@Param('baseProductId', ParseIntPipe) baseProductId: number) {
    return this.productUnitsService.findAll(baseProductId);
  }

  @Post()
  add(
    @Param('baseProductId', ParseIntPipe) baseProductId: number,
    @Body() dto: AddProductUnitDto,
  ) {
    return this.productUnitsService.add(baseProductId, dto);
  }

  @Patch(':unitId')
  update(
    @Param('baseProductId', ParseIntPipe) baseProductId: number,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: UpdateProductUnitDto,
  ) {
    return this.productUnitsService.update(baseProductId, unitId, dto);
  }

  @Delete(':unitId')
  remove(
    @Param('baseProductId', ParseIntPipe) baseProductId: number,
    @Param('unitId', ParseIntPipe) unitId: number,
  ) {
    return this.productUnitsService.remove(baseProductId, unitId);
  }
}
