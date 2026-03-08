import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../../config/test-database';
import { UserFactory } from '../../factories/user.factory';
import { CategoryFactory } from '../../factories/category.factory';
import { ItemFactory } from '../../factories/item.factory';
import { RatingFactory } from '../../factories/rating.factory';

describe('RatingController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUser: any;
  let testItem: any;

  beforeAll(async () => {
    await initializeTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    
    // Create test user and get auth token
    testUser = await UserFactory.create({
      email: 'test@example.com',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;

    // Create test category and item
    const category = await CategoryFactory.create({
      name: 'Test Category',
    });

    testItem = await ItemFactory.create(category, {
      name: 'Test Item',
    });
  });

  describe('/ratings (POST)', () => {
    it('should create a new rating', async () => {
      const createRatingDto = {
        itemId: testItem.id,
        score: 5,
        comment: 'Excellent product!',
      };

      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createRatingDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.score).toBe(createRatingDto.score);
      expect(response.body.comment).toBe(createRatingDto.comment);
      expect(response.body.item.id).toBe(testItem.id);
    });

    it('should not create rating without authentication', async () => {
      const createRatingDto = {
        itemId: testItem.id,
        score: 5,
        comment: 'Excellent product!',
      };

      await request(app.getHttpServer())
        .post('/ratings')
        .send(createRatingDto)
        .expect(401);
    });

    it('should not create rating with invalid score', async () => {
      const createRatingDto = {
        itemId: testItem.id,
        score: 6, // Invalid score > 5
        comment: 'Excellent product!',
      };

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createRatingDto)
        .expect(400);
    });

    it('should not create duplicate rating for same item', async () => {
      const createRatingDto = {
        itemId: testItem.id,
        score: 5,
        comment: 'Excellent product!',
      };

      // Create first rating
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createRatingDto)
        .expect(201);

      // Try to create second rating for same item
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createRatingDto)
        .expect(400);
    });
  });

  describe('/ratings (GET)', () => {
    it('should get all ratings for an item', async () => {
      // Create multiple ratings
      await RatingFactory.createMany(testUser, testItem, 5);

      const response = await request(app.getHttpServer())
        .get(`/ratings?itemId=${testItem.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(5);
      expect(response.body).toHaveProperty('total', 5);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
    });

    it('should paginate ratings', async () => {
      // Create 15 ratings
      await RatingFactory.createMany(testUser, testItem, 15);

      const response = await request(app.getHttpServer())
        .get(`/ratings?itemId=${testItem.id}&page=2&limit=5`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(5);
      expect(response.body).toHaveProperty('total', 15);
      expect(response.body).toHaveProperty('page', 2);
      expect(response.body).toHaveProperty('limit', 5);
      expect(response.body).toHaveProperty('totalPages', 3);
    });

    it('should require itemId parameter', async () => {
      await request(app.getHttpServer())
        .get('/ratings')
        .expect(400);
    });
  });

  describe('/ratings/:id (GET)', () => {
    it('should get rating by id', async () => {
      const rating = await RatingFactory.create(testUser, testItem, {
        score: 4,
        comment: 'Good product',
      });

      const response = await request(app.getHttpServer())
        .get(`/ratings/${rating.id}`)
        .expect(200);

      expect(response.body.id).toBe(rating.id);
      expect(response.body.score).toBe(4);
      expect(response.body.comment).toBe('Good product');
    });

    it('should return 404 for non-existent rating', async () => {
      await request(app.getHttpServer())
        .get('/ratings/999')
        .expect(404);
    });
  });

  describe('/ratings/:id (PUT)', () => {
    it('should update own rating', async () => {
      const rating = await RatingFactory.create(testUser, testItem, {
        score: 3,
        comment: 'Average product',
      });

      const updateRatingDto = {
        score: 4,
        comment: 'Better than expected',
      };

      const response = await request(app.getHttpServer())
        .put(`/ratings/${rating.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateRatingDto)
        .expect(200);

      expect(response.body.score).toBe(4);
      expect(response.body.comment).toBe('Better than expected');
    });

    it('should not update rating without authentication', async () => {
      const rating = await RatingFactory.create(testUser, testItem);

      const updateRatingDto = {
        score: 4,
        comment: 'Updated',
      };

      await request(app.getHttpServer())
        .put(`/ratings/${rating.id}`)
        .send(updateRatingDto)
        .expect(401);
    });

    it('should not update someone else rating', async () => {
      const otherUser = await UserFactory.create({
        email: 'other@example.com',
      });

      const rating = await RatingFactory.create(otherUser, testItem, {
        score: 3,
        comment: 'Average',
      });

      const updateRatingDto = {
        score: 5,
        comment: 'Excellent',
      };

      await request(app.getHttpServer())
        .put(`/ratings/${rating.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateRatingDto)
        .expect(403);
    });
  });

  describe('/ratings/:id (DELETE)', () => {
    it('should delete own rating', async () => {
      const rating = await RatingFactory.create(testUser, testItem);

      await request(app.getHttpServer())
        .delete(`/ratings/${rating.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify rating is deleted
      await request(app.getHttpServer())
        .get(`/ratings/${rating.id}`)
        .expect(404);
    });

    it('should not delete rating without authentication', async () => {
      const rating = await RatingFactory.create(testUser, testItem);

      await request(app.getHttpServer())
        .delete(`/ratings/${rating.id}`)
        .expect(401);
    });

    it('should not delete someone else rating', async () => {
      const otherUser = await UserFactory.create({
        email: 'other@example.com',
      });

      const rating = await RatingFactory.create(otherUser, testItem);

      await request(app.getHttpServer())
        .delete(`/ratings/${rating.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('/ratings/stats/:itemId (GET)', () => {
    it('should get rating statistics for an item', async () => {
      // Create ratings with different scores
      await RatingFactory.createMany(testUser, testItem, 10, { score: 5 });
      await RatingFactory.createMany(testUser, testItem, 5, { score: 4 });
      await RatingFactory.createMany(testUser, testItem, 3, { score: 3 });
      await RatingFactory.createMany(testUser, testItem, 1, { score: 2 });
      await RatingFactory.createMany(testUser, testItem, 1, { score: 1 });

      const response = await request(app.getHttpServer())
        .get(`/ratings/stats/${testItem.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('totalRatings', 20);
      expect(response.body).toHaveProperty('ratingDistribution');
      expect(response.body.ratingDistribution['5']).toBe(10);
      expect(response.body.ratingDistribution['4']).toBe(5);
      expect(response.body.ratingDistribution['3']).toBe(3);
      expect(response.body.ratingDistribution['2']).toBe(1);
      expect(response.body.ratingDistribution['1']).toBe(1);
    });

    it('should return 404 for non-existent item', async () => {
      await request(app.getHttpServer())
        .get('/ratings/stats/999')
        .expect(404);
    });
  });

  describe('/ratings/user/:itemId (GET)', () => {
    it('should get current user rating for item', async () => {
      const rating = await RatingFactory.create(testUser, testItem, {
        score: 4,
        comment: 'My rating',
      });

      const response = await request(app.getHttpServer())
        .get(`/ratings/user/${testItem.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(rating.id);
      expect(response.body.score).toBe(4);
      expect(response.body.comment).toBe('My rating');
    });

    it('should return null when user has not rated item', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/user/${testItem.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/ratings/user/${testItem.id}`)
        .expect(401);
    });
  });
});
