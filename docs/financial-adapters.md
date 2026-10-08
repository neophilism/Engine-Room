# Financial source adapters

PR 34 adds financial-entry and financial-forecast capabilities to the signed telemetry endpoint. Project/environment/source remain credential-derived. The canonical engine-room-v1 adapter accepts financial-entry records with externalId, direction (cost/revenue), category, currency, integer amountMinor, occurredOn, optional description; financial-forecast records use externalId, currency, period, integer costMinor/revenueMinor, and observedAt.

The finance-json-v1 adapter accepts version, deliveryId, optional entries and forecasts arrays (1–100 combined). Entry fields are id, date, kind (cost/revenue), category, currency, amount (decimal string), optional description. Forecast fields are id, period, currency, cost/revenue (decimal strings), and observedAt (UTC ISO timestamp).

The finance-csv-v1 adapter accepts version, deliveryId, mode (entries/forecasts), and csv as a JSON string. Entry columns are id,date,kind,category,currency,amount with optional description. Forecast columns are id,period,currency,cost,revenue,observedAt. Quoted commas, escaped double quotes, and quoted newlines are supported. Duplicate/unknown headers, mismatched rows, malformed quotes, unsupported currencies, over-precision, and unsafe amounts are rejected.

Decimals are converted by integer arithmetic, preserving 0.29 as exactly 29 USD cents. No binary floating-point rounding, exchange conversion, or unit guessing occurs. JSON amount strings and CSV rows normalize into the same domain records and participate in the same receipt and all-or-nothing transaction. Corrections use new source entry identities; source-scoped duplicates cannot silently rewrite invoices.

The Finance page includes a responsive cost → revenue → recorded net → forecast net machine and exact recorded cost-driver bars. Actuals and estimates remain visibly separate; partial import coverage and unavailable values remain explicit. These are generic adapters ready for a trusted billing/export producer; no vendor account is connected by this PR.
