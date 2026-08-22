import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProductName1787372880487 implements MigrationInterface {
  name = 'RemoveProductName1787372880487';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" ADD "name" character varying(255) NOT NULL`,
    );
  }
}
