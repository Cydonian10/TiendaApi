import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductPrice1785725175925 implements MigrationInterface {
  name = 'ProductPrice1785725175925';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" ADD "price" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "price"`);
  }
}
