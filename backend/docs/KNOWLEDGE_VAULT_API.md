# Knowledge Vault API

Base path: `/api/v1`. Knowledge and RAG routes require an access token and an organization. Document listing, detail, deletion, indexing, and retrieval are scoped to the authenticated organization.

## Endpoints

| Method and endpoint | Purpose |
| --- | --- |
| `POST /knowledge/documents` | Create a text asset, split it into chunks, generate embeddings, and index the chunks. |
| `GET /knowledge/documents` | List assets by metadata with `category`, `domain`, `search` (title), `page`, and `limit` filters. |
| `GET /knowledge/documents/:id` | Get asset metadata and indexed chunk count. |
| `DELETE /knowledge/documents/:id` | Delete the asset; PostgreSQL cascades deletion to its chunks/vectors. |
| `POST /knowledge/ask` | Answer a question using organization-scoped RAG, returning citations. |
| `POST /rag/search` | Existing content search; returns matching chunks without synthesizing a chat answer. |
| `POST /rag/ingest` | Existing text-ingestion alias, retained for compatibility with the same tenant/user enforcement. |
| `POST /rag/generate-proposal` | Existing proposal overview generation; retrieval is now organization-scoped. |

### Ingest text asset

File upload/parsing is not implemented in the current backend, so `POST /knowledge/documents` accepts extracted plain text. The request body is JSON:

```json
{
  "title": "Security architecture reference",
  "category": "TECH_SPEC",
  "domain": "Banking",
  "content": "The extracted document text..."
}
```

`organizationId` and `uploadedBy` are taken from the access token, never from the request. `category` and `domain` default to `GENERAL`; title is limited to 255 characters and content to 1,000,000 characters. Successful ingestion returns `{ "docId": "...", "totalChunks": 12 }`. If embedding or chunk persistence fails, the newly created document row is removed to avoid an orphaned asset.

### List assets

Example: `GET /knowledge/documents?category=TECH_SPEC&domain=Banking&search=security&page=1&limit=20`.

Response shape: `{ "success": true, "data": [...], "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 } }`. Search is title-only metadata search; it does not run vector search.

### Ask with citations

Request: `{ "question": "What controls are used for access management?", "domain": "Banking", "topK": 5 }`. `domain` and `topK` are optional; topK is 1–10. Response data contains `answer` and `citations[]`, each with `label` (such as `[1]`), chunk id, document id, title, excerpt, and retrieval score. The generated answer is instructed to cite the retrieved source labels. When no relevant excerpts are found, the answer must report insufficient evidence and citations will be empty.

## Data and implementation notes

The repository uses `knowledge_docs` for asset metadata and `document_chunks` for content and vectors. The existing cascading foreign key removes chunk/vector rows when a document is deleted. Ingestion stores `file_type=TEXT` and an approximate word count in `total_tokens`; it does not store the full raw text in `knowledge_docs`.

The API distinguishes metadata queries (`GET /knowledge/documents`) from content retrieval (`POST /rag/search` and `POST /knowledge/ask`). Both content endpoints now pass the authenticated organization into the database hybrid-search function. No schema migration is needed for the implemented endpoints. Run `npm run build` from `backend` for TypeScript verification; no database integration test was run as part of this change.
