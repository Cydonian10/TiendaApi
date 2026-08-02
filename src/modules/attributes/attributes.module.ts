import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attribute } from './entities/attribute.entity';
import { AttributeValue } from './entities/attribute-value.entity';
import { AttributesService } from './services/attributes.service';
import { AttributeValuesService } from './services/attribute-values.service';
import { AttributesController } from './controllers/attributes.controller';
import { AttributeValuesController } from './controllers/attribute-values.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Attribute, AttributeValue])],
  controllers: [AttributesController, AttributeValuesController],
  providers: [AttributesService, AttributeValuesService],
})
export class AttributesModule {}
