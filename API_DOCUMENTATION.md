# SafeGuard Senior - Backend API Documentation

## Overview

The SafeGuard Senior backend is built with Express.js and SQLite, providing a secure API for detection analysis, family contact management, and user statistics.

**Base URL**: `http://localhost:3000/api`

**Authentication**: All endpoints (except `/health`) require the `x-user-id` header.

---

## Authentication

### Headers

```
x-user-id: user_1234567890_abc123
```

The `x-user-id` is a unique identifier for each user. It's generated client-side and persisted in localStorage.

### Rate Limiting

- Detection endpoints: 30 requests per minute
- Link check: 60 requests per minute
- Other endpoints: Standard rate limits apply

---

## Endpoints

### Health Check

#### `GET /api/health`

Check if the API is running.

**Response:**
```json
{
  "success": true,
  "message": "SafeGuard Senior API is running",
  "timestamp": "2026-04-09T10:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Detection Endpoints

### Upload Video/Image for Analysis

#### `POST /api/detect/video`

Analyze a video or image file for deepfake detection.

**Headers:**
```
x-user-id: user_1234567890_abc123
Content-Type: multipart/form-data
```

**Body:**
- `file` (required): Video or image file (max 100MB)
  - Supported formats: MP4, AVI, MOV, WEBM, JPG, PNG, WEBP

**Response:**
```json
{
  "success": true,
  "detection": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_1234567890_abc123",
    "type": "video",
    "fileName": "video.mp4",
    "riskLevel": "high",
    "confidence": 87,
    "details": "Vùng mắt chớp không tự nhiên...",
    "createdAt": "2026-04-09T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: No file provided or unsupported format
- `413`: File too large (> 100MB)
- `429`: Rate limit exceeded

---

### Upload Audio for Analysis

#### `POST /api/detect/audio`

Analyze an audio file for voice cloning detection.

**Headers:**
```
x-user-id: user_1234567890_abc123
Content-Type: multipart/form-data
```

**Body:**
- `file` (required): Audio file (max 100MB)
  - Supported formats: MP3, WAV, OGG, M4A

**Response:**
```json
{
  "success": true,
  "detection": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_1234567890_abc123",
    "type": "audio",
    "fileName": "audio.mp3",
    "riskLevel": "medium",
    "confidence": 72,
    "details": "Phát hiện một số dấu hiệu bất thường...",
    "createdAt": "2026-04-09T10:00:00.000Z"
  }
}
```

---

### Check URL for Phishing/Scam

#### `POST /api/detect/link`

Analyze a URL for phishing, scam, or malicious content.

**Headers:**
```
x-user-id: user_1234567890_abc123
Content-Type: application/json
```

**Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "detection": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_1234567890_abc123",
    "type": "link",
    "url": "https://example.com",
    "riskLevel": "low",
    "confidence": 92,
    "details": "Đường dẫn an toàn. Không phát hiện mối đe dọa.",
    "createdAt": "2026-04-09T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Invalid URL format
- `429`: Rate limit exceeded (60 requests/min)

---

### Get Detection History

#### `GET /api/detect/history?limit=20&offset=0`

Retrieve detection history for the current user.

**Headers:**
```
x-user-id: user_1234567890_abc123
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "detections": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user_1234567890_abc123",
      "type": "video",
      "fileName": "video.mp4",
      "riskLevel": "high",
      "confidence": 87,
      "details": "...",
      "createdAt": "2026-04-09T10:00:00.000Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### Get Single Detection

#### `GET /api/detect/:id`

Retrieve details of a specific detection.

**Headers:**
```
x-user-id: user_1234567890_abc123
```

**Response:**
```json
{
  "success": true,
  "detection": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_1234567890_abc123",
    "type": "video",
    "fileName": "video.mp4",
    "riskLevel": "high",
    "confidence": 87,
    "details": "...",
    "createdAt": "2026-04-09T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `404`: Detection not found

---

### Delete Detection

#### `DELETE /api/detect/:id`

Delete a detection record (owner only).

**Headers:**
```
x-user-id: user_1234567890_abc123
```

**Response:**
```json
{
  "success": true,
  "message": "Đã xóa kết quả phân tích"
}
```

**Error Responses:**
- `404`: Detection not found or no permission

---

## Family Contact Endpoints

### Get All Contacts

#### `GET /api/contacts`

Retrieve all family contacts for the current user.

**Headers:**
```
x-user-id: user_1234567890_abc123
```

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user_1234567890_abc123",
      "name": "Con gái",
      "phone": "0901234567",
      "platform": "Zalo",
      "autoNotify": 1,
      "createdAt": "2026-04-09T10:00:00.000Z"
    }
  ]
}
```

---

### Add Family Contact

#### `POST /api/contacts`

Add a new family contact.

**Headers:**
```
x-user-id: user_1234567890_abc123
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Con gái",
  "phone": "0901234567",
  "platform": "Zalo",
  "autoNotify": true
}
```

**Response:**
```json
{
  "success": true,
  "contact": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_1234567890_abc123",
    "name": "Con gái",
    "phone": "0901234567",
    "platform": "Zalo",
    "autoNotify": 1,
    "createdAt": "2026-04-09T10:00:00.000Z"
  },
  "message": "Thêm người thân thành công"
}
```

**Error Responses:**
- `400`: Invalid phone number or missing fields
- `409`: Phone number already exists
- `400`: Maximum 10 contacts per user

---

### Update Family Contact

#### `PUT /api/contacts/:id`

Update a family contact.

**Headers:**
```
x-user-id: user_1234567890_abc123
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Con gái (cập nhật)",
  "autoNotify": false
}
```

**Response:**
```json
{
  "success": true,
  "contact": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_1234567890_abc123",
    "name": "Con gái (cập nhật)",
    "phone": "0901234567",
    "platform": "Zalo",
    "autoNotify": 0,
    "createdAt": "2026-04-09T10:00:00.000Z"
  },
  "message": "Cập nhật thành công"
}
```

---

### Delete Family Contact

#### `DELETE /api/contacts/:id`

Delete a family contact.

**Headers:**
```
x-user-id: user_1234567890_abc123
```

**Response:**
```json
{
  "success": true,
  "message": "Xóa liên hệ thành công"
}
```

**Error Responses:**
- `404`: Contact not found or no permission

---

## Statistics Endpoints

### Get Full Statistics

#### `GET /api/stats`

Retrieve comprehensive statistics for the current user.

**Headers:**
```
x-user-id: user_1234567890_abc123
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "detections": {
      "total": 42,
      "byRisk": {
        "high": 5,
        "medium": 12,
        "low": 25
      },
      "byType": {
        "video": 15,
        "audio": 8,
        "link": 19
      },
      "recentActivity": [
        {
          "date": "2026-04-09",
          "count": 3
        },
        {
          "date": "2026-04-08",
          "count": 2
        }
      ]
    },
    "familyContacts": {
      "total": 3,
      "withAutoNotify": 2
    }
  }
}
```

---

### Get Quick Summary

#### `GET /api/stats/summary`

Retrieve a quick summary for the home page.

**Headers:**
```
x-user-id: user_1234567890_abc123
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalScans": 42,
    "highRiskCount": 5,
    "lastScanDate": "2026-04-09"
  }
}
```

---

## Notification Endpoints

### Send Notification About Detection

#### `POST /api/notifications/send`

Send notification to family contacts about a detection.

**Headers:**
```
x-user-id: user_1234567890_abc123
Content-Type: application/json
```

**Body:**
```json
{
  "detectionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "success": true,
  "sent": 2,
  "total": 3,
  "message": "Đã gửi thông báo cho 2/3 người thân"
}
```

**Error Responses:**
- `400`: Missing detectionId
- `404`: Detection not found

---

### Send Test Notification

#### `POST /api/notifications/test`

Send a test notification to a specific contact.

**Headers:**
```
x-user-id: user_1234567890_abc123
Content-Type: application/json
```

**Body:**
```json
{
  "contactId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã gửi tin nhắn thử nghiệm"
}
```

**Error Responses:**
- `400`: Missing contactId
- `404`: Contact not found

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description in Vietnamese"
}
```

### Common HTTP Status Codes

- `200`: Success
- `400`: Bad request (invalid input)
- `404`: Not found
- `409`: Conflict (e.g., duplicate phone)
- `413`: Payload too large
- `429`: Too many requests (rate limited)
- `500`: Server error

---

## Rate Limiting

Rate limits are applied per user per endpoint:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/detect/video` | 30 | 1 minute |
| `/detect/audio` | 30 | 1 minute |
| `/detect/link` | 60 | 1 minute |
| `/contacts` | Standard | 1 minute |
| `/stats` | Standard | 1 minute |

When rate limited, the API returns:
```json
{
  "success": false,
  "message": "Quá nhiều yêu cầu. Vui lòng thử lại sau."
}
```

---

## Data Models

### Detection

```typescript
{
  id: string;              // UUID
  userId: string;          // User identifier
  type: 'video' | 'audio' | 'link';
  fileName?: string;       // For video/audio
  url?: string;            // For link
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;      // 0-100
  details: string;         // Analysis details in Vietnamese
  createdAt: string;       // ISO 8601 timestamp
}
```

### FamilyContact

```typescript
{
  id: string;              // UUID
  userId: string;          // User identifier
  name: string;            // Contact name
  phone: string;           // Phone number (Vietnamese format)
  platform: string;        // 'Zalo', 'Telegram', etc.
  autoNotify: number;      // 0 or 1 (boolean)
  createdAt: string;       // ISO 8601 timestamp
}
```

---

## Integration Notes

### Auto-Notifications

When a detection with `riskLevel` of "high" or "medium" is created, the system automatically sends notifications to all family contacts with `autoNotify` enabled.

### File Upload

- Maximum file size: 100MB
- Supported video formats: MP4, AVI, MOV, WEBM
- Supported audio formats: MP3, WAV, OGG, M4A
- Supported image formats: JPG, PNG, WEBP

### Phone Number Validation

Vietnamese phone numbers must match:
- `^(0|\+84)[0-9]{9,10}$`
- Examples: `0901234567`, `+84901234567`

---

## Future Enhancements

- [ ] Real AI/ML model integration for deepfake detection
- [ ] Zalo API integration for notifications
- [ ] Telegram Bot API integration
- [ ] User authentication (OAuth2)
- [ ] Dashboard analytics
- [ ] Export detection history
- [ ] Batch analysis
- [ ] Webhook support

---

**Last Updated**: 2026-04-09
