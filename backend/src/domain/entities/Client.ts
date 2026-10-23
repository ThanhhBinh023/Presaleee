export interface Client {
  id: string;
  organizationId: string;
  companyName: string;
  industry: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export const CLIENT_INDUSTRIES = [
  'Retail',
  'Fintech',
  'Healthcare',
  'Logistics',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Government',
  'Telecom',
  'Other'
] as const;

export type ClientIndustry = typeof CLIENT_INDUSTRIES[number];
