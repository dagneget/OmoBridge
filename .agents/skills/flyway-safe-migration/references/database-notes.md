# Flyway migration database notes

Use exact vendor documentation for the deployed major version before making operational guarantees.

## PostgreSQL

Review the lock mode and whether it is held until transaction end. A fast metadata change can still queue behind another transaction and then block later traffic.

Common patterns:

- Build large indexes with `CREATE INDEX CONCURRENTLY` when its limitations are acceptable. It cannot run inside a transaction block and a failed build can leave an invalid index that needs cleanup.
- Add check or foreign-key constraints as `NOT VALID` when supported, then validate separately; understand that validation still scans data and takes locks.
- Use expand-contract for renames and drops: add the new shape, deploy dual-compatible code, backfill, switch reads, then remove the old shape after every old application version is gone.
- Batch backfills with an indexed key and observable progress. Avoid one unbounded transaction.
- Verify version-specific behavior for adding columns with defaults and for type changes; expression and volatility can change rewrite behavior.

Useful official references:

- [PostgreSQL `CREATE INDEX`](https://www.postgresql.org/docs/current/sql-createindex.html)
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL `ALTER TABLE`](https://www.postgresql.org/docs/current/sql-altertable.html)

## MySQL

DDL commonly causes implicit commits and uses metadata locks. Requested `ALGORITHM` and `LOCK` clauses are not universal guarantees; support depends on operation, table, engine, and version.

Common patterns:

- Request the intended algorithm explicitly when the server supports it, and fail rather than silently accepting an unexpected copy when that is the release policy.
- Inspect foreign keys, generated columns, full-text indexes, partitioning, and engine restrictions before assuming `INSTANT` or `INPLACE` behavior.
- Treat a waiting metadata lock as an incident risk because new queries may queue behind it.
- Separate backfills from DDL, process bounded key ranges, and record restart progress.
- Use expand-contract for renames, type transitions, and destructive cleanup during rolling deployments.

Useful official references:

- [MySQL online DDL](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html)
- [MySQL metadata locking](https://dev.mysql.com/doc/refman/8.4/en/metadata-locking.html)
- [MySQL implicit commits](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)

## Flyway transaction boundaries

Check whether the database and Flyway edition/version execute each migration transactionally, and whether the file mixes transactional and non-transactional statements. PostgreSQL concurrent index creation is a common reason to isolate a statement in a migration configured to run outside a transaction. MySQL DDL implicit commits mean a Java transaction wrapper is not rollback protection.

Never edit the contents of a versioned migration already applied in a shared environment merely to make validation pass. Add a new forward migration unless the team has explicitly established a safe repair procedure.

Official reference: [Flyway migration transaction handling](https://documentation.red-gate.com/flyway/flyway-concepts/migrations/migration-transaction-handling)

## Review template

For each risky statement, capture:

| Field | Required detail |
|---|---|
| Environment | engine, major version, Flyway version |
| Scale | row count, relation size, write rate |
| Risk | lock mode and duration, scan/rewrite/copy, log growth |
| Compatibility | oldest and newest app versions in overlap |
| Safer plan | exact phased SQL and deployment order |
| Abort | timeout, lag, lock wait, error-rate threshold |
| Verify | catalog and application checks |
| Recover | roll-forward, restore, or cleanup steps |
