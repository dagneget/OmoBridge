---
name: jpa-query-reviewer
description: Review Spring Data JPA and Hibernate code for query count, fetching, pagination, transaction, locking, and persistence-context risks. Use for entity mappings, repositories, JPQL or native SQL, Specifications, DTO projections, service methods, REST serialization, or reports of N+1 queries, LazyInitializationException, duplicate rows, slow pages, or excessive database calls.
---

# JPA Query Reviewer

Review the complete persistence path and prove performance claims with query shape or query-count evidence.

## Workflow

1. Trace the request from controller or job through service, repository query, entity mappings, DTO mapping, and serialization. Include every lazy association touched along the path.
2. Record the database, JPA provider and version, expected result cardinality, page size, transaction boundary, and whether Open Session in View is enabled.
3. Inspect the generated query shape or capture a deterministic query-count test. Do not infer N+1 solely from `LAZY` or `EAGER` annotations.
4. Review correctness before optimization: filtering, join semantics, duplicate roots, ordering, null handling, locking, and transaction scope.
5. Review performance: N+1 access, cartesian products, over-fetching, unbounded results, count-query cost, fetch-join pagination, batch fetching, and missing projections.
6. Select the smallest remedy that matches the use case: DTO projection, entity graph, targeted fetch join, batch size, two-step ID pagination, repository redesign, or transaction-bound mapping.
7. Add or update a regression test that asserts result correctness and a stable query-count or query-shape budget.

## Guardrails

- Do not recommend changing every association to `EAGER`.
- Do not combine collection fetch joins with database pagination without explaining provider behavior and validating the generated SQL.
- Do not hide `LazyInitializationException` by enabling Open Session in View without discussing the expanded transactionless access window.
- Do not return managed entities directly from public APIs when serialization can traverse associations unpredictably.
- Treat `@Transactional(readOnly = true)` as an optimization hint and transaction boundary, not an authorization or consistency guarantee.
- Distinguish entity count, SQL statement count, returned row count, and hydrated object count.
- Confirm database indexes with the actual filter, join, and sort columns; JPA annotations alone do not prove an index exists in production.

## Severity

- **Critical** — correctness loss, cross-tenant exposure, unsafe write or lock behavior.
- **High** — unbounded query amplification, broken pagination, or production-scale cartesian growth.
- **Medium** — avoidable over-fetching, unstable ordering, expensive count query, or a fragile transaction boundary.
- **Low** — maintainability issue with limited runtime impact.

## Output contract

List findings in severity order. For each finding provide:

- source location and affected execution path;
- concrete runtime effect;
- evidence or a precise measurement command;
- smallest safe change;
- regression test or query budget.

State "No material JPA findings" when the reviewed path is sound. Do not invent findings to fill categories.

## Reference

Read [references/review-checklist.md](references/review-checklist.md) for pattern-specific checks, measurement snippets, and remedy tradeoffs.
