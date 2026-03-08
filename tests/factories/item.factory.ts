import { Item } from '../../src/items/entities/item.entity';
import { Category } from '../../src/categories/entities/category.entity';
import { testDataSource } from '../config/test-database';
import { createTestItem } from '../fixtures/item.fixture';

export class ItemFactory {
  private static repository = testDataSource.getRepository(Item);

  static async create(category: Category, overrides?: Partial<Item>): Promise<Item> {
    const item = await createTestItem(category, overrides);
    return this.repository.save(item);
  }

  static async createMany(
    category: Category,
    count: number,
    overrides?: Partial<Item>
  ): Promise<Item[]> {
    const items: Item[] = [];
    
    for (let i = 0; i < count; i++) {
      const item = await createTestItem(category, {
        ...overrides,
        name: overrides?.name || `Test Item ${i + 1}`,
      });
      items.push(item);
    }
    
    return this.repository.save(items);
  }

  static async createWithRatings(
    category: Category,
    ratingCount: number,
    overrides?: Partial<Item>
  ): Promise<Item> {
    const item = await this.create(category, overrides);
    // Implementation would depend on rating factory
    return item;
  }
}
