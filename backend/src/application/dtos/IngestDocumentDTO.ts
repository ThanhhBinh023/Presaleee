export interface IngestDocumentInputDTO {
  title: unknown;
  category: unknown;
  domain: unknown;
  content: unknown;
  organizationId: string;
  uploadedBy: string;
}

export interface IngestDocumentOutputDTO {
  docId: string;
  totalChunks: number;
}

