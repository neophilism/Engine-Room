# Finance model

PR 33 stores immutable source-scoped financial entries and forecast snapshots. Amounts use integer minor units and explicit supported currencies; aggregation uses exact integer arithmetic. Negative entries represent credits or refunds. USD/EUR/GBP/CAD/AUD use two minor-unit digits, JPY zero, and KWD three. No exchange-rate conversion is performed.

Entries have cost/revenue kind, category, accounting date, source identity, project and environment. The source is responsible for currency, tax and accounting semantics. Reusing an entry identity with different content is rejected; corrections require explicit new source entries. Forecasts carry a month, expected cost/revenue and observation timestamp. The latest forecast for the selected scope is displayed separately from actuals.

The Finance dashboard filters month, currency and environment, shows recorded totals and project coverage, and keeps absent cost/revenue unknown. An explicitly recorded zero remains zero. Net requires both cost and revenue entries. Totals describe the imported entries, not certified completeness of accounting records.

`recordFinancialData` is a trusted transactional server operation. PR 34 supplies scoped signed adapters and the financial-flow visualization.
