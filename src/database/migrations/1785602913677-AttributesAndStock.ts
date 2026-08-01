import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttributesAndStock1785602913677 implements MigrationInterface {
  name = 'AttributesAndStock1785602913677';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "attribute" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, CONSTRAINT "PK_b13fb7c5c9e9dff62b60e0de729" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "attribute_value" ("id" SERIAL NOT NULL, "value" character varying(255) NOT NULL, "attributeId" integer NOT NULL, CONSTRAINT "PK_dff76d9cc1db2684732acdb9ca7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_attribute_value_attributeId_value" ON "attribute_value"  ("attributeId", "value") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_attribute" ("id" SERIAL NOT NULL, "productId" integer NOT NULL, "attributeId" integer NOT NULL, "attributeValueId" integer NOT NULL, CONSTRAINT "PK_f9b91f38df3dbbe481d9e056e5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_product_attribute_productId_attributeId" ON "product_attribute"  ("productId", "attributeId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD "stock" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "attribute_value" ADD CONSTRAINT "FK_123ac30d8ade936347e4099cc4a" FOREIGN KEY ("attributeId") REFERENCES "attribute"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_attribute" ADD CONSTRAINT "FK_c0d597555330c0a972122bf4673" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_attribute" ADD CONSTRAINT "FK_5134aa627db96cdfb1bf0be5223" FOREIGN KEY ("attributeId") REFERENCES "attribute"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_attribute" ADD CONSTRAINT "FK_c1bf4950dee394db4b9cad06072" FOREIGN KEY ("attributeValueId") REFERENCES "attribute_value"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_attribute" DROP CONSTRAINT "FK_c1bf4950dee394db4b9cad06072"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_attribute" DROP CONSTRAINT "FK_5134aa627db96cdfb1bf0be5223"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_attribute" DROP CONSTRAINT "FK_c0d597555330c0a972122bf4673"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attribute_value" DROP CONSTRAINT "FK_123ac30d8ade936347e4099cc4a"`,
    );
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "stock"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_product_attribute_productId_attributeId"`,
    );
    await queryRunner.query(`DROP TABLE "product_attribute"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_attribute_value_attributeId_value"`,
    );
    await queryRunner.query(`DROP TABLE "attribute_value"`);
    await queryRunner.query(`DROP TABLE "attribute"`);
  }
}
