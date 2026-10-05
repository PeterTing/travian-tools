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
