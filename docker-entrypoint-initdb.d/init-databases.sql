-- Criação dos bancos de dados
CREATE DATABASE "main-ledger";
CREATE DATABASE "orbe-taxes";
CREATE DATABASE "spi-simulator";

-- Criação dos usuários e permissões
-- Usuário para o banco ledger
CREATE USER "orbe-ledger" WITH PASSWORD 'orbe-ledger';
GRANT ALL PRIVILEGES ON DATABASE "main-ledger" TO "orbe-ledger";

-- Usuário para o banco services
CREATE USER "orbe-taxes" WITH PASSWORD 'orbe-taxes';
GRANT ALL PRIVILEGES ON DATABASE "orbe-taxes" TO "orbe-taxes";

-- Usuário para o banco spi-simulator
CREATE USER "spi-simulator" WITH PASSWORD 'spi-simulator';
GRANT ALL PRIVILEGES ON DATABASE "spi-simulator" TO "spi-simulator";

-- Conectar ao banco ledger e conceder permissões no schema public
\c "main-ledger"
GRANT ALL ON SCHEMA public TO "orbe-ledger";
GRANT ALL ON ALL TABLES IN SCHEMA public TO "orbe-ledger";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "orbe-ledger";

-- Conectar ao banco services e conceder permissões no schema public
\c "orbe-taxes"
GRANT ALL ON SCHEMA public TO "orbe-taxes";
GRANT ALL ON ALL TABLES IN SCHEMA public TO "orbe-taxes";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "orbe-taxes";

-- -- Conectar ao banco spi-simulator e conceder permissões no schema public
-- \c "spi-simulator"
-- GRANT ALL ON SCHEMA public TO "spi-simulator";
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO "spi-simulator";
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "spi-simulator";
