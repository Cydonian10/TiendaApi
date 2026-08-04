import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductAttributeKey1785729144961 implements MigrationInterface {
  name = 'ProductAttributeKey1785729144961';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" ADD "attributeKey" character varying(255) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `UPDATE "product" p SET "attributeKey" = COALESCE((SELECT string_agg(pa."attributeId" || ':' || pa."attributeValueId", ',' ORDER BY pa."attributeId") FROM "product_attribute" pa WHERE pa."productId" = p.id), '')`,
    );
    await queryRunner.query(
      `DELETE FROM "product_attribute" pa WHERE pa."productId" IN (SELECT p."id" FROM "product" p JOIN "product" p2 ON p2."baseProductId" = p."baseProductId" AND p2."attributeKey" = p."attributeKey" AND p2."id" < p."id")`,
    );
    await queryRunner.query(
      `DELETE FROM "product" p USING "product" p2 WHERE p2."baseProductId" = p."baseProductId" AND p2."attributeKey" = p."attributeKey" AND p2."id" < p."id"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_product_baseProductId_attributeKey" ON "product"  ("baseProductId", "attributeKey") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_product_baseProductId_attributeKey"`,
    );
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "attributeKey"`);
  }
}
