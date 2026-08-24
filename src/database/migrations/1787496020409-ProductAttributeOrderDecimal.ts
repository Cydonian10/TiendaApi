import { MigrationInterface, QueryRunner } from "typeorm";

export class ProductAttributeOrderDecimal1787496020409 implements MigrationInterface {
    name = 'ProductAttributeOrderDecimal1787496020409'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_attribute" ADD "order" numeric(10,2) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_attribute" DROP COLUMN "order"`);
    }

}
