import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { RatingService } from '../../../src/ratings/rating.service';
import { Rating } from '../../../src/ratings/entities/rating.entity';
import { User } from '../../../src/users/entities/user.entity';
import { Item } from '../../../src/items/entities/item.entity';
import { CreateRatingDto } from '../../../src/ratings/dto/create-rating.dto';
import { UpdateRatingDto } from '../../../src/ratings/dto/update-rating.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('RatingService', () => {
  let service: RatingService;
  let ratingRepository: Repository<Rating>;
  let userRepository: Repository<User>;
  let itemRepository: Repository<Item>;

  const mockRatingRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    average: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockItemRepository = {
    findOne: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingService,
        {
          provide: getRepositoryToken(Rating),
          useValue: mockRatingRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Item),
          useValue: mockItemRepository,
        },
      ],
    }).compile();

    service = module.get<RatingService>(RatingService);
    ratingRepository = module.get<Repository<Rating>>(getRepositoryToken(Rating));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    itemRepository = module.get<Repository<Item>>(getRepositoryToken(Item));

    mockRatingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new rating', async () => {
      const createRatingDto: CreateRatingDto = {
        itemId: 1,
        score: 5,
        comment: 'Great product!',
      };

      const user = new User();
      user.id = 1;

      const item = new Item();
      item.id = 1;

      const rating = new Rating();
      rating.id = 1;
      rating.user = user;
      rating.item = item;
      rating.score = createRatingDto.score;
      rating.comment = createRatingDto.comment;

      mockItemRepository.findOne.mockResolvedValue(item);
      mockRatingRepository.findOne.mockResolvedValue(null);
      mockRatingRepository.create.mockReturnValue(rating);
      mockRatingRepository.save.mockResolvedValue(rating);

      const result = await service.create(user, createRatingDto);

      expect(result).toEqual(rating);
      expect(mockItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: createRatingDto.itemId },
      });
      expect(mockRatingRepository.findOne).toHaveBeenCalledWith({
        where: { user: { id: user.id }, item: { id: item.id } },
      });
      expect(mockRatingRepository.create).toHaveBeenCalledWith({
        user,
        item,
        score: createRatingDto.score,
        comment: createRatingDto.comment,
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      const createRatingDto: CreateRatingDto = {
        itemId: 999,
        score: 5,
        comment: 'Great product!',
      };

      const user = new User();
      user.id = 1;

      mockItemRepository.findOne.mockResolvedValue(null);

      await expect(service.create(user, createRatingDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user already rated the item', async () => {
      const createRatingDto: CreateRatingDto = {
        itemId: 1,
        score: 5,
        comment: 'Great product!',
      };

      const user = new User();
      user.id = 1;

      const item = new Item();
      item.id = 1;

      const existingRating = new Rating();

      mockItemRepository.findOne.mockResolvedValue(item);
      mockRatingRepository.findOne.mockResolvedValue(existingRating);

      await expect(service.create(user, createRatingDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated ratings', async () => {
      const itemId = 1;
      const page = 1;
      const limit = 10;
      const ratings = [new Rating(), new Rating()];
      const total = 20;

      mockQueryBuilder.getMany.mockResolvedValue(ratings);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([ratings, total]);

      const result = await service.findAll(itemId, page, limit);

      expect(result).toEqual({
        data: ratings,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
      expect(mockRatingRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('rating.itemId = :itemId', { itemId });
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('rating.user', 'user');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith((page - 1) * limit);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(limit);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('rating.createdAt', 'DESC');
    });
  });

  describe('findOne', () => {
    it('should return rating by id', async () => {
      const ratingId = 1;
      const rating = new Rating();
      rating.id = ratingId;

      mockRatingRepository.findOne.mockResolvedValue(rating);

      const result = await service.findOne(ratingId);

      expect(result).toEqual(rating);
      expect(mockRatingRepository.findOne).toHaveBeenCalledWith({
        where: { id: ratingId },
        relations: ['user', 'item'],
      });
    });

    it('should throw NotFoundException when rating not found', async () => {
      const ratingId = 999;

      mockRatingRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(ratingId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update rating', async () => {
      const ratingId = 1;
      const userId = 1;
      const updateRatingDto: UpdateRatingDto = {
        score: 4,
        comment: 'Updated comment',
      };

      const rating = new Rating();
      rating.id = ratingId;
      rating.user = { id: userId } as User;
      rating.score = 3;
      rating.comment = 'Original comment';

      const updatedRating = { ...rating, ...updateRatingDto };

      mockRatingRepository.findOne.mockResolvedValue(rating);
      mockRatingRepository.save.mockResolvedValue(updatedRating);

      const result = await service.update(ratingId, userId, updateRatingDto);

      expect(result).toEqual(updatedRating);
      expect(mockRatingRepository.findOne).toHaveBeenCalledWith({
        where: { id: ratingId },
        relations: ['user'],
      });
      expect(mockRatingRepository.save).toHaveBeenCalledWith(updatedRating);
    });

    it('should throw NotFoundException when rating not found', async () => {
      const ratingId = 999;
      const userId = 1;
      const updateRatingDto: UpdateRatingDto = {
        score: 4,
      };

      mockRatingRepository.findOne.mockResolvedValue(null);

      await expect(service.update(ratingId, userId, updateRatingDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when user is not the rating owner', async () => {
      const ratingId = 1;
      const userId = 1;
      const differentUserId = 2;
      const updateRatingDto: UpdateRatingDto = {
        score: 4,
      };

      const rating = new Rating();
      rating.id = ratingId;
      rating.user = { id: differentUserId } as User;

      mockRatingRepository.findOne.mockResolvedValue(rating);

      await expect(service.update(ratingId, userId, updateRatingDto))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('remove', () => {
    it('should delete rating', async () => {
      const ratingId = 1;
      const userId = 1;

      const rating = new Rating();
      rating.id = ratingId;
      rating.user = { id: userId } as User;

      mockRatingRepository.findOne.mockResolvedValue(rating);
      mockRatingRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove(ratingId, userId);

      expect(result).toBe(true);
      expect(mockRatingRepository.findOne).toHaveBeenCalledWith({
        where: { id: ratingId },
        relations: ['user'],
      });
      expect(mockRatingRepository.delete).toHaveBeenCalledWith(ratingId);
    });
  });

  describe('getItemRatingStats', () => {
    it('should return rating statistics for an item', async () => {
      const itemId = 1;
      const stats = {
        averageRating: 4.5,
        totalRatings: 100,
        ratingDistribution: {
          5: 50,
          4: 30,
          3: 15,
          2: 4,
          1: 1,
        },
      };

      mockQueryBuilder.getRawOne.mockResolvedValue({ avg: 4.5 });
      mockRatingRepository.count.mockResolvedValue(100);

      const mockCountQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
      };
      mockRatingRepository.createQueryBuilder.mockReturnValueOnce(mockCountQueryBuilder);
      mockCountQueryBuilder.getCount.mockResolvedValue(50);

      const result = await service.getItemRatingStats(itemId);

      expect(result).toBeDefined();
      expect(mockQueryBuilder.getRawOne).toHaveBeenCalled();
      expect(mockRatingRepository.count).toHaveBeenCalledWith({
        where: { item: { id: itemId } },
      });
    });
  });

  describe('getUserRatingForItem', () => {
    it('should return user rating for specific item', async () => {
      const userId = 1;
      const itemId = 1;
      const rating = new Rating();

      mockRatingRepository.findOne.mockResolvedValue(rating);

      const result = await service.getUserRatingForItem(userId, itemId);

      expect(result).toEqual(rating);
      expect(mockRatingRepository.findOne).toHaveBeenCalledWith({
        where: { user: { id: userId }, item: { id: itemId } },
        relations: ['user', 'item'],
      });
    });

    it('should return null when no rating found', async () => {
      const userId = 1;
      const itemId = 1;

      mockRatingRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserRatingForItem(userId, itemId);

      expect(result).toBeNull();
    });
  });
});
