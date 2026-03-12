#!/bin/bash
set -e

# This script runs on first PostgreSQL start to create additional databases.
# POSTGRES_DB (mastra) is created automatically by the postgres image.
# We create the betterauth database here.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE betterauth;
    GRANT ALL PRIVILEGES ON DATABASE betterauth TO $POSTGRES_USER;
EOSQL
