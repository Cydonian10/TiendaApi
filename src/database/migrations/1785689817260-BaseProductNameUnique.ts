import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaseProductNameUnique1785689817260 implements MigrationInterface {
  name = 'BaseProductNameUnique1785689817260';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "base_product" ADD CONSTRAINT "UQ_8b0474d91625c72feb7b3fc301c" UNIQUE ("name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "base_product" DROP CONSTRAINT "UQ_8b0474d91625c72feb7b3fc301c"`,
    );
  }
}
