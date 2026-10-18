# JPA query review checklist

## Measure before changing

Capture generated SQL in a test environment or use Hibernate statistics around one deterministic service call:

```java
Statistics statistics = entityManagerFactory
    .unwrap(SessionFactory.class)
    .getStatistics();
statistics.clear();

var result = service.loadPage();

assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(2);
```

Include setup queries outside the measured window. Assert returned data as well as query count.

## N+1 and fetching

An N+1 exists when one query loads roots and later access issues a query per root or batch. Confirm the accessed association and measured statement count.

Choose remedies deliberately:

- DTO projection for read-only, bounded response shapes;
- entity graph for reusable entity loading plans;
- fetch join for one targeted to-one or bounded collection path;
- batch fetching when several lazy associations must remain lazy;
- two-step ID pagination when a collection and stable database pagination are both required.

Multiple collection fetch joins can multiply rows or fail for bag mappings. `DISTINCT` may deduplicate entities in memory without reducing database work.

## Pagination

Require a deterministic, preferably unique final sort key. Review:

- collection fetch join combined with `Pageable`;
- count query semantics after joins and filters;
- deep offset cost;
- keyset pagination eligibility;
- mutable sort columns;
- page drift under concurrent writes.

## Transaction boundaries

Keep entity traversal, write dirty checking, and required lazy loading inside an intentional service transaction. Avoid remote calls while holding database locks. Review propagation and isolation only against the real call path; self-invocation does not pass through Spring proxies.

For writes, check lost-update protection (`@Version` where appropriate), pessimistic lock scope, retry behavior, and idempotency.

## Repository queries

Review JPQL, Criteria, Specifications, Query by Example, and native SQL for:

- unintended inner joins that drop rows;
- predicates in `WHERE` that undo a left join;
- duplicate root entities;
- nullable parameter semantics;
- unbounded `findAll` use;
- bulk DML bypassing the persistence context;
- native query and count query drift;
- tenant or authorization predicates missing from custom paths.

Bulk `UPDATE` or `DELETE` does not synchronize already managed entities. Clear or refresh intentionally.

## Entity and API boundaries

Check bidirectional relationship maintenance, cascade and orphan removal intent, generated ID equality semantics, mutable `hashCode`, and accidental association traversal in `toString`, logging, JSON serialization, or mapping libraries.

Prefer API DTOs over serializing managed entities. Keep web concerns from choosing persistence fetch plans implicitly.

## Index evidence

Map the actual SQL predicates, joins, order, selectivity, and database plan to an index recommendation. Avoid recommending one index per column. Check whether an existing composite index already covers the useful prefix and whether write amplification is acceptable.
