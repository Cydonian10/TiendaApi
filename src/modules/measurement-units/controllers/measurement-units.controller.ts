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
import { MeasurementUnitsService } from '../services/measurement-units.service';
import { MeasurementUnitFilterDto } from '../dtos/measurement-unit/measurement-unit-filter.dto';
import { CreateMeasurementUnitDto } from '../dtos/measurement-unit/create-measurement-unit.dto';
import { UpdateMeasurementUnitDto } from '../dtos/measurement-unit/update-measurement-unit.dto';

@ApiTags('Measurement Units')
@Controller('measurement-units')
export class MeasurementUnitsController {
  constructor(
    private readonly measurementUnitsService: MeasurementUnitsService,
  ) {}

  @Post()
  create(@Body() dto: CreateMeasurementUnitDto) {
    return this.measurementUnitsService.create(dto);
  }

  @Get()
  findAll(@Query() filter: MeasurementUnitFilterDto) {
    return this.measurementUnitsService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.measurementUnitsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMeasurementUnitDto,
  ) {
    return this.measurementUnitsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.measurementUnitsService.remove(id);
  }
}
