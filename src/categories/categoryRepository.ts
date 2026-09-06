export type Category = { id: string; name: string }

/** Exposes only the category reads currently needed by transaction entry and the UI. */
export interface CategoryRepository {
  list(): Promise<Category[]>
  findById(id: string): Promise<Category | null>
}
