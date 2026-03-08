import { Item } from '../../src/items/entities/item.entity';
import { Category } from '../../src/categories/entities/category.entity';

export const createTestItem = async (
  category: Category,
  overrides?: Partial<Item>
): Promise<Item> => {
  const item = new Item();
  item.name = overrides?.name || 'Test Item';
  item.description = overrides?.description || 'Test description';
  item.category = category;
  item.price = overrides?.price || 99.99;
  item.imageUrl = overrides?.imageUrl || 'https://example.com/image.jpg';
  item.isActive = overrides?.isActive ?? true;
  item.createdAt = overrides?.createdAt || new Date();
  item.updatedAt = overrides?.updatedAt || new Date();
  
  return item;
};

export const createInactiveItem = async (
  category: Category,
  overrides?: Partial<Item>
): Promise<Item> => {
  return createTestItem(category, {
    ...overrides,
    isActive: false,
    name: overrides?.name || 'Inactive Item',
  });
};
