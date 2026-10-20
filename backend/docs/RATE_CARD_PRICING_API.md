# Rate Card and Pricing API

Base path: `/api/v1`. All routes require an employee access token and an organization claim. Reads are open to every authenticated member; writes are restricted to `ADMIN` and `PRESALE_LEAD`.

## Endpoints

| Method and endpoint | Authorization | Purpose |
| --- | --- | --- |
| `GET /rate-cards` | Any member | Paginated rate card list. |
| `POST /rate-cards` | `ADMIN`, `PRESALE_LEAD` | Create a rate card. Returns `201` with `Location`. |
| `GET /rate-cards/:id` | Any member | Return one rate card. |
| `PATCH /rate-cards/:id` | `ADMIN`, `PRESALE_LEAD` | Partial update. |
| `DELETE /rate-cards/:id` | `ADMIN`, `PRESALE_LEAD` | Delete a rate card. Returns `204`. |
| `POST /rate-cards/pricing/calculate` | Any member | Deterministic quotation pricing from staffing lines. |

## Rate card body

```json
{
  "roleName": "Solution Architect",
  "level": "LEAD",
  "hourlyRateUsd": 75,
  "dailyRateUsd": 600,
  "monthlyRateUsd": 12600,
  "currency": "USD",
  "isActive": true
}
```

`roleName` is required (max 100 characters). `level` is one of `JUNIOR`, `MID`, `SENIOR`, `LEAD` and defaults to `SENIOR`. At least one of `hourlyRateUsd`, `dailyRateUsd`, `monthlyRateUsd` must be greater than zero. `currency` is a 3-letter ISO code and defaults to `USD`. A duplicate `(organization, role, level, currency)` returns `409`.

Query parameters for `GET /rate-cards`: `search`, `level`, `currency`, `active` (`true`/`false`), `page`, `limit`.

Migration `008_reference_data_and_audit_indexes.sql` adds `rate_cards.monthly_rate_usd NUMERIC(12,2)` and backfills it as `daily_rate_usd × 21`.

## Deterministic pricing (roadmap guardrail 3.1)

The AI model may propose staffing lines; the backend owns the arithmetic. `calculatePricing` is a pure domain service — no LLM, no floating-point guesses, no rate invented from prose.

```json
{
  "currency": "USD",
  "proposalId": "00000000-0000-4000-8000-000000000000",
  "apply": false,
  "lines": [
    { "roleName": "Solution Architect", "level": "LEAD", "manMonths": 2 },
    { "roleName": "Senior Backend Developer", "manMonths": 6, "monthlyRateOverride": 9000 }
  ]
}
```

- `lines` must contain 1–100 entries. `roleName` and `manMonths` are required; `manMonths` must be greater than 0 and at most 1200.
- `rateCardId` pins a specific card; otherwise the role is resolved by name (and `level` when supplied) against the organization's active cards in the requested currency.
- `monthlyRateOverride` marks that line `rateSource: MANUAL_OVERRIDE`; everything else resolves to `RATE_CARD`.
- Rate resolution order per card: `monthlyRateUsd` → `dailyRateUsd × 21` → `hourlyRateUsd × 8 × 21`.
- `proposalId` limits the calculation to that proposal's currency and, when present, `apply` defaults to `true`. `apply: true` writes `totalCost` and `currency` onto the proposal through `IProposalRepository.update` and returns the updated proposal.

Response `data.pricing`:

```json
{
  "currency": "USD",
  "totalEffortManMonths": 8,
  "totalCost": 88200,
  "billableDaysPerMonth": 21,
  "billableHoursPerDay": 8,
  "lines": [
    { "roleName": "Solution Architect", "level": "LEAD", "rateCardId": "…", "manMonths": 2,
      "monthlyRate": 12600, "totalCost": 25200, "rateSource": "RATE_CARD" }
  ]
}
```

Unresolvable input returns `400` with the reason: `NO_LINES`, `TOO_MANY_LINES`, `INVALID_EFFORT`, `INVALID_RATE`, `MIXED_CURRENCY`, or `UNKNOWN_ROLE` — the last one lists the roles available in the organization. Each call writes `PRICING_CALCULATED` or `PRICING_APPLIED` to `audit_logs`.
