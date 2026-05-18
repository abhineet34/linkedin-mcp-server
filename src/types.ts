export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

export interface LinkedInProfile {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: { country: string; language: string };
}

export interface LinkedInPost {
  id: string;
  author: string;
  commentary?: string;
  visibility: string;
  lifecycleState: string;
  createdAt?: number;
  lastModifiedAt?: number;
  content?: Record<string, unknown>;
}

export interface LinkedInOrganization {
  id: string;
  localizedName: string;
  vanityName?: string;
  localizedWebsite?: string;
  primaryOrganizationType?: string;
  locations?: unknown[];
}

export interface PaginatedResponse<T> {
  total: number;
  count: number;
  offset: number;
  items: T[];
  has_more: boolean;
  next_offset?: number;
}

export interface AssetUploadResponse {
  asset: string;
  uploadUrl: string;
}
