import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { AttributesService } from '../services/attributes.service';
import { AttributeValuesService } from '../services/attribute-values.service';
import { AttributesBatchService } from '../services/attributes-batch.service';
import { AttributeFilterDto } from '../dtos/attribute/filter-attribute.dto';
import { AttributeValueFilterDto } from '../dtos/attribute-value/filter-attribute-value.dto';
import { CreateAttributeDto } from '../dtos/attribute/create-attribute.dto';
import { CreateAttributeBatchDto } from '../dtos/attribute/create-attribute-batch.dto';
import { UpdateAttributeDto } from '../dtos/attribute/update-attribute.dto';

@ApiTags('Attributes')
@Controller('attributes')
export class AttributesController {
  constructor(
    private readonly attributesService: AttributesService,
    private readonly attributeValuesService: AttributeValuesService,
    private readonly attributesBatchService: AttributesBatchService,
  ) {}

  @Post()
  create(@Body() dto: CreateAttributeDto) {
    return this.attributesService.create(dto);
  }

  @Post('batch')
  async createWithValues(
    @Body() dto: CreateAttributeBatchDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { attribute, created } =
      await this.attributesBatchService.createWithValues(dto);
    res.status(created ? 201 : 200);
    return attribute;
  }

  @Get('batch')
  findAllWithValues(@Query() filter: AttributeFilterDto) {
    return this.attributesBatchService.findAllWithValues(filter);
  }

  @Get()
  findAll(@Query() filter: AttributeFilterDto) {
    return this.attributesService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attributesService.findOne(id);
  }

  @Get(':id/values')
  async findValues(
    @Param('id', ParseIntPipe) id: number,
    @Query() filter: AttributeValueFilterDto,
  ) {
    await this.attributesService.findOne(id);
    const valueFilter = new AttributeValueFilterDto();
    valueFilter.page = filter.page;
    valueFilter.limit = filter.limit;
    valueFilter.search = filter.search;
    valueFilter.attributeId = id;
    return this.attributeValuesService.findAll(valueFilter);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.attributesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attributesService.remove(id);
  }
}
