---
name: flyway-safe-migration
description: Review Flyway SQL migrations for PostgreSQL or MySQL production safety. Use when creating or reviewing versioned or repeatable migration files, pull requests with DDL or backfills, zero-downtime schema changes, expand-contract rollouts, index creation, constraint validation, type changes, renames, or destructive statements; require database context before making lock or rewrite guarantees.
---

# Flyway Safe Migration

Identify lock, rewrite, compatibility, transaction, rollback, and data-loss risks before a Flyway migration reaches production.

## Collect context

Determine these inputs before assigning severity:

- database engine and exact major version;
- Flyway version and transaction configuration;
- table size, row count, write rate, and deployment traffic;
- application versions that may run during rolling deployment;
- statement timeout, lock timeout, replication, and maintenance-window constraints;
- available backup, restore, and roll-forward procedure.

If context is missing, state assumptions and give conditional findings. Never promise that DDL is online or lock-free from syntax alone.

## Review workflow

1. Read migrations in version order and identify schema state before and after the change.
2. Classify every statement as metadata-only, validation scan, table scan, table rewrite or copy, blocking index build, data backfill, or destructive change for the target engine and version.
3. Analyze lock acquisition and duration, including lock-queue amplification when a DDL statement waits behind another transaction.
4. Check mixed-version compatibility. Apply expand-contract when old and new application versions overlap.
5. Separate schema changes from large backfills when batching, throttling, observability, or restartability is required.
6. Check Flyway transaction behavior. Flag statements that cannot run inside the migration transaction or that cause implicit commits.
7. Define abort signals, verification queries, and a roll-forward path. Treat down migrations as optional evidence, not proof of safe rollback.
8. Offer a safe rewrite with explicit engine and version scope.

## Always inspect

- `DROP`, truncate, narrowing type changes, and rename compatibility windows;
- `NOT NULL`, defaults, unique checks, foreign keys, and constraint validation scans;
- non-concurrent or non-online index builds;
- full-table `UPDATE` or `DELETE` statements and transaction log growth;
- MySQL metadata locks, implicit commits, and requested `ALGORITHM` or `LOCK` behavior;
- PostgreSQL `CREATE INDEX CONCURRENTLY`, invalid index cleanup, and transaction restrictions;
- checksum edits to migrations already applied in shared environments;
- repeatable migrations whose side effects are not idempotent.

## Output contract

Start with a release decision: **block**, **change required**, **safe with conditions**, or **low risk**.

For each finding provide:

- severity and exact statement;
- affected engine and version assumptions;
- lock, rewrite, compatibility, or data-loss mechanism;
- safer SQL or phased rollout;
- pre-deploy, in-flight, and post-deploy verification;
- roll-forward or recovery action.

Do not describe a migration as safe when table size, database version, or deployment overlap is unknown. State which missing fact changes the decision.

## Reference

Read [references/database-notes.md](references/database-notes.md) for PostgreSQL and MySQL patterns, Flyway transaction notes, and expand-contract examples.
