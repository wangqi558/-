# Admin and Report Management API Documentation

## Report Submission Endpoints

### Report a Rating
**POST** `/api/ratings/:id/report`

Submit a report for a specific rating.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "This rating contains inappropriate language and violates community guidelines."
}
```

**Response:**
```json
{
  "message": "Rating reported successfully",
  "report": {
    "id": 1,
    "reporter_id": 123,
    "target_type": "rating",
    "target_id": 456,
    "reason": "This rating contains inappropriate language and violates community guidelines.",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Report an Object
**POST** `/api/objects/:id/report`

Submit a report for a rating object.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "This object contains misleading information about the product."
}
```

**Response:**
```json
{
  "message": "Object reported successfully",
  "report": {
    "id": 2,
    "reporter_id": 123,
    "target_type": "object",
    "target_id": 789,
    "reason": "This object contains misleading information about the product.",
    "status": "pending",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

## Admin Endpoints

All admin endpoints require:
- Valid JWT token
- Admin role

**Headers:**
```
Authorization: Bearer <token>
```

### Get Reports
**GET** `/api/admin/reports`

Retrieve reports with optional filters.

**Query Parameters:**
- `status` (optional): `pending`, `resolved`, `dismissed`
- `target_type` (optional): `rating`, `comment`, `object`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "reports": [
    {
      "id": 1,
      "reporter_id": 123,
      "reporter_username": "john_doe",
      "target_type": "rating",
      "target_id": 456,
      "reason": "Inappropriate content",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### Get Report Details
**GET** `/api/admin/reports/:id`

Get detailed information about a specific report including target details.

**Response:**
```json
{
  "report": {
    "id": 1,
    "reporter_id": 123,
    "reporter_username": "john_doe",
    "reporter_email": "john@example.com",
    "target_type": "rating",
    "target_id": 456,
    "reason": "Inappropriate content",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "targetDetails": {
    "id": 456,
    "score": 1,
    "comment": "This product is terrible!",
    "username": "jane_smith",
    "object_name": "Wireless Headphones",
    "created_at": "2024-01-14T15:20:00Z"
  }
}
```

### Get Report Statistics
**GET** `/api/admin/reports/stats`

Get report statistics for the admin dashboard.

**Response:**
```json
{
  "total": 150,
  "pending": 45,
  "resolved": 95,
  "dismissed": 10,
  "byType": {
    "rating": 80,
    "comment": 30,
    "object": 40
  }
}
```

### Resolve Report
**POST** `/api/admin/reports/:id/resolve`

Resolve or dismiss a report.

**Request Body:**
```json
{
  "action": "resolve",  // or "dismiss"
  "reason": "The reported content was reviewed and found to violate community guidelines."
}
```

**Response:**
```json
{
  "message": "Report resolved successfully",
  "report": {
    "id": 1,
    "status": "resolved",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

### Block Object
**POST** `/api/admin/objects/:id/block`

Block a rating object.

**Request Body:**
```json
{
  "reason": "Object contains fraudulent information about the product."
}
```

**Response:**
```json
{
  "message": "Object blocked successfully",
  "object": {
    "id": 789,
    "name": "Fake Product",
    "status": "blocked",
    "updated_at": "2024-01-15T12:30:00Z"
  }
}
```

### Delete Rating
**DELETE** `/api/admin/ratings/:id`

Delete a specific rating.

**Response:**
```json
{
  "message": "Rating deleted successfully"
}
```

### Suspend User
**POST** `/api/admin/users/:id/suspend`

Suspend a user account.

**Request Body:**
```json
{
  "duration": 30,  // Days (default: 30, max: 365)
  "reason": "Repeated violations of community guidelines"
}
```

**Response:**
```json
{
  "message": "User suspended successfully",
  "suspended_until": "2024-02-14T12:30:00Z",
  "affected_objects": 5
}
```

### Get Admin Action History
**GET** `/api/admin/actions`

Retrieve admin action history.

**Query Parameters:**
- `admin_id` (optional): Filter by specific admin
- `action_type` (optional): Filter by action type
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "actions": [
    {
      "id": 1,
      "admin_id": 1,
      "admin_username": "admin_user",
      "action_type": "block_object",
      "target_id": 789,
      "reason": "Object contains fraudulent information",
      "metadata": null,
      "created_at": "2024-01-15T12:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Get Dashboard Statistics
**GET** `/api/admin/dashboard/stats`

Get comprehensive dashboard statistics.

**Response:**
```json
{
  "reports": {
    "total": 150,
    "pending": 45,
    "resolved": 95,
    "dismissed": 10,
    "byType": {
      "rating": 80,
      "comment": 30,
      "object": 40
    }
  },
  "users": {
    "total_users": 1250,
    "admins": 5,
    "new_users_30d": 150
  },
  "objects": {
    "total_objects": 850,
    "active_objects": 800,
    "blocked_objects": 50,
    "new_objects_30d": 120
  },
  "ratings": {
    "total_ratings": 5420,
    "new_ratings_30d": 890,
    "average_score": 4.2
  },
  "suspended_users": 12
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid input data",
  "details": [
    {
      "field": "reason",
      "message": "Reason must be between 10 and 500 characters"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Report not found"
}
```

### 409 Conflict
```json
{
  "error": "You have already reported this item"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process request"
}
```

## Report Resolution Workflow

1. **Report Submission**: Users can submit reports for ratings or objects
2. **Admin Review**: Admins can view all pending reports
3. **Investigation**: Admins can view detailed information about the report and target
4. **Action**: Admins can take actions:
   - Block the reported object
   - Delete the reported rating
   - Suspend the user responsible
   - Dismiss invalid reports
5. **Resolution**: Reports are marked as resolved or dismissed
6. **Logging**: All admin actions are logged for accountability

## Role-Based Access Control

- **Regular Users**: Can submit reports for ratings and objects
- **Admins**: Can view reports, take admin actions, and access dashboard statistics
- **Self-suspension Prevention**: Admins cannot suspend their own accounts
