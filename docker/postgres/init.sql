-- Criar bancos de dados
CREATE DATABASE "orbe-ledger";
CREATE DATABASE "orbe-taxes";
CREATE DATABASE "credit-core";

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

-- Usuário para o banco orbe-taxes
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'orbe-taxes') THEN
    CREATE USER "orbe-taxes" WITH PASSWORD 'orbe-taxes';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE "orbe-taxes" TO "orbe-taxes";

-- credit-core
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'credit-core') THEN
    CREATE USER "credit-core" WITH PASSWORD 'credit-core';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE "credit-core" TO "credit-core";


-- Conectar ao banco orbe-ledger e conceder permissões no schema public
\c "orbe-ledger"
GRANT ALL ON SCHEMA public TO "orbe-ledger";
GRANT ALL ON ALL TABLES IN SCHEMA public TO "orbe-ledger";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "orbe-ledger";

-- Conectar ao banco orbe-taxes e conceder permissões no schema public
\c "orbe-taxes"
GRANT ALL ON SCHEMA public TO "orbe-taxes";
GRANT ALL ON ALL TABLES IN SCHEMA public TO "orbe-taxes";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "orbe-taxes";

-- Conectar ao banco credit-core e conceder permissões no schema public
\c "credit-core"
GRANT ALL ON SCHEMA public TO "credit-core";
GRANT ALL ON ALL TABLES IN SCHEMA public TO "credit-core";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "credit-core";