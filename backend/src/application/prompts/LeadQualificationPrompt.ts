export const LEAD_QUALIFICATION_SCHEMA = `{
  "score": "integer 0-100",
  "recommendation": "QUALIFY, REVIEW, or DISQUALIFY",
  "summary": "short explanation",
  "criteria": {
    "budget": { "score": "integer 0-25", "assessment": "text", "evidence": ["text"] },
    "authority": { "score": "integer 0-25", "assessment": "text", "evidence": ["text"] },
    "need": { "score": "integer 0-25", "assessment": "text", "evidence": ["text"] },
    "timeline": { "score": "integer 0-25", "assessment": "text", "evidence": ["text"] }
  },
  "risks": ["text"],
  "next_steps": ["text"]
}`;
