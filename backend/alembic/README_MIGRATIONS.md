# Migrations

The chain was squashed on 2026-10-04 (P0 backend slimming):

| Revision | What |
|---|---|
| `0001_baseline` | Full schema, generated from the models and reviewed. |
| `0002_drop_legacy` | Drops `game_accounts.login_email/login_password`, the 10 automation tables and the 2 AI conversation tables **if they exist**. No-op on fresh databases. **Irreversible.** |

## Why squash instead of fixing the old chain

* The old chain ran on an empty DB but produced the wrong schema: `004` was
  meant to rename `building_instances.slot` → `position` but only drops a
  column ("already executed, so skip"), so a migration-built DB lacked columns
  the code uses (`building_instances.position`, `villages.cp_per_day`,
  `battle_reports.title/is_read`, …) and `POST /villages` returned 500.
  Real databases must therefore have been patched by hand / `create_all`, and
  their recorded revision does not describe their schema.
* Autogenerate showed 147 differences between the old head and the models
  (types, nullability, indexes, comments, missing tables).
* About half of the old revisions only created tables that this change removes.
  Repairing them would mean editing history that is about to be dropped anyway.

## Fresh database

```bash
alembic upgrade head
alembic check        # must print "No new upgrade operations detected."
```

## Existing (legacy) database

**Mandatory backup first.** Before upgrading *any* existing database through
`0002_drop_legacy`, dump a full local backup. `0002_drop_legacy` permanently
deletes stored Travian passwords and all automation/conversation data, and its
downgrade restores nothing.

* Keep the dump **local only** (e.g. `~/travian-tools-backups/`, outside the
  repository). **Never commit it** and never upload it anywhere: it may contain
  the old plaintext Travian passwords. `backups/` and `*.dump.sql*` are
  git-ignored as a safety net.
* Check the dump is non-empty and restorable before running the upgrade.

```bash
mkdir -p ~/travian-tools-backups
mysqldump --single-transaction --routines --triggers <db_name> \
  | gzip > ~/travian-tools-backups/<db_name>-$(date +%Y%m%d-%H%M%S).dump.sql.gz
alembic stamp --purge 0001_baseline   # forget the old revision ids
alembic upgrade head                   # runs 0002_drop_legacy
alembic check                          # shows any remaining drift
```

If `alembic check` still reports differences (a database created from an older
model version), either write a one-off migration for them or export the data,
rebuild the database with `alembic upgrade head`, and re-import. This path was
tested against a database created with `Base.metadata.create_all()` from the
pre-P0 `main` models and stamped `012_statistics_tables`: after the steps
above, `alembic check` reported no differences.

## `0009_multi_tribe`（P0-25 一個帳號多個部族）

Adds three columns, all additive (the previous app revision keeps working on
an upgraded database):

| Column | Backfill |
|---|---|
| `game_accounts.birth_tribe` | `= game_accounts.tribe`（出生部族） |
| `villages.tribe` | `= the owning account's tribe`（NULL when the account has none） |
| `game_worlds.keep_tribe_on_conquest` | `false`（server default `0`；every existing world stays single-tribe） |

Downgrade first copies `birth_tribe` back into `game_accounts.tribe`, then
drops the three columns. It loses only the per-village tribe choices and the
world switch — data that did not exist before 0009. Tested by
`tests/unit/test_migration_0009_multi_tribe.py` (upgrade → downgrade → upgrade
with data, SQLite always, MySQL 8 when `MIGRATION_TEST_MYSQL_URL` is set; CI
runs it on its MySQL 8 service and also runs `alembic downgrade -1 && alembic
upgrade head && alembic check`).

Production order (from the repo root, never skip the backup):

```bash
export CLOUDSDK_ACTIVE_CONFIG_NAME=travian-tools
# 1. on-demand Cloud SQL backup, then confirm it is SUCCESSFUL
gcloud sql backups create --instance travian-tools-db --project artogo-travian-tools \
  --description "before 0009_multi_tribe"
gcloud sql backups list --instance travian-tools-db --project artogo-travian-tools --limit 3
# 2. build -> migrate -> deploy
scripts/deploy_cloud_run.sh build
scripts/deploy_cloud_run.sh migrate   # alembic upgrade head && alembic check (Cloud Run Job)
scripts/deploy_cloud_run.sh deploy
```

Rollback: route traffic back to the previous `tt-api` revision (the schema is
additive, so no downgrade is needed for that). Only if the columns must go:

```bash
gcloud run jobs execute travian-tools-migrate --project artogo-travian-tools \
  --region asia-east1 --wait --args="-c,alembic downgrade 0008_sync_type_rally"
```
