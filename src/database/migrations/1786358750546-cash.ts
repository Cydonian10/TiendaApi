import { MigrationInterface, QueryRunner } from "typeorm";

export class Cash1786358750546 implements MigrationInterface {
    name = 'Cash1786358750546'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "payment_method" ("id" SERIAL NOT NULL, "name" character varying(50) NOT NULL, "deletedAt" TIMESTAMP, CONSTRAINT "UQ_6101666760258a840e115e1bb11" UNIQUE ("name"), CONSTRAINT "PK_7744c2b2dd932c9cf42f2b9bc3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sale_payment" ("id" SERIAL NOT NULL, "amount" numeric(10,2) NOT NULL, "saleId" integer NOT NULL, "paymentMethodId" integer NOT NULL, CONSTRAINT "PK_48400b2daf24fa1050175a2221c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cash_register" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "active" boolean NOT NULL DEFAULT true, "deletedAt" TIMESTAMP, CONSTRAINT "PK_6278251c4df289cd438c5e11df8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."cash_movement_type_enum" AS ENUM('income', 'expense')`);
        await queryRunner.query(`CREATE TABLE "cash_movement" ("id" SERIAL NOT NULL, "type" "public"."cash_movement_type_enum" NOT NULL, "amount" numeric(10,2) NOT NULL, "reason" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "openingId" integer NOT NULL, CONSTRAINT "PK_66bd739ff97dd3242e7d53a2780" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "closing_detail" ("id" SERIAL NOT NULL, "expectedAmount" numeric(10,2) NOT NULL, "realAmount" numeric(10,2) NOT NULL, "openingId" integer NOT NULL, "paymentMethodId" integer NOT NULL, CONSTRAINT "PK_9df561ff51b34ee1b5da85e736e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."cash_register_opening_status_enum" AS ENUM('open', 'closed')`);
        await queryRunner.query(`CREATE TABLE "cash_register_opening" ("id" SERIAL NOT NULL, "openedAt" TIMESTAMP NOT NULL DEFAULT now(), "closedAt" TIMESTAMP, "status" "public"."cash_register_opening_status_enum" NOT NULL DEFAULT 'open', "openingAmount" numeric(10,2) NOT NULL DEFAULT '0', "expectedAmount" numeric(10,2) NOT NULL DEFAULT '0', "realAmount" numeric(10,2), "difference" numeric(10,2), "deletedAt" TIMESTAMP, "cashRegisterId" integer NOT NULL, "openedById" integer NOT NULL, CONSTRAINT "PK_c5ccc224606909582567a09badf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "sale" ADD "cashOpeningId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sale_payment" ADD CONSTRAINT "FK_30a4d512df20df9c90c7d22d743" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sale_payment" ADD CONSTRAINT "FK_2fe8661ef539ca0063c035d4951" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_method"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cash_movement" ADD CONSTRAINT "FK_0ec3a137fbe7a3bf6f6f8baa122" FOREIGN KEY ("openingId") REFERENCES "cash_register_opening"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "closing_detail" ADD CONSTRAINT "FK_9b6f1cec5779c16d22537b0ce18" FOREIGN KEY ("openingId") REFERENCES "cash_register_opening"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "closing_detail" ADD CONSTRAINT "FK_ed0ce2ac2869aaae621fa922a3f" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_method"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cash_register_opening" ADD CONSTRAINT "FK_cbafa736c106aca7861f9a05e87" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_register"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cash_register_opening" ADD CONSTRAINT "FK_a8f2832a949807250a0ad7d291a" FOREIGN KEY ("openedById") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sale" ADD CONSTRAINT "FK_22fa7353a5d77494305b6304f7a" FOREIGN KEY ("cashOpeningId") REFERENCES "cash_register_opening"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sale" DROP CONSTRAINT "FK_22fa7353a5d77494305b6304f7a"`);
        await queryRunner.query(`ALTER TABLE "cash_register_opening" DROP CONSTRAINT "FK_a8f2832a949807250a0ad7d291a"`);
        await queryRunner.query(`ALTER TABLE "cash_register_opening" DROP CONSTRAINT "FK_cbafa736c106aca7861f9a05e87"`);
        await queryRunner.query(`ALTER TABLE "closing_detail" DROP CONSTRAINT "FK_ed0ce2ac2869aaae621fa922a3f"`);
        await queryRunner.query(`ALTER TABLE "closing_detail" DROP CONSTRAINT "FK_9b6f1cec5779c16d22537b0ce18"`);
        await queryRunner.query(`ALTER TABLE "cash_movement" DROP CONSTRAINT "FK_0ec3a137fbe7a3bf6f6f8baa122"`);
        await queryRunner.query(`ALTER TABLE "sale_payment" DROP CONSTRAINT "FK_2fe8661ef539ca0063c035d4951"`);
        await queryRunner.query(`ALTER TABLE "sale_payment" DROP CONSTRAINT "FK_30a4d512df20df9c90c7d22d743"`);
        await queryRunner.query(`ALTER TABLE "sale" DROP COLUMN "cashOpeningId"`);
        await queryRunner.query(`DROP TABLE "cash_register_opening"`);
        await queryRunner.query(`DROP TYPE "public"."cash_register_opening_status_enum"`);
        await queryRunner.query(`DROP TABLE "closing_detail"`);
        await queryRunner.query(`DROP TABLE "cash_movement"`);
        await queryRunner.query(`DROP TYPE "public"."cash_movement_type_enum"`);
        await queryRunner.query(`DROP TABLE "cash_register"`);
        await queryRunner.query(`DROP TABLE "sale_payment"`);
        await queryRunner.query(`DROP TABLE "payment_method"`);
    }

}
