import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auth1786160983235 implements MigrationInterface {
  name = 'Auth1786160983235';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auth" ("id" SERIAL NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255), "google" boolean NOT NULL DEFAULT false, "personId" integer NOT NULL, CONSTRAINT "UQ_auth_email" UNIQUE ("email"), CONSTRAINT "UQ_auth_personId" UNIQUE ("personId"), CONSTRAINT "PK_auth" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth" ADD CONSTRAINT "FK_auth_person" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auth" DROP CONSTRAINT "FK_auth_person"`,
    );
    await queryRunner.query(`DROP TABLE "auth"`);
  }
}
