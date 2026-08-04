import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateImage1785813467684 implements MigrationInterface {
    name = 'CreateImage1785813467684'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "image" ("id" SERIAL NOT NULL, "url" character varying(255) NOT NULL, "entityType" character varying(50) NOT NULL, "entityId" integer NOT NULL, "isMain" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_d6db1ab4ee9ad9dbe86c64e4cc3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_image_entityType_entityId_main" ON "image"  ("entityType", "entityId") WHERE "isMain" = true`);
        await queryRunner.query(`CREATE INDEX "IDX_image_entityType_entityId" ON "image"  ("entityType", "entityId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_image_entityType_entityId"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_image_entityType_entityId_main"`);
        await queryRunner.query(`DROP TABLE "image"`);
    }

}
