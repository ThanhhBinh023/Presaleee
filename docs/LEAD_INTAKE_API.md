# Lead Intake Analysis API

## Endpoint

`POST /api/v1/leads/intake/analyze`

This endpoint analyzes plain-text RFP content and returns an unsaved Lead draft for frontend review. It does not write to the database.

## Request

```json
{
  "rawRfpContent": "We need a retail POS that works offline and synchronizes inventory when the network returns.",
  "source": "MANUAL"
}
```

`rawRfpContent` is required, must contain non-whitespace text, and is limited to 50,000 characters. `source` is optional and accepts `INBOUND_EMAIL`, `WEBSITE`, `REFERRAL`, `MEETING`, or `MANUAL`; it defaults to `MANUAL`.

## Success response

```json
{
  "success": true,
  "data": {
    "draft": {
      "id": null,
      "organizationId": null,
      "clientId": null,
      "createdBy": null,
      "assignedTo": null,
      "title": "Offline Retail POS",
      "source": "MANUAL",
      "status": null,
      "rawRfpContent": "We need a retail POS that works offline and synchronizes inventory when the network returns.",
      "extractedMetadata": {
        "projectName": "Offline Retail POS",
        "clientIndustry": "Retail",
        "businessGoal": "Support sales during network outages and synchronize inventory afterward.",
        "timelineWeeks": null,
        "budgetUsd": null,
        "targetPlatforms": [],
        "coreFunctionalModules": ["Offline POS", "Inventory synchronization"],
        "integrationsRequired": [],
        "complianceAndSecurity": [],
        "priorityLevel": null
      },
      "bantScore": null,
      "bantDetails": null,
      "createdAt": null,
      "updatedAt": null
    },
    "missingInformation": ["What is the target delivery date?", "What is the approved budget?"]
  },
  "meta": {
    "persisted": false,
    "message": "This is an unsaved Lead draft. Review it before persisting."
  }
}
```

The sample values are illustrative. The response fields are normalized by the Backend; persistence-owned values remain `null` until a separate save endpoint is implemented.

## Errors

- `400`: missing/blank RFP content, over 50,000 characters, or unsupported source.
- `502`: AI service failure or invalid AI JSON/schema response.

The endpoint requires the FastAPI service to be reachable at `AI_SERVICE_URL` and the configured LLM adapter to be loadable.
