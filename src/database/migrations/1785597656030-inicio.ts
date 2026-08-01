import { MigrationInterface, QueryRunner } from 'typeorm';

export class Inicio1785597656030 implements MigrationInterface {
  name = 'Inicio1785597656030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "baseProductId" integer NOT NULL, CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "base_product" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, CONSTRAINT "PK_0ef9c06b3a37b436970e697dcfc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_17c2ed83daa776d6c7c9ff4e61c" FOREIGN KEY ("baseProductId") REFERENCES "base_product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_17c2ed83daa776d6c7c9ff4e61c"`,
    );
    await queryRunner.query(`DROP TABLE "base_product"`);
    await queryRunner.query(`DROP TABLE "product"`);
  }
}
