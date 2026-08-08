import { MigrationInterface, QueryRunner } from 'typeorm';

export class PersonAndRole1786073855393 implements MigrationInterface {
  name = 'PersonAndRole1786073855393';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "role" ("id" SERIAL NOT NULL, "name" character varying(50) NOT NULL, CONSTRAINT "UQ_rol_name" UNIQUE ("name"), CONSTRAINT "PK_role" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "person" ("id" SERIAL NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "birthDate" date NOT NULL, "address" character varying(255) NOT NULL, "dni" character varying(20) NOT NULL, "deletedAt" TIMESTAMP, CONSTRAINT "UQ_person_dni" UNIQUE ("dni"), CONSTRAINT "PK_person" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "person_role" ("personId" integer NOT NULL, "roleId" integer NOT NULL, CONSTRAINT "PK_person_role" PRIMARY KEY ("personId", "roleId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_person_role_roleId" ON "person_role" ("roleId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_role" ADD CONSTRAINT "FK_person_role_person" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_role" ADD CONSTRAINT "FK_person_role_role" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "role" ("name") VALUES ('CLIENTE'), ('ADMINISTRADOR'), ('TRABAJADOR') ON CONFLICT ("name") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person_role" DROP CONSTRAINT "FK_person_role_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_role" DROP CONSTRAINT "FK_person_role_person"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_person_role_roleId"`);
    await queryRunner.query(`DROP TABLE "person_role"`);
    await queryRunner.query(`DROP TABLE "person"`);
    await queryRunner.query(`DROP TABLE "role"`);
  }
}
