# Rating Platform API Documentation

## Rating Objects API

### Overview
Rating objects are entities that can be rated by users. They support features like categories, tags, visibility settings, and detailed statistics.

### Endpoints

#### Create Rating Object
```
POST /api/rating-objects
```

**Authentication Required**: Yes

**Request Body**:
```json
{
  "title": "Product Name",
  "description": "Product description (optional)",
  "category": "Electronics",
  "tags": ["smartphone", "android", "flagship"],
  "visibility": "public",
  "allowAnonymousRatings": true,
  "allowComments": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "1",
    "title": "Product Name",
    "description": "Product description",
    "category": "Electronics",
    "tags": ["smartphone", "android", "flagship"],
    "creatorId": "123",
    "status": "active",
    "visibility": "public",
    "allowAnonymousRatings": true,
    "allowComments": true,
    "createdAt": "2025-03-07T10:00:00Z",
    "updatedAt": "2025-03-07T10:00:00Z"
  }
}
```

#### Get Rating Object Details
```
GET /api/rating-objects/:id?useCache=true
```

**Authentication Required**: No (for public objects)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "1",
    "title": "Product Name",
    "description": "Product description",
    "category": "Electronics",
    "tags": ["smartphone", "android", "flagship"],
    "creatorId": "123",
    "status": "active",
    "visibility": "public",
    "allowAnonymousRatings": true,
    "allowComments": true,
    "createdAt": "2025-03-07T10:00:00Z",
    "updatedAt": "2025-03-07T10:00:00Z",
    "statistics": {
      "averageRating": 4.5,
      "totalRatings": 150,
      "ratingDistribution": {
        "1": 5,
        "2": 10,
        "3": 20,
        "4": 45,
        "5": 70
      }
    }
  }
}
```

#### List Rating Objects
```
GET /api/rating-objects?page=1&limit=20&category=Electronics&tags=smartphone,android&minRating=4&sortBy=createdAt&sortOrder=desc
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page, max 100 (default: 20)
- `category` (optional): Filter by category
- `tags` (optional): Comma-separated list of tags
- `creatorId` (optional): Filter by creator ID
- `status` (optional): Filter by status (active/inactive/deleted)
- `visibility` (optional): Filter by visibility (public/private)
- `search` (optional): Search in title and description
- `minRating` (optional): Minimum average rating (1-5)
- `maxRating` (optional): Maximum average rating (1-5)
- `startDate` (optional): Created after this date (ISO 8601)
- `endDate` (optional): Created before this date (ISO 8601)
- `sortBy` (optional): createdAt, updatedAt, title, averageRating, totalRatings
- `sortOrder` (optional): asc or desc

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "Product Name",
      "description": "Product description",
      "category": "Electronics",
      "tags": ["smartphone", "android"],
      "creatorId": "123",
      "status": "active",
      "visibility": "public",
      "allowAnonymousRatings": true,
      "allowComments": true,
      "createdAt": "2025-03-07T10:00:00Z",
      "updatedAt": "2025-03-07T10:00:00Z",
      "statistics": {
        "averageRating": 4.5,
        "totalRatings": 150,
        "ratingDistribution": {
          "1": 5,
          "2": 10,
          "3": 20,
          "4": 45,
          "5": 70
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### Update Rating Object
```
PATCH /api/rating-objects/:id
```

**Authentication Required**: Yes (creator or admin)

**Request Body** (all fields optional):
```json
{
  "title": "Updated Product Name",
  "description": "Updated description",
  "category": "Electronics",
  "tags": ["smartphone", "android", "5G"],
  "visibility": "public",
  "allowAnonymousRatings": true,
  "allowComments": true,
  "status": "active"  // Admin only
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "1",
    "title": "Updated Product Name",
    "description": "Updated description",
    "category": "Electronics",
    "tags": ["smartphone", "android", "5G"],
    "creatorId": "123",
    "status": "active",
    "visibility": "public",
    "allowAnonymousRatings": true,
    "allowComments": true,
    "createdAt": "2025-03-07T10:00:00Z",
    "updatedAt": "2025-03-07T11:00:00Z"
  }
}
```

#### Delete Rating Object
```
DELETE /api/rating-objects/:id
```

**Authentication Required**: Yes (creator or admin)

**Response**:
```json
{
  "success": true,
  "message": "Rating object deleted successfully"
}
```

#### Search Rating Objects
```
GET /api/rating-objects/search?q=smartphone&page=1&limit=20
```

**Query Parameters**:
- `q` (required): Search query (min 2 characters)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page, max 100 (default: 20)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "Best Smartphone 2025",
      "description": "Latest flagship smartphone",
      "category": "Electronics",
      "tags": ["smartphone", "flagship"],
      "creatorId": "123",
      "status": "active",
      "visibility": "public",
      "allowAnonymousRatings": true,
      "allowComments": true,
      "createdAt": "2025-03-07T10:00:00Z",
      "updatedAt": "2025-03-07T10:00:00Z",
      "statistics": {
        "averageRating": 4.7,
        "totalRatings": 200,
        "ratingDistribution": {
          "1": 2,
          "2": 5,
          "3": 15,
          "4": 50,
          "5": 128
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Admin Endpoints

#### Update Rating Object Status (Admin Only)
```
PATCH /api/admin/rating-objects/:id/status
```

**Request Body**:
```json
{
  "status": "inactive"
}
```

#### Delete Rating Object (Admin Only)
```
DELETE /api/admin/rating-objects/:id
```

### Caching
- Rating object details are cached for 5 minutes by default
- Use `?useCache=false` to bypass cache
- Cache is automatically cleared on updates

### Validation Rules
- Title: 1-255 characters
- Description: Maximum 2000 characters
- Category: Maximum 100 characters
- Tags: Maximum 20 tags, each tag maximum 50 characters
- Search query: Minimum 2 characters

### Error Responses
All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Resource not found
- `FORBIDDEN`: Insufficient permissions
- `INTERNAL_ERROR`: Server error
