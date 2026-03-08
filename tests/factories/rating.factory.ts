import { Rating } from '../../src/ratings/entities/rating.entity';
import { User } from '../../src/users/entities/user.entity';
import { Item } from '../../src/items/entities/item.entity';
import { testDataSource } from '../config/test-database';
import { createTestRating } from '../fixtures/rating.fixture';

export class RatingFactory {
  private static repository = testDataSource.getRepository(Rating);

  static async create(user: User, item: Item, overrides?: Partial<Rating>): Promise<Rating> {
    const rating = await createTestRating(user, item, overrides);
    return this.repository.save(rating);
  }

  static async createMany(
    user: User,
    item: Item,
    count: number,
    overrides?: Partial<Rating>
  ): Promise<Rating[]> {
    const ratings: Rating[] = [];
    
    for (let i = 0; i < count; i++) {
      const rating = await createTestRating(user, item, {
        ...overrides,
        comment: overrides?.comment || `Test rating ${i + 1}`,
      });
      ratings.push(rating);
    }
    
    return this.repository.save(ratings);
  }

  static async createWithScoreDistribution(
    user: User,
    item: Item,
    distribution: { [key: number]: number }
  ): Promise<Rating[]> {
    const ratings: Rating[] = [];
    
    for (const [score, count] of Object.entries(distribution)) {
      for (let i = 0; i < count; i++) {
        const rating = await createTestRating(user, item, {
          score: parseInt(score),
          comment: `Rating with score ${score}`,
        });
        ratings.push(rating);
      }
    }
    
    return this.repository.save(ratings);
  }
}
