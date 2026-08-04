import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('image')
@Index('IDX_image_entityType_entityId', ['entityType', 'entityId'])
@Index('UQ_image_entityType_entityId_main', ['entityType', 'entityId'], {
  unique: true,
  where: '"isMain" = true',
})
export class Image {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  url: string;

  @Column({ type: 'varchar', length: 50 })
  entityType: string;

  @Column({ type: 'int' })
  entityId: number;

  @Column({ type: 'boolean', default: false })
  isMain: boolean;
}
