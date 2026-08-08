import { MigrationInterface, QueryRunner } from 'typeorm';

export class SaleAddSellerAndDiscount1786202688912
  implements MigrationInterface
{
  name = 'SaleAddSellerAndDiscount1786202688912';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auth" DROP CONSTRAINT "FK_auth_person"`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_role" DROP CONSTRAINT "FK_person_role_person"`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_role" DROP CONSTRAINT "FK_person_role_role"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_person_role_roleId"`);
    await queryRunner.query(
      `CREATE TABLE "sale_detail" ("id" SERIAL NOT NULL, "quantity" integer NOT NULL, "unitPrice" numeric(10,2) NOT NULL, "subtotal" numeric(10,2) NOT NULL, "saleId" integer NOT NULL, "productId" integer NOT NULL, CONSTRAINT "PK_4a2e151a26169857b1f3d47c198" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sale" ("id" SERIAL NOT NULL, "saleDate" TIMESTAMP NOT NULL DEFAULT now(), "totalAmount" numeric(10,2) NOT NULL DEFAULT '0', "discount" numeric(10,2) NOT NULL DEFAULT '0', "deletedAt" TIMESTAMP, "customerId" integer NOT NULL, "sellerId" integer NOT NULL, CONSTRAINT "PK_d03891c457cbcd22974732b5de2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_db538089003770e376fea746ee" ON "person_role"  ("personId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9542dd1b71bbb859e02d2ca170" ON "person_role"  ("roleId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_detail" ADD CONSTRAINT "FK_dc3d2ad8c7954be23118706f29d" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_detail" ADD CONSTRAINT "FK_1835112e3800deefbf854724554" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale" ADD CONSTRAINT "FK_a742b91c1b99a4269c102d47541" FOREIGN KEY ("customerId") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale" ADD CONSTRAINT "FK_8107fa8e7838a1882adab4564be" FOREIGN KEY ("sellerId") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth" ADD CONSTRAINT "FK_19fcce1771cf6045a2a040ddab5" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_role" ADD CONSTRAINT "FK_db538089003770e376fea746eea" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_role" ADD CONSTRAINT "FK_9542dd1b71bbb859e02d2ca1704" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person_role" DROP CONSTRAINT "FK_9542dd1b71bbb859e02d2ca1704"`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_role" DROP CONSTRAINT "FK_db538089003770e376fea746eea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth" DROP CONSTRAINT "FK_19fcce1771cf6045a2a040ddab5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale" DROP CONSTRAINT "FK_8107fa8e7838a1882adab4564be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale" DROP CONSTRAINT "FK_a742b91c1b99a4269c102d47541"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_detail" DROP CONSTRAINT "FK_1835112e3800deefbf854724554"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_detail" DROP CONSTRAINT "FK_dc3d2ad8c7954be23118706f29d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9542dd1b71bbb859e02d2ca170"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db538089003770e376fea746ee"`,
    );
    await queryRunner.query(`DROP TABLE "sale"`);
    await queryRunner.query(`DROP TABLE "sale_detail"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_person_role_roleId" ON "person_role" USING btree ("roleId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "person_role" ADD CONSTRAINT "FK_person_role_role" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_role" ADD CONSTRAINT "FK_person_role_person" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth" ADD CONSTRAINT "FK_auth_person" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
