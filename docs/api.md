# API Reference

This document covers all API routes and server actions in the e-learning platform. Server actions are called directly from React components via Next.js `"use server"` functions. API routes are standard HTTP endpoints.

## Table of Contents

- [API Routes](#api-routes)
  - [Authentication (Auth.js)](#authentication-authjs)
  - [Video Signed URL](#video-signed-url)
- [Server Actions](#server-actions)
  - [Auth Actions](#auth-actions)
  - [User Actions](#user-actions)
  - [Video Actions](#video-actions)
  - [Permission Actions](#permission-actions)
- [Common Types](#common-types)

---

## API Routes

### Authentication (Auth.js)

```
GET|POST /api/auth/[...nextauth]
```

Handles all Auth.js v5 authentication flows including sign-in, sign-out, session retrieval, and CSRF token generation. These routes are managed entirely by the Auth.js framework and should not be called directly. Use the `signIn()` and `signOut()` helpers from `@/lib/auth` instead.

**Authentication:** Not required (login endpoint) / varies by sub-route.

---

### Video Signed URL

```
GET /api/videos/[videoId]/signed-url
```

Returns a short-lived signed URL for streaming a video from Cloudflare R2. The URL expires after 15 minutes. The client-side player calls this endpoint and refreshes the URL before expiry.

**Authentication:** Required. Must have a valid session.

**Authorization:**
- STUDENT -- must have an explicit `VideoPermission` record for the requested video.
- ADMIN -- can access any active video.

**Security checks:**
1. Session must be valid (401 if not).
2. `Origin` or `Referer` header must match `NEXT_PUBLIC_APP_URL` (403 if not).
3. Video must exist and be active (404 if not).
4. Student must have permission (403 if not).

#### Request

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `videoId` | Path | `string` | Yes | The video record ID (cuid) |

No query parameters or request body.

#### Response (200 OK)

```json
{
  "url": "https://<account>.r2.cloudflarestorage.com/elearning-videos/videos/abc123/file.mp4?X-Amz-Signature=...",
  "expiresAt": 1711700000000
}
```

| Field | Type | Description |
|---|---|---|
| `url` | `string` | Presigned R2 GET URL for video playback |
| `expiresAt` | `number` | Unix timestamp in milliseconds when the URL expires |

#### Error Responses

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 403 | `{ "error": "Forbidden" }` | Origin/Referer mismatch |
| 403 | `{ "error": "Access denied" }` | Student lacks permission |
| 404 | `{ "error": "Video not found" }` | Video does not exist or is inactive |

All error responses include `Cache-Control: no-store`.

#### Example

```bash
curl -X GET http://localhost:3000/api/videos/clx1abc123def/signed-url \
  -H "Cookie: authjs.session-token=<session>" \
  -H "Origin: http://localhost:3000"
```

---

## Server Actions

All server actions return an `ActionResult<T>` wrapper:

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Auth Actions

Source: `src/actions/auth.actions.ts`

#### `registerUser`

Create a new student account. This is the only public action that does not require authentication.

| Property | Value |
|---|---|
| **Auth required** | No |
| **Role required** | None |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `data.name` | `string` | Yes | User display name (2-100 chars) |
| `data.email` | `string` | Yes | Valid email address |
| `data.password` | `string` | Yes | Password (8-128 chars) |

**Returns:** `ActionResult<{ id: string }>`

**Errors:**
- `"Invalid input"` -- validation failed
- `"An account with this email already exists."` -- duplicate email

---

#### `checkPolicyAgreement`

Check whether the current user has already accepted the usage policy.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | Any |

**Parameters:** None

**Returns:** `boolean` -- `true` if a `PolicyAgreement` record exists for the user.

---

#### `acceptPolicy`

Record that the current user has accepted the platform usage policy. The IP address is determined server-side from request headers.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | Any (intended for STUDENT) |

**Parameters:** None

**Returns:** `ActionResult<{ id: string }>`

---

### User Actions

Source: `src/actions/user.actions.ts`

All user actions require ADMIN role unless noted otherwise.

#### `getUsers`

Retrieve a paginated list of users with video permission counts.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `filters.page` | `number` | No | `1` | Page number |
| `filters.pageSize` | `number` | No | `20` | Items per page (max 100) |
| `filters.search` | `string` | No | -- | Search by name or email |
| `filters.role` | `"STUDENT" \| "ADMIN"` | No | -- | Filter by role |
| `filters.isActive` | `boolean` | No | -- | Filter by active status |
| `filters.sortBy` | `"name" \| "email" \| "createdAt"` | No | `"createdAt"` | Sort field |
| `filters.sortOrder` | `"asc" \| "desc"` | No | `"desc"` | Sort direction |

**Returns:** `ActionResult<PaginatedResult<SafeUserWithCount>>`

The `SafeUserWithCount` type includes all user fields except `passwordHash`, plus `_count.videoPermissions`.

---

#### `getUserById`

Retrieve a single user with their video permissions.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | User ID (cuid) |

**Returns:** `ActionResult<SafeUserWithPermissions>`

---

#### `createUser`

Create a new user with a specified role. Unlike `registerUser`, this allows creating ADMIN accounts.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `data.name` | `string` | Yes | -- | Display name (2-100 chars) |
| `data.email` | `string` | Yes | -- | Valid email address |
| `data.password` | `string` | Yes | -- | Password (8-128 chars) |
| `data.role` | `"STUDENT" \| "ADMIN"` | No | `"STUDENT"` | User role |

**Returns:** `ActionResult<SafeUser>`

---

#### `updateUser`

Edit a user's name, email, or active status. An admin cannot deactivate their own account.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | User ID (cuid) |
| `data.name` | `string` | No | New display name (2-100 chars) |
| `data.email` | `string` | No | New email address |
| `data.isActive` | `boolean` | No | Active status |

**Returns:** `ActionResult<SafeUser>`

**Errors:**
- `"You cannot deactivate your own account."` -- self-deactivation attempt

---

#### `deleteUser`

Soft-delete a user by setting `isActive` to `false`. The user record is preserved for audit purposes. An admin cannot delete their own account.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | User ID (cuid) |

**Returns:** `ActionResult<undefined>`

---

### Video Actions

Source: `src/actions/video.actions.ts`

#### `getVideos`

Retrieve a paginated list of all videos. Admin view with no permission filtering.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `filters.page` | `number` | No | `1` | Page number |
| `filters.pageSize` | `number` | No | `20` | Items per page (max 100) |
| `filters.search` | `string` | No | -- | Search by title |
| `filters.isActive` | `boolean` | No | -- | Filter by active status |

**Returns:** `ActionResult<PaginatedResult<Video>>`

---

#### `getPermittedVideos`

Retrieve all active videos the current user has permission to watch. The `s3Key` field is stripped from the response to avoid exposing internal storage paths.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | Any (intended for STUDENT) |

**Parameters:** None

**Returns:** `ActionResult<Video[]>`

---

#### `getVideoById`

Retrieve a single video with its permissions. Students must have an explicit permission record. Admins can access any active video.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | Any |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Video ID (cuid) |

**Returns:** `ActionResult<VideoWithPermissions>`

---

#### `createVideo`

Insert a new video metadata record. Call this after uploading the file to R2 using `getUploadPresignedUrl`.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `data.title` | `string` | Yes | Video title (1-255 chars) |
| `data.description` | `string` | No | Description (max 2000 chars) |
| `data.s3Key` | `string` | Yes | R2 object key from the upload step |
| `data.duration` | `number` | Yes | Duration in seconds (max 3600) |
| `data.thumbnailUrl` | `string` | No | URL to a thumbnail image |

**Returns:** `ActionResult<Video>`

---

#### `updateVideo`

Edit a video's title, description, or active status.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Video ID (cuid) |
| `data.title` | `string` | No | New title (1-255 chars) |
| `data.description` | `string` | No | New description (max 2000 chars) |
| `data.isActive` | `boolean` | No | Active status |

**Returns:** `ActionResult<Video>`

---

#### `deleteVideo`

Soft-delete a video by setting `isActive` to `false`. The R2 object and database record are preserved.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Video ID (cuid) |

**Returns:** `ActionResult<undefined>`

---

#### `getUploadPresignedUrl`

Generate a presigned PUT URL for direct upload to Cloudflare R2. The returned `s3Key` should be passed to `createVideo` after the upload completes. Only `video/mp4` and `video/webm` content types are accepted.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `filename` | `string` | Yes | Original filename (sanitised server-side) |
| `contentType` | `string` | Yes | MIME type (`video/mp4` or `video/webm`) |

**Returns:** `ActionResult<{ uploadUrl: string; s3Key: string }>`

| Field | Description |
|---|---|
| `uploadUrl` | Presigned R2 PUT URL (expires in 15 minutes) |
| `s3Key` | The R2 object key to store in the video record |

---

### Permission Actions

Source: `src/actions/permission.actions.ts`

All permission actions require ADMIN role.

#### `grantPermission`

Grant a student access to a single video. Idempotent -- granting an existing permission is a no-op.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Student user ID |
| `videoId` | `string` | Yes | Video ID |

**Returns:** `ActionResult<VideoPermission>`

---

#### `revokePermission`

Revoke a student's access to a single video by deleting the permission record.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Student user ID |
| `videoId` | `string` | Yes | Video ID |

**Returns:** `ActionResult<undefined>`

---

#### `bulkGrantPermissions`

Grant a student access to multiple videos in one operation. Duplicate permissions are silently skipped.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Student user ID |
| `videoIds` | `string[]` | Yes | Array of video IDs |

**Returns:** `ActionResult<{ count: number }>` -- number of new permissions created.

---

#### `bulkRevokePermissions`

Revoke a student's access to multiple videos in one operation.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Student user ID |
| `videoIds` | `string[]` | Yes | Array of video IDs to revoke |

**Returns:** `ActionResult<{ count: number }>` -- number of permissions deleted.

---

#### `getUserPermissions`

Retrieve all video permissions for a specific user, including video details.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | User ID |

**Returns:** `ActionResult<VideoPermissionWithVideo[]>`

---

#### `getAvailableVideos`

Retrieve all active videos that have not yet been granted to a specific user. Used to populate the "grant permission" picker in the admin UI.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | User ID |

**Returns:** `ActionResult<Video[]>`

---

#### `getAllVideosWithPermissionStatus`

Retrieve all active videos with a boolean flag indicating whether the specified user currently has access. Used for the permission toggle list in the admin UI.

| Property | Value |
|---|---|
| **Auth required** | Yes |
| **Role required** | ADMIN |

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | User ID |

**Returns:** `ActionResult<(Video & { hasPermission: boolean })[]>`

---

## Common Types

```typescript
// Wrapper for all server action responses
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Paginated list response
type PaginatedResult<T> = {
  items: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

// User without passwordHash
type SafeUser = Omit<User, "passwordHash">;

// User with permission details
type SafeUserWithPermissions = SafeUser & {
  videoPermissions: (VideoPermission & { video: Video })[];
};

// Video with permission details
type VideoWithPermissions = Video & {
  permissions: (VideoPermission & { user: SafeUser })[];
};
```
