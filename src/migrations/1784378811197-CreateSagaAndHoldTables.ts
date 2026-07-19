import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSagaAndHoldTables1784378811197 implements MigrationInterface {
    name = 'CreateSagaAndHoldTables1784378811197'

    public async up(queryRunner: QueryRunner): Promise<void> {


        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type
                WHERE typname = 'holds_status_enum'
            ) THEN
                CREATE TYPE holds_status_enum AS ENUM (
                    'ACTIVE',
                    'CAPTURED',
                    'RELEASED',
                    'EXPIRED',
                    'PARTIALLY_CAPTURED',
                    'CANCELLED'
                );
            END IF;
        END
        $$;
        `);

        await queryRunner.query(`
            CREATE INDEX idx_sagas_transaction ON sagas(transaction_id);
            CREATE INDEX idx_sagas_workflow ON sagas(workflow_id);
            CREATE INDEX idx_sagas_status ON sagas(status);
            CREATE INDEX idx_sagas_created ON sagas(created_at);
        `);


         await queryRunner.query(`
            CREATE INDEX idx_saga_steps_saga ON saga_steps(saga_id, step);
            CREATE INDEX idx_saga_steps_status ON saga_steps(status);
            CREATE INDEX idx_saga_steps_started ON saga_steps(started_at);
            CREATE INDEX idx_saga_steps_timeout ON saga_steps(timeout_at);
        `);

         await queryRunner.query(`
            CREATE INDEX idx_holds_account_status ON holds(account_id, status);
            CREATE INDEX idx_holds_transaction ON holds(transaction_id);
            CREATE INDEX idx_holds_journal ON holds(journal_id);
            CREATE INDEX idx_holds_expires ON holds(expires_at);
            CREATE INDEX idx_holds_status_expires ON holds(status, expires_at);
            CREATE INDEX idx_holds_reason ON holds(reason);
        `);

        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_account_held_balance(
        p_account_id UUID,
        p_currency_id UUID DEFAULT NULL
      )
      RETURNS DECIMAL(15,2)
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT COALESCE(
          SUM(
            CASE 
              WHEN h.currency_id = p_currency_id OR p_currency_id IS NULL 
              THEN h.amount
              ELSE h.amount * COALESCE(h.exchange_rate, 1)
            END
          ),
          0
        )
        FROM holds h
        WHERE h.account_id = p_account_id
          AND h.status = 'ACTIVE'
          AND h.expires_at > NOW();
      $$;
    `);

    // Create view for active holds
    await queryRunner.query(`
      CREATE VIEW active_holds AS
      SELECT 
        h.id,
        h.account_id,
        a.name as account_name,
        h.amount,
        h.currency_id,
        c.symbol as currency_symbol,
        COALESCE(h.exchange_rate, 1) as exchange_rate,
        h.reason,
        h.expires_at,
        EXTRACT(EPOCH FROM (h.expires_at - NOW())) as seconds_remaining,
        CASE 
          WHEN h.expires_at < NOW() THEN 'EXPIRED'
          WHEN h.expires_at < NOW() + INTERVAL '1 minute' THEN 'EXPIRING_SOON'
          ELSE 'ACTIVE'
        END as status_message
      FROM holds h
      JOIN accounts a ON a.id = h.account_id
      JOIN currencies c ON c.id = h.currency_id
      WHERE h.status = 'ACTIVE'
        AND h.expires_at > NOW()
      ORDER BY h.expires_at ASC;
    `);

    // Create function to auto-process expired holds
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION auto_process_expired_holds()
      RETURNS TABLE (
        processed_count INT,
        expired_count INT
      )
      LANGUAGE PLPGSQL
      AS $$
      DECLARE
        v_processed INT := 0;
        v_expired INT := 0;
        hold_record RECORD;
      BEGIN
        -- Process expired holds
        FOR hold_record IN (
          SELECT * FROM holds
          WHERE status = 'ACTIVE'
            AND expires_at < NOW()
        ) LOOP
          -- If hold is expired, mark it as expired
          UPDATE holds
          SET status = 'EXPIRED',
              release_reason = jsonb_build_object(
                'reason', 'Auto-expired',
                'expired_at', NOW()
              )
          WHERE id = hold_record.id;
          
          v_expired := v_expired + 1;
        END LOOP;
        
        RETURN QUERY SELECT v_processed, v_expired;
      END;
      $$;
    `);

    // Create function to get total held amount by account
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_total_held_by_account(
        p_account_id UUID
      )
      RETURNS TABLE (
        total_held DECIMAL(15,2),
        currency_code VARCHAR(3),
        hold_count BIGINT
      )
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT 
          COALESCE(SUM(h.amount), 0) as total_held,
          c.code as currency_code,
          COUNT(h.id) as hold_count
        FROM holds h
        JOIN currencies c ON c.id = h.currency_id
        WHERE h.account_id = p_account_id
          AND h.status = 'ACTIVE'
          AND h.expires_at > NOW()
        GROUP BY c.code;
      $$;
    `);

    // Create function to check if account has active holds
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION account_has_active_holds(
        p_account_id UUID
      )
      RETURNS BOOLEAN
      LANGUAGE SQL
      STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1 
          FROM holds 
          WHERE account_id = p_account_id
            AND status = 'ACTIVE'
            AND expires_at > NOW()
        );
      $$;
    `);

    // Create function to get hold summary for account
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_hold_summary(
        p_account_id UUID
      )
      RETURNS JSONB
      LANGUAGE PLPGSQL
      STABLE
      AS $$
      DECLARE
        v_result JSONB;
      BEGIN
        SELECT jsonb_build_object(
          'total_holds', COUNT(*),
          'total_amount', COALESCE(SUM(amount), 0),
          'oldest_expires_at', MIN(expires_at),
          'nearest_expires_at', MIN(
            CASE 
              WHEN expires_at > NOW() THEN expires_at 
              ELSE NULL 
            END
          ),
          'currencies', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'currency', c.code,
                'total', COALESCE(SUM(h.amount), 0),
                'count', COUNT(h.id)
              )
            )
            FROM holds h
            JOIN currencies c ON c.id = h.currency_id
            WHERE h.account_id = p_account_id
              AND h.status = 'ACTIVE'
              AND h.expires_at > NOW()
            GROUP BY c.code
          )
        ) INTO v_result
        FROM holds
        WHERE account_id = p_account_id
          AND status = 'ACTIVE'
          AND expires_at > NOW();
        
        RETURN COALESCE(v_result, '{}'::jsonb);
      END;
      $$;
    `);

    // Create trigger function (opcional)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trigger_expire_holds()
      RETURNS TRIGGER
      LANGUAGE PLPGSQL
      AS $$
      BEGIN
        -- Esta função pode ser chamada por um schedule
        PERFORM auto_process_expired_holds();
        RETURN NULL;
      END;
      $$;
    `);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS get_hold_summary`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS account_has_active_holds`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS get_total_held_by_account`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS trigger_expire_holds`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS auto_process_expired_holds`);
        await queryRunner.query(`DROP VIEW IF EXISTS active_holds`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS get_account_held_balance`);
        await queryRunner.query(`DROP TABLE IF EXISTS holds`);
        await queryRunner.query(`DROP TABLE IF EXISTS saga_steps`);
        await queryRunner.query(`DROP TABLE IF EXISTS sagas`);
        await queryRunner.query(`DROP TYPE IF EXISTS holds_status_enum`);
    }

}
