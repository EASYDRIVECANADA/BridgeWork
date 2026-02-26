# Jiffy On Demand API Documentation

Base URL: `http://localhost:5000/api` (Development)  
Production: `https://your-api-domain.com/api`

All endpoints require authentication except where noted as "Public".

## Authentication

### Sign Up
```http
POST /auth/signup
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "user",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zip_code": "94102"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {},
    "profile": {},
    "session": {}
  }
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`

### Get Current User
```http
GET /auth/me
Authorization: Bearer {token}
```

**Response:** `200 OK`

## Services

### List All Services (Public)
```http
GET /services?category={categoryId}&search={query}&limit=50&offset=0
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "services": [],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 100
    }
  }
}
```

### Search Services (Public)
```http
GET /services/search?q={query}
```

**Response:** `200 OK`

### Get Service Categories (Public)
```http
GET /services/categories
```

**Response:** `200 OK`

### Get Service by ID (Public)
```http
GET /services/{id}
```

**Response:** `200 OK`

## Bookings

### Create Booking
```http
POST /bookings
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "service_id": "uuid",
  "scheduled_date": "2024-02-10",
  "scheduled_time": "10:00",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zip_code": "94102",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "special_instructions": "Ring doorbell twice",
  "promo_code": "SAVE20"
}
```

**Response:** `201 Created`

### Get User Bookings
```http
GET /bookings?status={status}&limit=20&offset=0
Authorization: Bearer {token}
```

**Response:** `200 OK`

### Get Booking by ID
```http
GET /bookings/{id}
Authorization: Bearer {token}
```

**Response:** `200 OK`

### Update Booking Status
```http
PATCH /bookings/{id}/status
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "completed",
  "cancellation_reason": "Optional reason"
}
```

**Response:** `200 OK`

### Cancel Booking
```http
POST /bookings/{id}/cancel
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "reason": "Changed my mind"
}
```

**Response:** `200 OK`

## Pros

### Get Nearby Pros (Public)
```http
GET /pros/nearby?lat=37.7749&lon=-122.4194&radius=25&service_category={uuid}
```

**Response:** `200 OK`

### Get Pro by ID (Public)
```http
GET /pros/{id}
```

**Response:** `200 OK`

### Apply to Become Pro
```http
POST /pros/apply
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "business_name": "John's Handyman Services",
  "business_license": "BL-12345",
  "insurance_info": "Policy #98765",
  "certifications": ["EPA Lead-Safe", "OSHA 10"],
  "experience_years": 5,
  "service_areas": ["San Francisco", "Oakland"],
  "service_categories": ["uuid1", "uuid2"]
}
```

**Response:** `201 Created`

### Get Pro Jobs
```http
GET /pros/jobs/list?status={status}&limit=20&offset=0
Authorization: Bearer {token}
Role: pro
```

**Response:** `200 OK`

### Accept Job
```http
POST /pros/jobs/{id}/accept
Authorization: Bearer {token}
Role: pro
```

**Response:** `200 OK`

### Decline Job
```http
POST /pros/jobs/{id}/decline
Authorization: Bearer {token}
Role: pro
```

**Request Body:**
```json
{
  "reason": "Schedule conflict"
}
```

**Response:** `200 OK`

## Reviews

### Create Review
```http
POST /reviews
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "booking_id": "uuid",
  "rating": 5,
  "comment": "Excellent service!",
  "images": ["url1", "url2"]
}
```

**Response:** `201 Created`

### Get Reviews by Pro ID (Public)
```http
GET /reviews/pro/{proId}?limit=20&offset=0
```

**Response:** `200 OK`

### Respond to Review
```http
POST /reviews/{id}/respond
Authorization: Bearer {token}
Role: pro
```

**Request Body:**
```json
{
  "response": "Thank you for the kind words!"
}
```

**Response:** `200 OK`

## Payments

### Create Payment Intent
```http
POST /payments/create-intent
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "booking_id": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "client_secret": "pi_xxx_secret_xxx",
    "payment_intent_id": "pi_xxx"
  }
}
```

### Stripe Webhook
```http
POST /payments/webhook
```

This endpoint receives Stripe webhook events. Configure in your Stripe Dashboard.

### Get Transaction History
```http
GET /payments/transactions?limit=20&offset=0
Authorization: Bearer {token}
```

**Response:** `200 OK`

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication token required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Header**: `X-RateLimit-Remaining`
- **Reset**: `X-RateLimit-Reset`

## Pagination

All list endpoints support pagination:
- `limit`: Number of items per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

Response includes:
```json
{
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150
  }
}
```

## Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer {your_jwt_token}
```

Tokens expire after 24 hours. Use the refresh endpoint to get a new token.
