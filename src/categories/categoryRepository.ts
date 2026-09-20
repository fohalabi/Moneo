export type Category = { id: string; name: string }

/** Exposes only the category reads currently needed by transaction entry and the UI. */
export interface CategoryRepository {
  list(userId: string): Promise<Category[]>
  findById(userId: string, id: string): Promise<Category | null>
}
