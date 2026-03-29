# data-testid Requirements

This document lists every `data-testid` attribute that the E2E tests rely on,
which component owns it, and why an accessible selector alone is insufficient.

---

## `data-testid="users-table"`

| Field       | Value |
|-------------|-------|
| Component   | `src/components/admin/users-table.tsx` |
| Element     | The outer `<div className="space-y-4">` wrapper |
| Used in     | `e2e/admin-users.spec.ts` — `waitForSelector` and `getByTestId` |
| Reason      | The table is rendered inside a `<Suspense>` boundary. We need a reliable anchor to wait for the async data to resolve before interacting with the table. There is no unique heading or role that scopes to _just_ the table container. |

---

## `data-testid="videos-table"`

| Field       | Value |
|-------------|-------|
| Component   | `src/components/admin/videos-table.tsx` |
| Element     | The outer `<div className="space-y-4">` wrapper |
| Used in     | `e2e/admin-videos.spec.ts` — `waitForSelector` and `getByTestId` |
| Reason      | Same as `users-table` — needed to detect Suspense resolution reliably. |

---

## `data-testid="video-edit-form"`

| Field       | Value |
|-------------|-------|
| Component   | `src/app/(admin)/admin/videos/[videoId]/page.tsx` (or a `VideoEditForm` component inside it) |
| Element     | The `<form>` element or its wrapping `<Card>` |
| Used in     | `e2e/admin-videos.spec.ts` — `video detail page renders title and edit form` |
| Reason      | The video detail page may not have a unique heading that scopes to the edit form. A testid makes the assertion unambiguous and resilient to layout changes. |

---

## Summary of additions needed

| File | Addition |
|------|----------|
| `src/components/admin/users-table.tsx` | `data-testid="users-table"` on outer `<div>` |
| `src/components/admin/videos-table.tsx` | `data-testid="videos-table"` on outer `<div>` |
| `src/app/(admin)/admin/videos/[videoId]/page.tsx` | `data-testid="video-edit-form"` on the edit form/card |

---

## Selectors NOT using data-testid (using accessible roles/labels instead)

The following interactions are covered by accessible selectors and do NOT need
extra testids:

| Interaction | Selector used |
|-------------|--------------|
| Login form fields | `page.getByLabel("Email")`, `page.getByLabel("Password")` |
| Login submit | `page.getByRole("button", { name: "Sign in" })` |
| Register form fields | `page.getByLabel("Full name")` etc. |
| Error banners | `page.getByRole("alert")` |
| Admin sidebar nav | `page.getByRole("navigation", { name: "Admin navigation" })` |
| Student sidebar nav | `page.getByRole("navigation", { name: "Student navigation" })` |
| Row actions button | `page.getByRole("button", { name: "Row actions" })` |
| Policy modal | `page.getByRole("dialog")` |
| Policy checkbox | `page.getByLabel("I have read and agree to the Terms of Use")` |
| Permission switches | `page.getByRole("switch", { name: /grant|revoke access to .../i })` |
| Dashboard video list | `page.getByRole("list", { name: "Video library" })` |
| Video cards | `page.getByRole("link", { name: /watch .../i })` |
| Search input | `page.getByRole("searchbox", { name: "Search videos" })` |
| User menu | `page.getByRole("button", { name: "User menu" })` |
