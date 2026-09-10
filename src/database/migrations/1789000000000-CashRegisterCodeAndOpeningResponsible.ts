import { MigrationInterface, QueryRunner } from 'typeorm';

export class CashRegisterCodeAndOpeningResponsible1789000000000
  implements MigrationInterface
{
  name = 'CashRegisterCodeAndOpeningResponsible1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_register" ADD "code" character varying(100)`,
    );
    await queryRunner.query(
      `UPDATE "cash_register" SET "code" = 'CAJA-' || "id" WHERE "code" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register" ALTER COLUMN "code" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register" ADD CONSTRAINT "UQ_cash_register_code" UNIQUE ("code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" ADD "responsibleId" integer`,
    );
    await queryRunner.query(
      `UPDATE "cash_register_opening" SET "responsibleId" = "openedById" WHERE "responsibleId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" ALTER COLUMN "responsibleId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" ADD CONSTRAINT "FK_cash_register_opening_responsible" FOREIGN KEY ("responsibleId") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" DROP CONSTRAINT "FK_cash_register_opening_responsible"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" DROP COLUMN "responsibleId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register" DROP CONSTRAINT "UQ_cash_register_code"`,
    );
    await queryRunner.query(`ALTER TABLE "cash_register" DROP COLUMN "code"`);
  }
}
