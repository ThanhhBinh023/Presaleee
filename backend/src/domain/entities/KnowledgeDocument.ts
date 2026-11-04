export interface KnowledgeDocument {
  id: string;
  organizationId?: string | null;
  uploadedBy?: string | null;
  title: string;
  category: string;
  domain: string;
  content?: string;
  fileUrl?: string | null;
  fileType?: string | null;
  totalTokens?: number;
  metadata?: Record<string, any>;
  totalChunks?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

