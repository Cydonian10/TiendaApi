import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttributeNameUnique1785607691465 implements MigrationInterface {
  name = 'AttributeNameUnique1785607691465';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_attribute_name" ON "attribute"  ("name") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_attribute_name"`);
  }
}
