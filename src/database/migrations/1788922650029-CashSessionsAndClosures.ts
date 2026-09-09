import { MigrationInterface, QueryRunner } from 'typeorm';

export class CashSessionsAndClosures1788922650029
  implements MigrationInterface
{
  name = 'CashSessionsAndClosures1788922650029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_method" ADD "active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `INSERT INTO "payment_method" ("name", "active") VALUES ('Efectivo', true) ON CONFLICT ("name") DO UPDATE SET "active" = true, "deletedAt" = NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_movement" ADD "createdById" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "closing_detail" ADD "difference" numeric(10,2) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" ADD "closedById" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_payment" DROP CONSTRAINT "FK_30a4d512df20df9c90c7d22d743"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_payment" ADD CONSTRAINT "UQ_30a4d512df20df9c90c7d22d743" UNIQUE ("saleId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_movement" ALTER COLUMN "reason" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cash_register_opening_open_register" ON "cash_register_opening" ("cashRegisterId") WHERE "status" = 'open' AND "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_payment" ADD CONSTRAINT "FK_30a4d512df20df9c90c7d22d743" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_movement" ADD CONSTRAINT "FK_7c4118e763b3ec569cdc7b2e048" FOREIGN KEY ("createdById") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" ADD CONSTRAINT "FK_31ef8d27ffa4fa95a94386fb32e" FOREIGN KEY ("closedById") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" DROP CONSTRAINT "FK_31ef8d27ffa4fa95a94386fb32e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_movement" DROP CONSTRAINT "FK_7c4118e763b3ec569cdc7b2e048"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_payment" DROP CONSTRAINT "FK_30a4d512df20df9c90c7d22d743"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_cash_register_opening_open_register"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_movement" ALTER COLUMN "reason" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_payment" DROP CONSTRAINT "UQ_30a4d512df20df9c90c7d22d743"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_payment" ADD CONSTRAINT "FK_30a4d512df20df9c90c7d22d743" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" DROP COLUMN "closedById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "closing_detail" DROP COLUMN "difference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_movement" DROP COLUMN "createdById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_method" DROP COLUMN "active"`,
    );
  }
}
