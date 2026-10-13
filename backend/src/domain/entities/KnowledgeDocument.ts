export interface KnowledgeDocument {
  id: string;
  organizationId?: string | null;
  title: string;
  category: string;
  domain: string;
  content?: string;
  rawFileUrl?: string | null;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}
