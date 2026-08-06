import { MigrationInterface, QueryRunner } from 'typeorm';

export class Unidades1786025461584 implements MigrationInterface {
  name = 'Unidades1786025461584';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "measurement-unit" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "value" character varying(5) NOT NULL, CONSTRAINT "PK_74ba51695c42f34084d19f3d501" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "base-product-unit" ("id" SERIAL NOT NULL, "isMain" boolean NOT NULL DEFAULT false, "factor" numeric(10,2) NOT NULL DEFAULT '1', "baseProductId" integer NOT NULL, "unitId" integer NOT NULL, CONSTRAINT "PK_a7a6821106769e388797e0a172a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_product_unit_productId_unitId" ON "base-product-unit"  ("baseProductId", "unitId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "base-product-unit" ADD CONSTRAINT "FK_f99a2dc074d8129bfd21c489381" FOREIGN KEY ("baseProductId") REFERENCES "base_product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "base-product-unit" ADD CONSTRAINT "FK_49f3e320549c013e509a9bc0242" FOREIGN KEY ("unitId") REFERENCES "measurement-unit"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "base-product-unit" DROP CONSTRAINT "FK_49f3e320549c013e509a9bc0242"`,
    );
    await queryRunner.query(
      `ALTER TABLE "base-product-unit" DROP CONSTRAINT "FK_f99a2dc074d8129bfd21c489381"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_product_unit_productId_unitId"`,
    );
    await queryRunner.query(`DROP TABLE "base-product-unit"`);
    await queryRunner.query(`DROP TABLE "measurement-unit"`);
  }
}
