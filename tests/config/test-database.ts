import { DataSource } from 'typeorm';
import { User } from '../../src/users/entities/user.entity';
import { Rating } from '../../src/ratings/entities/rating.entity';
import { Category } from '../../src/categories/entities/category.entity';
import { Item } from '../../src/items/entities/item.entity';
import { AuditLog } from '../../src/audit/entities/audit-log.entity';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433'),
  username: process.env.TEST_DB_USERNAME || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password',
  database: process.env.TEST_DB_NAME || 'rating_platform_test',
  entities: [User, Rating, Category, Item, AuditLog],
  synchronize: true,
  dropSchema: true,
  logging: false,
});

export const initializeTestDatabase = async () => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }
  return testDataSource;
};

export const closeTestDatabase = async () => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};

export const clearTestDatabase = async () => {
  const entities = testDataSource.entityMetadatas;
  
  for (const entity of entities) {
    const repository = testDataSource.getRepository(entity.name);
    await repository.clear();
  }
};
