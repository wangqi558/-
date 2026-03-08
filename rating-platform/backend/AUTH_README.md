# Authentication System Documentation

## Overview

The authentication system provides comprehensive user management functionality including registration, login, profile management, password reset, reputation system, and user suspension capabilities.

## Features

### 1. User Registration
- Email and username validation with uniqueness checks
- Strong password requirements (min 8 chars, uppercase, lowercase, number, special char)
- Password confirmation matching
- JWT token generation upon successful registration

### 2. User Login
- Email/password authentication
- JWT token generation with 7-day expiration
- Account suspension check
- Returns user profile data

### 3. User Profile Management
- Update username, bio (max 500 chars), and avatar URL
- Username uniqueness validation
- Profile data retrieval with suspension status

### 4. Password Management
- Change password with current password verification
- Password reset via email
- Secure token-based reset with 1-hour expiration

### 5. Reputation System
- Reputation tracking for all users
- Admin can increase/decrease reputation with reason
- Reputation history tracking
- Used for trustworthiness and privileges

### 6. User Suspension/Ban System
- Admin-only functionality
- Temporary (1d, 3d, 7d, 30d) or permanent suspension
- Suspension reason tracking
- Automatic email notification
- Suspension status check on login

## API Endpoints

### Public Endpoints

#### Register User
```
POST /api/auth/register
{
  "email": "user@example.com",
  "username": "username",
  "password": "StrongPass123!",
  "confirmPassword": "StrongPass123!"
}
```

#### Login
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

#### Forgot Password
```
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}
```

#### Reset Password
```
POST /api/auth/reset-password
{
  "token": "reset-token-from-email",
  "newPassword": "NewStrongPass123!",
  "confirmPassword": "NewStrongPass123!"
}
```

### Authenticated Endpoints

#### Get Profile
```
GET /api/auth/me
Authorization: Bearer {token}
```

#### Update Profile
```
PUT /api/auth/profile
Authorization: Bearer {token}
{
  "username": "newusername",
  "bio": "User bio (max 500 chars)",
  "avatar": "https://example.com/avatar.jpg"
}
```

#### Change Password
```
PUT /api/auth/change-password
Authorization: Bearer {token}
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!",
  "confirmPassword": "NewPass123!"
}
```

### Admin Endpoints

#### Suspend User
```
POST /api/auth/admin/suspend-user
Authorization: Bearer {admin-token}
{
  "userId": 123,
  "reason": "Violation of terms",
  "duration": "7d"  // Options: 1d, 3d, 7d, 30d, permanent
}
```

#### Update User Reputation
```
PUT /api/auth/admin/reputation
Authorization: Bearer {admin-token}
{
  "userId": 123,
  "action": "increase",  // or "decrease"
  "amount": 10,
  "reason": "Excellent contributions"
}
```

#### Get Reputation History
```
GET /api/auth/admin/reputation-history/:userId?limit=50&offset=0
Authorization: Bearer {admin-token}
```

## Validation Rules

### Email
- Valid email format
- Unique in database

### Username
- 3-20 characters
- Alphanumeric and underscore only
- Unique in database

### Password
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

### Bio
- Maximum 500 characters

## Security Features

1. **Password Hashing**: bcrypt with 10 rounds
2. **JWT Tokens**: 7-day expiration, signed with strong secret
3. **Rate Limiting**: Applied to all endpoints
4. **Input Validation**: Joi schema validation on all inputs
5. **Suspension Check**: Performed on login and authenticated requests
6. **Email Notifications**: Sent for password resets and suspensions

## Database Schema

### Users Table
- id, email, username, password_hash
- reputation, role, status
- bio, avatar, created_at, updated_at

### Password Reset Tokens Table
- id, user_id, token, expires_at, used

### User Suspensions Table
- id, user_id, reason, duration, expires_at
- suspended_at, suspended_by

### Reputation Logs Table
- id, user_id, action, amount, reason
- admin_id, created_at

## Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Min 32 characters
- `REDIS_URL`: Redis connection string

Optional:
- `EMAIL_HOST`: SMTP host for email notifications
- `EMAIL_PORT`: SMTP port (default: 587)
- `EMAIL_USER`: SMTP username
- `EMAIL_PASSWORD`: SMTP password
- `EMAIL_FROM`: Sender email address
- `FRONTEND_URL`: Frontend URL for password reset links

## Error Handling

The system returns consistent error responses:

```json
{
  "error": "Error message",
  "field": "fieldName",  // For validation errors
  "details": [...]       // For validation failures
}
```

Common HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized
- 403: Forbidden (suspended/no admin access)
- 409: Conflict (duplicate email/username)
- 500: Server Error

## Testing

Run authentication tests:
```bash
npm test -- tests/auth.test.ts
```

Tests cover:
- Registration validation
- Login functionality
- Profile management
- Password changes
- Suspension logic
- Admin operations
- Error handling
