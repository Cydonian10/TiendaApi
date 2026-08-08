import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from './entities/person.entity';
import { Role } from './entities/role.entity';
import { PeopleService } from './services/people.service';
import { PeopleController } from './controllers/people.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Person, Role])],
  controllers: [PeopleController],
  providers: [PeopleService],
})
export class PeopleModule {}
