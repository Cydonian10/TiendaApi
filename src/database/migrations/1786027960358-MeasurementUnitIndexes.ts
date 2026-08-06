import { MigrationInterface, QueryRunner } from 'typeorm';

export class MeasurementUnitIndexes1786027960358 implements MigrationInterface {
  name = 'MeasurementUnitIndexes1786027960358';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_measurement_unit_value" ON "measurement-unit"  ("value") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_measurement_unit_name" ON "measurement-unit"  ("name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_product_unit_productId_isMain" ON "base-product-unit"  ("baseProductId") WHERE "isMain"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_product_unit_productId_isMain"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_measurement_unit_name"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_measurement_unit_value"`);
  }
}
