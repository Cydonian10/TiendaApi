import { MigrationInterface, QueryRunner } from 'typeorm';

export class SaleDetailUnitAndNames1786203242106 implements MigrationInterface {
  name = 'SaleDetailUnitAndNames1786203242106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale_detail" ADD "productName" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_detail" ADD "baseProductName" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_detail" ADD "discount" numeric(10,2) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_detail" ADD "notes" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_detail" ADD "unitId" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_detail" ADD CONSTRAINT "FK_21527bd7bab6014df3b35a30e0f" FOREIGN KEY ("unitId") REFERENCES "measurement-unit"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale_detail" DROP CONSTRAINT "FK_21527bd7bab6014df3b35a30e0f"`,
    );
    await queryRunner.query(`ALTER TABLE "sale_detail" DROP COLUMN "unitId"`);
    await queryRunner.query(`ALTER TABLE "sale_detail" DROP COLUMN "notes"`);
    await queryRunner.query(`ALTER TABLE "sale_detail" DROP COLUMN "discount"`);
    await queryRunner.query(
      `ALTER TABLE "sale_detail" DROP COLUMN "baseProductName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_detail" DROP COLUMN "productName"`,
    );
  }
}
