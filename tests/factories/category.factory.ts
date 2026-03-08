import { Category } from '../../src/categories/entities/category.entity';
import { testDataSource } from '../config/test-database';
import { createTestCategory, createSubCategory } from '../fixtures/category.fixture';

export class CategoryFactory {
  private static repository = testDataSource.getRepository(Category);

  static async create(overrides?: Partial<Category>): Promise<Category> {
    const category = await createTestCategory(overrides);
    return this.repository.save(category);
  }

  static async createSubCategory(parent: Category, overrides?: Partial<Category>): Promise<Category> {
    const subCategory = await createSubCategory(parent, overrides);
    return this.repository.save(subCategory);
  }

  static async createMany(count: number, overrides?: Partial<Category>): Promise<Category[]> {
    const categories: Category[] = [];
    
    for (let i = 0; i < count; i++) {
      const category = await createTestCategory({
        ...overrides,
        name: overrides?.name || `Test Category ${i + 1}`,
      });
      categories.push(category);
    }
    
    return this.repository.save(categories);
  }

  static async createTree(depth: number, breadth: number): Promise<Category> {
    const root = await this.create({ name: 'Root Category' });
    
    if (depth > 0) {
      for (let i = 0; i < breadth; i++) {
        const child = await this.createSubCategory(root, {
          name: `Child Category ${i + 1}`,
        });
        
        if (depth > 1) {
          await this.createSubTree(child, depth - 1, breadth);
        }
      }
    }
    
    return root;
  }

  private static async createSubTree(parent: Category, depth: number, breadth: number): Promise<void> {
    for (let i = 0; i < breadth; i++) {
      const child = await this.createSubCategory(parent, {
        name: `Sub Category ${i + 1}`,
      });
      
      if (depth > 1) {
        await this.createSubTree(child, depth - 1, breadth);
      }
    }
  }
}
