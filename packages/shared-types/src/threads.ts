/** Thread shape returned by the Mastra Memory API. */
export interface MastraThread {
  id: string;
  resourceId: string;
  title?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Paginated thread list response from Mastra Memory API. */
export interface MastraThreadListResponse {
  threads: MastraThread[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}
