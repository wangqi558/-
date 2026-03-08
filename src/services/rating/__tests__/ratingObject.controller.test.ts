import { Request, Response, NextFunction } from 'express';
import { RatingObjectController } from '../RatingObjectController';
import { RatingObjectService } from '../RatingObjectService';
import { AppError } from '../../../errors/AppError';

// Mock the RatingObjectService
jest.mock('../RatingObjectService');

describe('RatingObjectController', () => {
  let controller: RatingObjectController;
  let mockRatingObjectService: jest.Mocked<RatingObjectService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Create mock service
    mockRatingObjectService = {
      createRatingObject: jest.fn(),
      getRatingObjectWithStats: jest.fn(),
      listRatingObjects: jest.fn(),
      updateRatingObject: jest.fn(),
      deleteRatingObject: jest.fn(),
      searchRatingObjects: jest.fn(),
    } as any;

    // Create controller with mock service
    controller = new RatingObjectController({} as any);
    (controller as any).ratingObjectService = mockRatingObjectService;

    // Create mock request and response
    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: {
        id: '1',
        role: 'user',
      },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRatingObject', () => {
    it('should create a rating object successfully', async () => {
      const mockInput = {
        title: 'Test Object',
        description: 'Test Description',
        category: 'Test Category',
        tags: ['tag1', 'tag2'],
        visibility: 'public' as const,
        allowAnonymousRatings: true,
        allowComments: true,
      };

      const mockResult = {
        id: '1',
        ...mockInput,
        creatorId: '1',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = mockInput;
      mockRatingObjectService.createRatingObject.mockResolvedValue(mockResult);

      await controller.createRatingObject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRatingObjectService.createRatingObject).toHaveBeenCalledWith({
        ...mockInput,
        creatorId: '1',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should handle service errors', async () => {
      const error = new AppError('Database error', 500);
      mockRatingObjectService.createRatingObject.mockRejectedValue(error);

      await controller.createRatingObject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getRatingObjectDetails', () => {
    it('should get rating object details with stats', async () => {
      const mockId = '1';
      const mockResult = {
        id: mockId,
        title: 'Test Object',
        description: 'Test Description',
        category: 'Test Category',
        tags: ['tag1'],
        creatorId: '1',
        status: 'active' as const,
        visibility: 'public' as const,
        allowAnonymousRatings: true,
        allowComments: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        statistics: {
          averageRating: 4.5,
          totalRatings: 10,
          ratingDistribution: { 1: 0, 2: 0, 3: 2, 4: 3, 5: 5 },
        },
      };

      mockRequest.params = { id: mockId };
      mockRatingObjectService.getRatingObjectWithStats.mockResolvedValue(mockResult);

      await controller.getRatingObjectDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRatingObjectService.getRatingObjectWithStats).toHaveBeenCalledWith(mockId, true);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return 404 if rating object not found', async () => {
      const mockId = '999';
      mockRequest.params = { id: mockId };
      mockRatingObjectService.getRatingObjectWithStats.mockResolvedValue(null);

      await controller.getRatingObjectDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Rating object not found',
          statusCode: 404,
        })
      );
    });

    it('should handle missing ID', async () => {
      mockRequest.params = {};

      await controller.getRatingObjectDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Rating object ID is required',
          statusCode: 400,
        })
      );
    });
  });

  describe('listRatingObjects', () => {
    it('should list rating objects with default pagination', async () => {
      const mockResult = {
        data: [
          {
            id: '1',
            title: 'Object 1',
            statistics: {
              averageRating: 4.0,
              totalRatings: 5,
              ratingDistribution: {},
            },
          },
          {
            id: '2',
            title: 'Object 2',
            statistics: {
              averageRating: 3.5,
              totalRatings: 8,
              ratingDistribution: {},
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      mockRatingObjectService.listRatingObjects.mockResolvedValue(mockResult);

      await controller.listRatingObjects(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRatingObjectService.listRatingObjects).toHaveBeenCalledWith({
        filter: {},
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.data,
        pagination: mockResult.pagination,
      });
    });

    it('should handle custom pagination and filters', async () => {
      mockRequest.query = {
        page: '2',
        limit: '50',
        category: 'Electronics',
        tags: 'tag1,tag2',
        minRating: '4',
        sortBy: 'averageRating',
        sortOrder: 'asc',
      };

      await controller.listRatingObjects(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRatingObjectService.listRatingObjects).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 50,
          filter: expect.objectContaining({
            category: 'Electronics',
            tags: ['tag1', 'tag2'],
            minRating: 4,
          }),
          sortBy: 'averageRating',
          sortOrder: 'asc',
        })
      );
    });
  });

  describe('updateRatingObject', () => {
    it('should update rating object successfully', async () => {
      const mockId = '1';
      const mockUpdate = { title: 'Updated Title' };
      const mockResult = {
        id: mockId,
        title: 'Updated Title',
        description: 'Description',
        category: 'Category',
        tags: [],
        creatorId: '1',
        status: 'active' as const,
        visibility: 'public' as const,
        allowAnonymousRatings: true,
        allowComments: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: mockId };
      mockRequest.body = mockUpdate;
      mockRatingObjectService.updateRatingObject.mockResolvedValue(mockResult);

      await controller.updateRatingObject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRatingObjectService.updateRatingObject).toHaveBeenCalledWith(
        mockId,
        mockUpdate,
        '1',
        false
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should allow admin to update any object', async () => {
      mockRequest.user!.role = 'admin';
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'inactive' };

      await controller.updateRatingObject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRatingObjectService.updateRatingObject).toHaveBeenCalledWith(
        '1',
        { status: 'inactive' },
        '1',
        true
      );
    });
  });

  describe('deleteRatingObject', () => {
    it('should delete rating object successfully', async () => {
      const mockId = '1';
      mockRequest.params = { id: mockId };

      await controller.deleteRatingObject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRatingObjectService.deleteRatingObject).toHaveBeenCalledWith(
        mockId,
        '1',
        false
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Rating object deleted successfully',
      });
    });
  });

  describe('searchRatingObjects', () => {
    it('should search rating objects successfully', async () => {
      const mockQuery = 'test';
      const mockResult = {
        data: [
          {
            id: '1',
            title: 'Test Object',
            statistics: {
              averageRating: 4.5,
              totalRatings: 10,
              ratingDistribution: {},
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockRequest.query = { q: mockQuery };
      mockRatingObjectService.searchRatingObjects.mockResolvedValue(mockResult);

      await controller.searchRatingObjects(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRatingObjectService.searchRatingObjects).toHaveBeenCalledWith(
        mockQuery,
        1,
        20
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.data,
        pagination: mockResult.pagination,
      });
    });

    it('should validate search query length', async () => {
      mockRequest.query = { q: 'a' };

      await controller.searchRatingObjects(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Search query must be at least 2 characters long',
          statusCode: 400,
        })
      );
    });
  });
});
