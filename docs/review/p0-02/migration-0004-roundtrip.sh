#!/usr/bin/env bash
# Migration 0004 round trip on a brand-new local MariaDB database (no app data, no network).
set -euo pipefail
cd /workspace/travian-tool/p0/travian-tools/backend
SOCK=/workspace/travian-tool/mariadb/run/mysqld.sock
DB=travian_p0_02_fresh
export DATABASE_URL="mysql+mysqlconnector://tt:ttlocal@127.0.0.1:3307/$DB"
export PATH="$PWD/.venv/bin:$PATH"
sql() { echo "+ mariadb $DB -e \"$1\""; mariadb -S "$SOCK" -u root --table "$DB" -e "$1"; }
run() { echo "+ $*"; "$@" 2>&1; }

DIRTY=$(git status --porcelain | grep -q . && echo " (+ working tree)" || true)
echo "# $(date '+%Y-%m-%d %H:%M') PT · branch $(git rev-parse --abbrev-ref HEAD) · commit $(git rev-parse --short HEAD)$DIRTY"
echo "+ mariadb -e \"DROP DATABASE IF EXISTS $DB; CREATE DATABASE $DB\""
mariadb -S "$SOCK" -u root -e "DROP DATABASE IF EXISTS $DB; CREATE DATABASE $DB CHARACTER SET utf8mb4"

run alembic upgrade 0003_ext_token_version
# a little existing data so the 0004 backfill has something to do (fake users, no credentials)
sql "INSERT INTO users (user_id, username, email, password_hash, extension_token_version) VALUES ('u1','peter','p@example.com','x',0), ('u2','other','o@example.com','x',0);
INSERT INTO game_accounts (account_id, user_id, server_url, server_speed, player_name, is_active) VALUES
 ('a1','u1','https://ts3.x1.asia.travian.com',1,'PeterT',1),
 ('a2','u1','https://TS3.x1.asia.travian.com/dorf1.php',1,'alt',1),
 ('a3','u1','https://ts5.x1.asia.travian.com',1,'PeterT',1),
 ('a4','u2','https://ts3.x1.asia.travian.com',1,'Other',1);"

echo; echo "## upgrade"
run alembic upgrade head
run alembic current
run alembic check
sql "SHOW COLUMNS FROM game_accounts WHERE Field IN ('time_display','local_timezone','world_id')"
sql "SHOW COLUMNS FROM game_worlds"
sql "SELECT a.account_id, a.user_id, a.server_url, w.server_url AS world_url, w.utc_offset, a.time_display FROM game_accounts a LEFT JOIN game_worlds w ON w.world_id = a.world_id ORDER BY a.account_id"
sql "SELECT COUNT(*) AS worlds FROM game_worlds"

echo; echo "## downgrade"
run alembic downgrade -1
run alembic current
sql "SHOW TABLES LIKE 'game_worlds'"
sql "SELECT COUNT(*) AS new_columns_left FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'game_accounts' AND column_name IN ('world_id','time_display','local_timezone')"
sql "SELECT account_id, server_url, player_name FROM game_accounts ORDER BY account_id"

echo; echo "## upgrade again"
run alembic upgrade head
run alembic current
run alembic check
sql "SELECT COUNT(*) AS worlds, SUM(utc_offset IS NULL) AS offsets_null FROM game_worlds"
sql "SELECT COUNT(*) AS accounts_without_world FROM game_accounts WHERE world_id IS NULL"

echo "+ mariadb -e \"DROP DATABASE $DB\""
mariadb -S "$SOCK" -u root -e "DROP DATABASE $DB"
echo "# done"
