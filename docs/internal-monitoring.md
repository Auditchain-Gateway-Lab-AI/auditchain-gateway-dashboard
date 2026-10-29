# Internal client monitoring

The admin landing page (`/admin`) retains the original administrative overview.
The separate **Client Monitoring** sidebar menu (`/admin?tab=monitoring`) shows
global condition counts, the five highest
priority clients requiring attention, and a searchable/paginated monitoring table.
Click a client to open `/admin/clients/:clientId/dashboard`. The `returnTo` query
preserves overview filters. Registry management remains at
`/admin?tab=clients&clientId=...`; its drawer links back to the client dashboard.

## Backend endpoints

Both routes require the existing admin bearer authentication middleware:

- `GET /api/admin/monitoring/overview?q=&condition=&status=&sort=condition&page=1`
- `GET /api/admin/clients/:id/monitoring?range=7D`

Overview returns `fetched_at`, global `summary`, up to five `attention` clients,
filtered `clients`, `total`, `page`, `page_size` (20), `pages`, and
`pending_threshold_minutes`. Condition filters are `critical`, `attention`,
`unknown`, and `normal`. Sorting supports `condition`, `name`, and `logs_desc`.
Sorting ties use case-insensitive company name followed by client ID.
Page numbers beyond the last page clamp to the last available page.

Detail returns `fetched_at`, `client`, `trend`, `tables`, and
`pending_threshold_minutes`. Supported ranges: `24H`, `7D` (default), `30D`.
Trend buckets reuse the tenant dashboard aggregation (2h, 24h, and 72h
respectively). These are rolling windows; labels use Asia/Jakarta (WIB).

Client records include administrative status, computed condition, all reasons
(`code`, `message`, `section`), current metrics, and integration configuration.
Timestamps with no source observation and percentages with no denominator are
`null`. A client with no logs has zero counts and unknown condition. A failed
query returns an error rather than fabricating zero counts or a healthy state.

## Condition rules

Priority is Critical > Attention > Unknown > Normal. All applicable reasons are
retained, including reasons at a lower priority.

- Critical: current log integrity contains `TAMPERED`.
- Attention: verification unavailable/error, last connector report contains
  failure/error, or oldest pending anchoring age exceeds the configured limit.
- Unknown: no logs, no integrity check timestamp, or unavailable monitoring data.
- Normal: no conditions above; this does not assert that every log was verified.

`MONITORING_PENDING_THRESHOLD_MINUTES` defaults to 15 for missing, invalid, or
non-positive configuration. Pending age uses ingestion time (`db_timestamp`),
falling back to event timestamp. Recovery events are excluded from audit metrics.
Metrics read current audit rows, independently of `client_dashboard_stats`.
Table grouping matches inventory's resource-prefix convention (`table:record`).

Administrative activation and configured Kafka/Agent access are not evidence of
live connectivity. Connector status is explicitly a last reported value. The
Agent configuration update timestamp is not a heartbeat or connector check time.

The browser polls every 60 seconds while visible and refreshes on visibility.
Refresh failures preserve the last successful snapshot with an error indicator.
Old requests are aborted/ignored. Monitoring performs no ping, verification,
recovery, or write operations.

The client detail uses a direct client dropdown without a separate search field.
Activity is a line and area chart; hover, tap, or focus a point for its exact
count (arrow keys, Home, and End move between points). Integrity uses a donut
with a shared status legend, while anchoring shows coverage and the Gateway →
queue → blockchain flow. Table comparisons prioritize findings, show status
proportions, and expose exact counts through an expandable Detail button.
Empty data never displays complete coverage or a healthy integrity score.

## Validation

Frontend: `npm test -- --watchAll=false --runInBand` and `npm run build`.

Backend: `go test ./internal/modules/client ./internal/modules/recovery ./internal/middleware`.
For PostgreSQL integration coverage, set `MONITORING_TEST_DATABASE_URL` to an
isolated test instance and run `go test ./internal/modules/client -run Monitoring -v`.
Fixtures use TEMP tables in a rolled-back transaction; no production data is needed.
