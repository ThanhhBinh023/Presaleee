export interface IngestDocumentInputDTO {
  title: string;
  category: string;
  domain: string;
  content: string;
  organizationId?: string;
}

export interface IngestDocumentOutputDTO {
  docId: string;
  totalChunks: number;
}
