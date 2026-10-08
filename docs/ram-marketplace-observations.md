# RAM Marketplace public preview observations

Engine Room only reads `GET https://ram-marketplace-preview.onrender.com/api/marketplace`, a public, anonymous listing endpoint that declares three explicit privacy invariants: no source identity, no exact location, and no restricted source joins.

The adapter fails closed unless each privacy flag is exactly `false`, and it returns **only the record count**, never reproducing the listings or identifying metadata. The storefront endpoint may use demonstration data, so this is labeled **public preview listings**, not live commercially available animals, transactions, sales, fulfillment, or revenue. Failed or missing responses are **Unverified**, not 0.

The server caches the observed count for five minutes. Private marketplace operations require separately authorized source-scoped telemetry; public counts are not a substitute for those data connections.
