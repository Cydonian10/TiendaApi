import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PeopleService } from '../services/people.service';
import { CreatePersonDto } from '../dtos/person/create-person.dto';
import { UpdatePersonDto } from '../dtos/person/update-person.dto';
import { FilterPersonDto } from '../dtos/person/filter-person.dto';
import { PersonDto } from '../dtos/person/person.dto';

@ApiTags('People')
@Controller('people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  create(@Body() dto: CreatePersonDto): Promise<PersonDto> {
    return this.peopleService.create(dto);
  }

  @Get()
  findAll(@Query() filter: FilterPersonDto) {
    return this.peopleService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PersonDto> {
    return this.peopleService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePersonDto,
  ): Promise<PersonDto> {
    return this.peopleService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.peopleService.remove(id);
  }
}
