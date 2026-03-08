import { User } from '../../src/users/entities/user.entity';
import { UserRole } from '../../src/users/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

export const createTestUser = async (overrides?: Partial<User>): Promise<User> => {
  const user = new User();
  user.email = overrides?.email || 'test@example.com';
  user.password = await bcrypt.hash(overrides?.password || 'password123', 10);
  user.firstName = overrides?.firstName || 'Test';
  user.lastName = overrides?.lastName || 'User';
  user.role = overrides?.role || UserRole.USER;
  user.isActive = overrides?.isActive ?? true;
  user.emailVerified = overrides?.emailVerified ?? true;
  user.createdAt = overrides?.createdAt || new Date();
  user.updatedAt = overrides?.updatedAt || new Date();
  
  return user;
};

export const createAdminUser = async (overrides?: Partial<User>): Promise<User> => {
  return createTestUser({
    ...overrides,
    role: UserRole.ADMIN,
    email: overrides?.email || 'admin@example.com',
  });
};

export const createInactiveUser = async (overrides?: Partial<User>): Promise<User> => {
  return createTestUser({
    ...overrides,
    isActive: false,
    email: overrides?.email || 'inactive@example.com',
  });
};

export const createUnverifiedUser = async (overrides?: Partial<User>): Promise<User> => {
  return createTestUser({
    ...overrides,
    emailVerified: false,
    email: overrides?.email || 'unverified@example.com',
  });
};
