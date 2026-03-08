import { Category } from '../../src/categories/entities/category.entity';

export const createTestCategory = async (overrides?: Partial<Category>): Promise<Category> => {
  const category = new Category();
  category.name = overrides?.name || 'Test Category';
  category.description = overrides?.description || 'Test category description';
  category.isActive = overrides?.isActive ?? true;
  category.createdAt = overrides?.createdAt || new Date();
  category.updatedAt = overrides?.updatedAt || new Date();
  
  return category;
};

export const createSubCategory = async (
  parent: Category,
  overrides?: Partial<Category>
): Promise<Category> => {
  const category = new Category();
  category.name = overrides?.name || 'Sub Category';
  category.description = overrides?.description || 'Sub category description';
  category.parent = parent;
  category.isActive = overrides?.isActive ?? true;
  category.createdAt = overrides?.createdAt || new Date();
  category.updatedAt = overrides?.updatedAt || new Date();
  
  return category;
};
