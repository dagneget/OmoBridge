# OmoBridge Database Change and Migration Rules

## 1. Project Context

OmoBridge uses:

- **Database:** PostgreSQL
- **Backend:** Java + Spring Boot
- **Database migrations:** Flyway
- **Migration directory:** `backend/src/main/resources/db/migration/`
- **Database architecture:** Relational database with foreign keys, constraints, indexes, and transaction-safe operations.

The database supports:

- Users, authentication, roles, and permissions
- Farmers and community micro-enterprises
- Farmer supply deliveries and raw-material inventory
- Production batches and finished-product traceability
- Product catalog, pricing, orders, payments, and delivery
- Tourism experiences, guides, and bookings
- Reviews, notifications, audit logs, and USSD/SMS integrations

**The existing repository is the source of truth.** Inspect the actual project, configuration, database schema, and migration history before making changes. Do not assume the repository matches this document exactly.

## 2. Core Rules

1. Use Flyway for all version-controlled database schema changes.
2. Never modify a migration that has already been applied to a shared or production database.
3. Create a new migration for every schema change.
4. Never drop or recreate a database simply to resolve a schema mismatch.
5. Preserve existing business data unless deletion is explicitly required and authorized.
6. Never remove existing tables, columns, relationships, constraints, or indexes without checking their dependencies and purpose.
7. Do not change unrelated application functionality or redesign the existing frontend when performing database work.
8. Keep entity classes, repositories, services, DTOs, validation, API contracts, and database migrations consistent.
9. Use transactions for operations that must succeed or fail as a unit.
10. Never claim that a migration or database change succeeded without running the relevant checks.

## 3. Mandatory Workflow Before Changing the Database

Before modifying anything:

1. Inspect the repository structure.
2. Inspect the existing Flyway migration files.
3. Check which migrations have already been applied, using Flyway history or the target database where access is available.
4. Inspect the current PostgreSQL schema and relevant data.
5. Identify affected tables, columns, foreign keys, indexes, constraints, entities, repositories, services, and API endpoints.
6. Determine whether the change is backward-compatible and whether existing data needs transformation.
7. Explain any destructive or potentially breaking change before implementing it.
8. Create an implementation plan when multiple tables or application modules are affected.

Do not invent migration versions or assume a migration is unapplied. Use the next valid version based on the repository and actual migration history.

## 4. Flyway Migration Conventions

Use this filename pattern:

`V<version>__<description>.sql`

Example:

```text
backend/src/main/resources/db/migration/
├── V1__create_identity_and_access.sql
├── V2__create_enterprises_and_farmers.sql
├── V3__create_supply_management.sql
├── V4__create_inventory_and_movements.sql
└── V5__add_farmer_verification_status.sql
```

The example versions are illustrative. Inspect the actual repository before selecting a version.

For every new migration:

- Use a unique, sequential version consistent with the project's migration history.
- Use descriptive filenames.
- Include necessary foreign keys, indexes, defaults, and constraints.
- Consider existing rows before adding `NOT NULL` constraints.
- Ensure referenced tables and columns exist before adding foreign keys.
- Avoid destructive changes unless explicitly required.
- Keep schema migrations separate from demo-data seeding where practical.
- Commit the migration alongside the corresponding application changes.

## 5. Adding a Column

When adding a column to an existing table, create a new migration.

Example:

```sql
ALTER TABLE farmers
    ADD COLUMN verification_status VARCHAR(30)
    NOT NULL DEFAULT 'PENDING';
```

Use a default only when it accurately represents the business meaning.

If existing records need a careful data migration:

1. Add the column as nullable.
2. Populate existing records with appropriate values.
3. Validate the migrated data.
4. Add the default and `NOT NULL` constraint in a subsequent migration when appropriate.

Never assign a misleading status to historical records merely to satisfy a constraint.

## 6. Modifying or Renaming Columns

Before changing a column:

1. Search the repository for all references to it.
2. Inspect the data and determine whether conversion is required.
3. Check indexes, constraints, foreign keys, views, queries, and application mappings.
4. Create a new migration.
5. Update affected Java entities, repositories, services, DTOs, tests, and API mappings.
6. Test the migration against existing data.

For production deployments requiring backward compatibility, use an expand-and-contract approach:

1. Add the new schema structure.
2. Support old and new structures temporarily if necessary.
3. Backfill existing data.
4. Update the application to use the new structure.
5. Verify that old code no longer depends on the previous structure.
6. Remove the old structure in a later migration.

Do not perform a destructive rename without checking application deployment compatibility.

## 7. Removing Tables or Columns

Before removing a database structure:

- Confirm that it is no longer used.
- Check foreign keys and application dependencies.
- Identify any historical or financial data that must be preserved.
- Back up the database when the change affects important data.
- Test the migration on a representative database.
- Document the impact and recovery strategy.

Prefer a staged removal rather than dropping a structure immediately.

Never use `DROP SCHEMA`, `DROP TABLE`, `TRUNCATE`, or database-reset commands to make migrations pass without explicit authorization and a confirmed data-loss assessment.

Never run Flyway `clean` against production.

## 8. Spring Boot and Flyway Configuration

Inspect the existing configuration before modifying it. When appropriate, the configuration should follow this pattern:

```yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

  flyway:
    enabled: true
    locations: classpath:db/migration

  jpa:
    hibernate:
      ddl-auto: validate
```

Use `ddl-auto: validate` if the application uses JPA and Hibernate entity mappings should be checked against the migrated schema.

Flyway must remain responsible for schema changes. Do not use Hibernate `ddl-auto: update` as the production schema migration strategy.

Do not hardcode database credentials or commit secrets.

## 9. OmoBridge-Specific Integrity Requirements

### Farmer Supplies

- Preserve farmer, enterprise, supply delivery, delivery item, and inventory lot relationships.
- Track delivered, accepted, and rejected quantities separately.
- Enforce valid quantity constraints.
- Preserve historical supplier payment obligations and allocations.
- Restrict farmers to their own authorized records.

### Inventory

- Record stock receipts, consumption, adjustments, transfers, and disposals.
- Keep inventory movements and stored balances consistent.
- Prevent concurrent operations from consuming more stock than is available.
- Use database transactions and appropriate locking.
- Never silently overwrite historical stock movements.

### Production and Traceability

- Preserve the relationships between farmer supplies, inventory lots, production inputs, production batches, and finished outputs.
- Track actual output and losses.
- Do not delete inventory lots that have been used in production.
- Validate traceability links after migrations.
- Preserve historical product-origin information.

### Products and Orders

- Preserve product ownership and enterprise relationships.
- Preserve historical order item names, SKUs, quantities, prices, and currency.
- Do not allow catalog changes to rewrite historical order snapshots.
- Ensure stock reservation and checkout are transaction-safe.

### Payments

- Preserve payment attempts, provider references, refunds, and financial history.
- Use idempotency for payment operations and verified provider events.
- Never trust frontend payment success messages.
- Do not delete financial records merely because an order is cancelled.

### Tourism and Bookings

- Preserve booking references and booking status history.
- Maintain correct relationships between experiences, guides, availability sessions, and bookings.
- Prevent overbooking through transaction-safe capacity management.
- Test concurrent booking requests after relevant schema changes.

### Security and Auditing

- Enforce authorization on the backend.
- Preserve audit history for important business operations.
- Do not expose secrets or unnecessary personal information in logs.
- Use deliberate foreign-key deletion policies rather than indiscriminate cascading deletes.

## 10. Development Database Versus Production Database

### Local Development

A database reset is acceptable only when its data is disposable and the user explicitly authorizes the reset.

After a reset:

1. Recreate the database if required.
2. Run all migrations from the beginning.
3. Load approved demo data.
4. Run tests.
5. Verify the resulting schema.

Do not reset a shared database or delete useful developer data without authorization.

### Production

For production changes:

1. Review the migration for locking, compatibility, and data-loss risks.
2. Create a backup.
3. Verify that the backup can be restored.
4. Test the migration against a staging copy of production data.
5. Check Flyway migration history.
6. Prepare a recovery plan.
7. Deploy in a compatible order.
8. Verify data integrity and application behavior.
9. Monitor logs and errors after deployment.

A database backup is not sufficient unless the restoration process is known and tested.

## 11. Testing Requirements

After a database change:

- Verify that the migration works on a fresh database.
- Verify that it works against a database containing representative existing data.
- Run backend tests.
- Check entity-to-schema consistency.
- Verify affected repositories and SQL queries.
- Test affected API endpoints.
- Check foreign keys, unique constraints, check constraints, and indexes.
- Verify that important business records remain intact.
- Test relevant inventory, payment, and booking transactions.
- Report any tests that could not be executed.

Do not claim successful execution without evidence.

## 12. Required Output After Implementing a Change

When you finish a database change, report:

1. **What changed:** Tables, columns, constraints, relationships, and indexes affected.
2. **Migration created:** Exact filename and purpose.
3. **Application changes:** Entities, repositories, services, DTOs, and endpoints affected.
4. **Data handling:** How existing records were preserved or transformed.
5. **Tests performed:** Commands executed and their actual results.
6. **Risks:** Any compatibility, locking, data-loss, or deployment concerns.
7. **Deployment instructions:** Required migration and application deployment sequence.
8. **Unfinished work:** Anything that remains unimplemented or unverified.

Clearly distinguish completed work from recommendations or work that still requires execution.

## 13. Final Decision Rules

For every OmoBridge database change:

- **New feature:** Create a new migration and update the related application layers.
- **Schema modification:** Create a new migration and preserve existing data.
- **Data transformation:** Backfill, validate, and document the transformation.
- **Development reset:** Proceed only with disposable data and explicit authorization.
- **Production change:** Use a reviewed migration, verified backup, staging test, and recovery plan.
- **Destructive operation:** Explain the consequences and obtain authorization before proceeding.

**Final instruction:** Inspect the actual OmoBridge repository and database migration history first. Make the smallest safe change that satisfies the requirement. Preserve existing functionality and business history. Do not recreate the database, overwrite migrations, or introduce unrelated architectural changes without explicit authorization.
