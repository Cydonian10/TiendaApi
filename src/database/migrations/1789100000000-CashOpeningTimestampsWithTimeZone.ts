import { MigrationInterface, QueryRunner } from 'typeorm';

export class CashOpeningTimestampsWithTimeZone1789100000000
  implements MigrationInterface
{
  name = 'CashOpeningTimestampsWithTimeZone1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Existing values were produced by a UTC database default while stored without an offset.
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" ALTER COLUMN "openedAt" TYPE TIMESTAMP WITH TIME ZONE USING "openedAt" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" ALTER COLUMN "closedAt" TYPE TIMESTAMP WITH TIME ZONE USING "closedAt" AT TIME ZONE 'UTC'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" ALTER COLUMN "closedAt" TYPE TIMESTAMP USING "closedAt" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_register_opening" ALTER COLUMN "openedAt" TYPE TIMESTAMP USING "openedAt" AT TIME ZONE 'UTC'`,
    );
  }
}
