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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AttributeValuesService } from '../services/attribute-values.service';
import { AttributeValueFilterDto } from '../dtos/attribute-value/filter-attribute-value.dto';
import { CreateAttributeValueDto } from '../dtos/attribute-value/create-attribute-value.dto';
import { UpdateAttributeValueDto } from '../dtos/attribute-value/update-attribute-value.dto';

@ApiTags('AttributeValues')
@Controller('attribute-values')
export class AttributeValuesController {
  constructor(
    private readonly attributeValuesService: AttributeValuesService,
  ) {}

  @Post()
  create(@Body() dto: CreateAttributeValueDto) {
    return this.attributeValuesService.create(dto);
  }

  @Get()
  findAll(@Query() filter: AttributeValueFilterDto) {
    return this.attributeValuesService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attributeValuesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeValueDto,
  ) {
    return this.attributeValuesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attributeValuesService.remove(id);
  }
}
