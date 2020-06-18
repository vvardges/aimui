#!/bin/bash

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE aim_db;
	CREATE USER aim_user WITH password 'iu2g6udb982uyvUYGdwh093hioq0';
	GRANT ALL ON DATABASE aim_db TO aim_user;
EOSQL
