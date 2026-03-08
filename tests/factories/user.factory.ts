import { User } from '../../src/users/entities/user.entity';
import { testDataSource } from '../config/test-database';
import { createTestUser, createAdminUser } from '../fixtures/user.fixture';

export class UserFactory {
  private static repository = testDataSource.getRepository(User);

  static async create(overrides?: Partial<User>): Promise<User> {
    const user = await createTestUser(overrides);
    return this.repository.save(user);
  }

  static async createAdmin(overrides?: Partial<User>): Promise<User> {
    const admin = await createAdminUser(overrides);
    return this.repository.save(admin);
  }

  static async createMany(count: number, overrides?: Partial<User>): Promise<User[]> {
    const users: User[] = [];
    
    for (let i = 0; i < count; i++) {
      const user = await createTestUser({
        ...overrides,
        email: overrides?.email || `user${i}@example.com`,
      });
      users.push(user);
    }
    
    return this.repository.save(users);
  }

  static async createWithRatings(ratingCount: number): Promise<User> {
    const user = await this.create();
    // Implementation would depend on rating factory
    return user;
  }
}
