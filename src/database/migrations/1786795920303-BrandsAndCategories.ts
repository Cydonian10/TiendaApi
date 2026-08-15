import { MigrationInterface, QueryRunner } from 'typeorm';

export class BrandsAndCategories1786795920303 implements MigrationInterface {
  name = 'BrandsAndCategories1786795920303';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "brand" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(255), CONSTRAINT "UQ_5f468ae5696f07da025138e38f7" UNIQUE ("name"), CONSTRAINT "PK_a5d20765ddd942eb5de4eee2d7f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "category" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(255), CONSTRAINT "UQ_23c05c292c439d77b0de816b500" UNIQUE ("name"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "base_product_category" ("baseProductId" integer NOT NULL, "categoryId" integer NOT NULL, CONSTRAINT "PK_229df7d1846c7afb9bc969ca383" PRIMARY KEY ("baseProductId", "categoryId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a2f12d9aa3a653be7378f1e94d" ON "base_product_category"  ("baseProductId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a66e9595bbe2e90c74cf7d303a" ON "base_product_category"  ("categoryId") `,
    );
    await queryRunner.query(`ALTER TABLE "base_product" ADD "brandId" integer`);
    await queryRunner.query(
      `ALTER TABLE "base_product" ADD CONSTRAINT "FK_d2f8a69415778b0fedaf8c6941b" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "base_product_category" ADD CONSTRAINT "FK_a2f12d9aa3a653be7378f1e94d4" FOREIGN KEY ("baseProductId") REFERENCES "base_product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "base_product_category" ADD CONSTRAINT "FK_a66e9595bbe2e90c74cf7d303a1" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "base_product_category" DROP CONSTRAINT "FK_a66e9595bbe2e90c74cf7d303a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "base_product_category" DROP CONSTRAINT "FK_a2f12d9aa3a653be7378f1e94d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "base_product" DROP CONSTRAINT "FK_d2f8a69415778b0fedaf8c6941b"`,
    );
    await queryRunner.query(`ALTER TABLE "base_product" DROP COLUMN "brandId"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a66e9595bbe2e90c74cf7d303a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a2f12d9aa3a653be7378f1e94d"`,
    );
    await queryRunner.query(`DROP TABLE "base_product_category"`);
    await queryRunner.query(`DROP TABLE "category"`);
    await queryRunner.query(`DROP TABLE "brand"`);
  }
}
