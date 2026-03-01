export const PAGE_SIZE = 8;

export const paginate = <T,>(items: T[], page: number, size = PAGE_SIZE) => {
  return items.slice(0, Math.max(1, page) * size);
};

export const hasMore = <T,>(items: T[], page: number, size = PAGE_SIZE) => {
  return items.length > Math.max(1, page) * size;
};

