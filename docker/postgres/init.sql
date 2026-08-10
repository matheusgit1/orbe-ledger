-- Criar bancos de dados
CREATE DATABASE "orbe-ledger";
CREATE DATABASE "orbe-services";

-- Criar usuários e conceder permissões
-- Usuário para o banco orbe-ledger
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'orbe-ledger') THEN
    CREATE USER "orbe-ledger" WITH PASSWORD 'orbe-ledger';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE "orbe-ledger" TO "orbe-ledger";

-- Usuário para o banco orbe-services
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'orbe-services') THEN
    CREATE USER "orbe-services" WITH PASSWORD 'orbe-services';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE "orbe-services" TO "orbe-services";

-- Conectar ao banco orbe-ledger e conceder permissões no schema public
\c "orbe-ledger"
GRANT ALL ON SCHEMA public TO "orbe-ledger";
GRANT ALL ON ALL TABLES IN SCHEMA public TO "orbe-ledger";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "orbe-ledger";

-- Conectar ao banco orbe-services e conceder permissões no schema public
\c "orbe-services"
GRANT ALL ON SCHEMA public TO "orbe-services";
GRANT ALL ON ALL TABLES IN SCHEMA public TO "orbe-services";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "orbe-services";