import { Rating } from '../../src/ratings/entities/rating.entity';
import { User } from '../../src/users/entities/user.entity';
import { Item } from '../../src/items/entities/item.entity';

export const createTestRating = async (
  user: User,
  item: Item,
  overrides?: Partial<Rating>
): Promise<Rating> => {
  const rating = new Rating();
  rating.user = user;
  rating.item = item;
  rating.score = overrides?.score || 5;
  rating.comment = overrides?.comment || 'Great product!';
  rating.isVerified = overrides?.isVerified ?? true;
  rating.createdAt = overrides?.createdAt || new Date();
  rating.updatedAt = overrides?.updatedAt || new Date();
  
  return rating;
};

export const createMultipleRatings = async (
  user: User,
  item: Item,
  count: number,
  baseScore: number = 5
): Promise<Rating[]> => {
  const ratings: Rating[] = [];
  
  for (let i = 0; i < count; i++) {
    const rating = await createTestRating(user, item, {
      score: baseScore + (Math.random() - 0.5),
      comment: `Rating ${i + 1}`,
    });
    ratings.push(rating);
  }
  
  return ratings;
};
