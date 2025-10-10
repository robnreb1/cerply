/**
 * Pagination utilities
 */

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Parse and validate pagination query params
 */
export function parsePaginationParams(query: any): PaginationParams {
  const limit = Math.min(
    Math.max(1, parseInt(query.limit || DEFAULT_LIMIT, 10)),
    MAX_LIMIT
  );
  
  const offset = Math.max(0, parseInt(query.offset || '0', 10));
  
  return { limit, offset };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      total,
      limit: params.limit,
      offset: params.offset,
      hasMore: params.offset + data.length < total,
    },
  };
}

