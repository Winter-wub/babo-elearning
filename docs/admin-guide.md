# Administrator Guide

This guide is written for platform administrators who manage users, videos, and permissions through the admin dashboard. No technical knowledge is required.

## Table of Contents

- [Logging In](#logging-in)
- [Understanding the Dashboard](#understanding-the-dashboard)
- [Managing Users](#managing-users)
- [Uploading Videos](#uploading-videos)
- [Managing Videos](#managing-videos)
- [Managing Video Permissions](#managing-video-permissions)

---

## Logging In

1. Open the platform in your browser (the URL will be provided by your technical team).
2. You will see the login page. Enter your admin email and password.
3. After successful login, you will be redirected to the admin dashboard.

If you have been given the default admin account, the credentials are:

| Field | Value |
|---|---|
| Email | `admin@elearning.com` |
| Password | `Admin123!` |

**Important:** Change the default password after your first login if your deployment supports password changes.

If you enter incorrect credentials, an error message will appear. If your account has been deactivated, you will not be able to log in -- contact another administrator.

---

## Understanding the Dashboard

The admin dashboard is your home screen after logging in. From the sidebar navigation you can access:

- **Dashboard** -- overview of platform activity
- **Users** -- manage student and admin accounts
- **Videos** -- manage video content and uploads

The sidebar is always available on the left side of the screen.

---

## Managing Users

### Viewing the User List

1. Click **Users** in the sidebar.
2. You will see a table of all users with their name, email, role, active status, and number of video permissions.
3. Use the **search bar** to find users by name or email.
4. Use the **filters** to narrow by role (Student/Admin) or active status.
5. The list is paginated -- use the page controls at the bottom to navigate.

### Adding a New User

1. On the Users page, click the **Add User** button.
2. Fill in the required fields:
   - **Name** -- the user's display name (2-100 characters)
   - **Email** -- a valid email address (must be unique)
   - **Password** -- at least 8 characters
   - **Role** -- choose Student or Admin
3. Click **Create** to save.

The new user can now log in with the email and password you provided.

### Editing a User

1. In the user list, click on the user's name or the edit button to open their profile.
2. You can change:
   - **Name**
   - **Email**
3. Click **Save** to apply changes.

### Deactivating a User

Deactivating a user prevents them from logging in without permanently deleting their data.

1. Open the user's profile.
2. Toggle the **Active** switch to off, or click the **Deactivate** button.
3. Confirm the action.

The user will no longer be able to sign in. Their video permissions and history are preserved.

**Note:** You cannot deactivate your own account. Another administrator must do this.

### Deleting a User

Deleting a user performs a soft-delete (sets the account to inactive). The user record remains in the database for audit purposes.

1. In the user list, click the delete button for the user.
2. Confirm the deletion.

**Note:** You cannot delete your own account.

---

## Uploading Videos

### File Requirements

Before uploading, make sure your video file meets these requirements:

| Requirement | Limit |
|---|---|
| **File format** | MP4 or WebM |
| **Maximum file size** | 2 GB |
| **Maximum duration** | 60 minutes (3600 seconds) |

### Upload Steps

1. Click **Videos** in the sidebar, then click **Upload Video**.
2. Fill in the video details:
   - **Title** (required) -- a descriptive name, up to 255 characters
   - **Description** (optional) -- additional context, up to 2000 characters
   - **Duration** (required) -- the video length in seconds
3. Select the video file from your computer.
4. Click **Upload**. The file uploads directly to cloud storage. A progress indicator shows the upload status.
5. When the upload completes, the video metadata is saved and the video appears in the video list.

**Tips:**
- Do not close the browser tab during upload. Large files may take several minutes depending on your internet speed.
- If the upload fails, check your internet connection and try again. The platform generates a fresh upload link for each attempt.

---

## Managing Videos

### Viewing the Video List

1. Click **Videos** in the sidebar.
2. You will see a table of all videos with their title, duration, active status, and creation date.
3. Use the **search bar** to find videos by title.
4. Use the **filter** to show only active or inactive videos.

### Editing a Video

1. Click on a video's title or the edit button.
2. You can change:
   - **Title**
   - **Description**
3. Click **Save** to apply changes.

**Note:** The video file itself cannot be replaced. To update a video file, upload a new video and deactivate the old one.

### Deactivating a Video

Deactivating a video hides it from students without deleting the file from storage.

1. Open the video's edit page.
2. Toggle the **Active** switch to off.
3. Save the change.

Students who previously had access will no longer see or be able to play the video.

### Deleting a Video

Deleting a video performs a soft-delete (sets it to inactive). The file remains in cloud storage and the database record is preserved.

1. In the video list, click the delete button.
2. Confirm the deletion.

---

## Managing Video Permissions

Permissions control which students can watch which videos. Each permission is a link between one user and one video, granted by an administrator.

### Viewing a User's Permissions

1. Go to **Users** and click on a user's name.
2. The user profile page shows a list of all videos they have access to, along with when permission was granted.

### Granting Permission to a Single Video

1. Open a user's profile page.
2. You will see a list of all available videos with toggle switches.
3. Toggle the switch **on** for any video you want the user to access.
4. The permission takes effect immediately.

### Granting Permission to Multiple Videos

1. Open a user's profile page.
2. Select multiple videos using the checkboxes.
3. Click **Grant Selected** to give the user access to all selected videos at once.

### Revoking Permission

1. Open a user's profile page.
2. Toggle the switch **off** for the video you want to remove access to.
3. The student will no longer be able to play that video.

Alternatively, select multiple videos and click **Revoke Selected** for bulk removal.

### Permission Behaviour

- Granting a permission that already exists has no effect (it is safe to grant twice).
- Revoking a permission immediately prevents the student from obtaining new signed URLs. Any existing signed URL will still work until it expires (up to 15 minutes).
- Deactivating a video effectively revokes access for all students, regardless of their permission records.
