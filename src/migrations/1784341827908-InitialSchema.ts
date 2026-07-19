import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784341827908 implements MigrationInterface {
    name = 'InitialSchema1784341827908'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "chart_of_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ledger_id" uuid NOT NULL, "account_type_id" uuid NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "description" text, "parent_id" uuid, "level" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "is_system" boolean NOT NULL DEFAULT false, "allow_posting" boolean NOT NULL DEFAULT true, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_467c08a2efc78393c647da32bac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_233c2a470511f11b1564bb6cd1" ON "chart_of_accounts"  ("parent_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_921d92d4ff6b2d3d12408b36be" ON "chart_of_accounts"  ("ledger_id", "name") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a679698c5b6e0ef28fa4645069" ON "chart_of_accounts"  ("ledger_id", "code") `);
        await queryRunner.query(`CREATE TABLE "idempotency" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(255) NOT NULL, "request_hash" character varying NOT NULL, "response" jsonb NOT NULL, "status" character varying(50) NOT NULL, "entity_type" character varying(50), "entity_id" uuid, "metadata" jsonb, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7db4ecce9e7d787fe8fb72ad97f" UNIQUE ("key"), CONSTRAINT "PK_cec40256e4ef03c10eef53aa729" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d0558a87fd7904d35529f959bd" ON "idempotency"  ("expires_at") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7db4ecce9e7d787fe8fb72ad97" ON "idempotency"  ("key") `);
        await queryRunner.query(`CREATE TABLE "reconciliations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "external_system" character varying(50) NOT NULL, "reference" character varying(100) NOT NULL, "account_id" uuid NOT NULL, "expected_amount" numeric(15,2) NOT NULL, "actual_amount" numeric(15,2) NOT NULL, "difference" numeric(15,2) NOT NULL, "currency_id" uuid NOT NULL, "status" character varying(50) NOT NULL, "transaction_ids" jsonb, "details" jsonb, "executed_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_110f3839ca29e2fd8ff4aaec7b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_46c26cd185fb3c6a9a18b08335" ON "reconciliations"  ("executed_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_85a2c2c022bd4ff2368b212ce4" ON "reconciliations"  ("account_id", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dcca4a19d0161a189c8729d98c" ON "reconciliations"  ("external_system", "reference") `);
        await queryRunner.query(`ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "FK_96094428bb4d8704909a44ae64a" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "FK_ff0eca7553ae7637ede35f5dd33" FOREIGN KEY ("account_type_id") REFERENCES "account_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "FK_233c2a470511f11b1564bb6cd1e" FOREIGN KEY ("parent_id") REFERENCES "chart_of_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reconciliations" ADD CONSTRAINT "FK_5a4c2888a5419b36735334804b3" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reconciliations" ADD CONSTRAINT "FK_685243fd868d7df59ce59d4b65b" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reconciliations" DROP CONSTRAINT "FK_685243fd868d7df59ce59d4b65b"`);
        await queryRunner.query(`ALTER TABLE "reconciliations" DROP CONSTRAINT "FK_5a4c2888a5419b36735334804b3"`);
        await queryRunner.query(`ALTER TABLE "chart_of_accounts" DROP CONSTRAINT "FK_233c2a470511f11b1564bb6cd1e"`);
        await queryRunner.query(`ALTER TABLE "chart_of_accounts" DROP CONSTRAINT "FK_ff0eca7553ae7637ede35f5dd33"`);
        await queryRunner.query(`ALTER TABLE "chart_of_accounts" DROP CONSTRAINT "FK_96094428bb4d8704909a44ae64a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dcca4a19d0161a189c8729d98c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_85a2c2c022bd4ff2368b212ce4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_46c26cd185fb3c6a9a18b08335"`);
        await queryRunner.query(`DROP TABLE "reconciliations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7db4ecce9e7d787fe8fb72ad97"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d0558a87fd7904d35529f959bd"`);
        await queryRunner.query(`DROP TABLE "idempotency"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a679698c5b6e0ef28fa4645069"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_921d92d4ff6b2d3d12408b36be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_233c2a470511f11b1564bb6cd1"`);
        await queryRunner.query(`DROP TABLE "chart_of_accounts"`);
    }

}
