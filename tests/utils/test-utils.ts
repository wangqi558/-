import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../config/test-database';
import * as request from 'supertest';

export class TestUtils {
  private static app: INestApplication;

  static async createTestApp(): Promise<INestApplication> {
    await initializeTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.app.useGlobalPipes(new ValidationPipe());
    await this.app.init();

    return this.app;
  }

  static async closeTestApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
      await closeTestDatabase();
    }
  }

  static async clearDatabase(): Promise<void> {
    await clearTestDatabase();
  }

  static getApp(): INestApplication {
    return this.app;
  }

  static async authenticateUser(email: string, password: string): Promise<string> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.access_token;
  }

  static async createAuthenticatedUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ user: any; token: string }> {
    // Register user
    const registerResponse = await request(this.app.getHttpServer())
      .post('/auth/register')
      .send({
        ...userData,
        firstName: userData.firstName || 'Test',
        lastName: userData.lastName || 'User',
      })
      .expect(201);

    return {
      user: registerResponse.body.user,
      token: registerResponse.body.access_token,
    };
  }

  static async createTestRating(token: string, itemId: number, score: number, comment?: string): Promise<any> {
    const response = await request(this.app.getHttpServer())
      .post('/ratings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        itemId,
        score,
        comment: comment || 'Test rating',
      })
      .expect(201);

    return response.body;
  }

  static async createTestItem(token: string, categoryId: number, name: string): Promise<any> {
    const response = await request(this.app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        description: 'Test item',
        categoryId,
        price: 99.99,
      })
      .expect(201);

    return response.body;
  }

  static async createTestCategory(token: string, name: string): Promise<any> {
    const response = await request(this.app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        description: 'Test category',
      })
      .expect(201);

    return response.body;
  }

  static generateMockData(type: 'email' | 'password' | 'name' | 'comment', length?: number): string {
    switch (type) {
      case 'email':
        return `test${Math.random().toString(36).substring(7)}@example.com`;
      case 'password':
        return `Test${Math.random().toString(36).substring(7)}!123`;
      case 'name':
        return `Test${Math.random().toString(36).substring(7)}`;
      case 'comment':
        return `This is a test comment ${Math.random().toString(36).substring(7)}`;
      default:
        return Math.random().toString(36).substring(7);
    }
  }

  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async measurePerformance(
    fn: () => Promise<any>,
    iterations: number = 1
  ): Promise<{ average: number; min: number; max: number; total: number }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await fn();
      const end = Date.now();
      times.push(end - start);
    }

    const total = times.reduce((sum, time) => sum + time, 0);
    const average = total / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { average, min, max, total };
  }

  static createMockFile(sizeInBytes: number, filename: string = 'test.txt'): Buffer {
    return Buffer.alloc(sizeInBytes, 'a');
  }

  static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$\u0026');
  }
}

// Helper function to create a complete test scenario
export async function createCompleteTestScenario(): Promise<{
  app: INestApplication;
  user: any;
  token: string;
  category: any;
  item: any;
  rating: any;
}> {
  const app = await TestUtils.createTestApp();
  
  // Create authenticated user
  const { user, token } = await TestUtils.createAuthenticatedUser({
    email: TestUtils.generateMockData('email'),
    password: TestUtils.generateMockData('password'),
  });

  // Create category
  const category = await TestUtils.createTestCategory(
    token,
    TestUtils.generateMockData('name')
  );

  // Create item
  const item = await TestUtils.createTestItem(
    token,
    category.id,
    TestUtils.generateMockData('name')
  );

  // Create rating
  const rating = await TestUtils.createTestRating(
    token,
    item.id,
    Math.floor(Math.random() * 5) + 1,
    TestUtils.generateMockData('comment')
  );

  return { app, user, token, category, item, rating };
}
