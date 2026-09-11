import { MigrationInterface, QueryRunner } from 'typeorm';

export class SalePendingPaymentCancellation1789200000000
  implements MigrationInterface
{
  name = 'SalePendingPaymentCancellation1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sale_status_enum" AS ENUM('PENDING', 'PAID', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale" ADD "status" "public"."sale_status_enum" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`ALTER TABLE "sale" ADD "paidAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "sale" ADD "cancelledAt" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "sale" ADD "cancellationReason" character varying(500)`,
    );
    await queryRunner.query(`ALTER TABLE "sale" ADD "cancelledById" integer`);
    await queryRunner.query(
      `UPDATE "sale" SET "status" = 'PAID', "paidAt" = "saleDate" WHERE EXISTS (SELECT 1 FROM "sale_payment" WHERE "sale_payment"."saleId" = "sale"."id")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sale_payment_status_enum" AS ENUM('PAID', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_payment" ADD "status" "public"."sale_payment_status_enum" NOT NULL DEFAULT 'PAID'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale" ADD CONSTRAINT "FK_sale_cancelled_by" FOREIGN KEY ("cancelledById") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale" DROP CONSTRAINT "FK_sale_cancelled_by"`,
    );
    await queryRunner.query(`ALTER TABLE "sale_payment" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."sale_payment_status_enum"`);
    await queryRunner.query(`ALTER TABLE "sale" DROP COLUMN "cancelledById"`);
    await queryRunner.query(
      `ALTER TABLE "sale" DROP COLUMN "cancellationReason"`,
    );
    await queryRunner.query(`ALTER TABLE "sale" DROP COLUMN "cancelledAt"`);
    await queryRunner.query(`ALTER TABLE "sale" DROP COLUMN "paidAt"`);
    await queryRunner.query(`ALTER TABLE "sale" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."sale_status_enum"`);
  }
}
