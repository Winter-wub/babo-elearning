import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Mail, Shield, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Suspense } from "react";

import { UserPermissions } from "@/components/admin/user-permissions";
import { UserDetailActions } from "@/components/admin/user-detail-actions";

import { getUserById } from "@/actions/user.actions";
import { getAllVideosWithPermissionStatus } from "@/actions/permission.actions";

// -----------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------

interface PageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const result = await getUserById(userId);
  if (!result.success) return { title: "User Not Found" };
  return { title: `${result.data.name} — Permissions` };
}

// -----------------------------------------------------------------------
// Sub-component: User info card (server)
// -----------------------------------------------------------------------

async function UserInfoCard({ userId }: { userId: string }) {
  const result = await getUserById(userId);
  if (!result.success) notFound();
  const user = result.data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">{user.name}</CardTitle>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </div>
          </div>
          {/* Client-side edit button */}
          <UserDetailActions user={user} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoItem
            icon={<Shield className="h-4 w-4" />}
            label="Role"
            value={
              <Badge variant={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                {user.role === "SUPER_ADMIN" ? "Super Admin" : user.role === "ADMIN" ? "Admin" : "Student"}
              </Badge>
            }
          />
          <InfoItem
            icon={<UserCheck className="h-4 w-4" />}
            label="Status"
            value={
              <Badge
                variant={user.isActive ? "outline" : "destructive"}
                className={
                  user.isActive
                    ? "border-green-500 text-green-600 dark:text-green-400"
                    : undefined
                }
              >
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            }
          />
          <InfoItem
            icon={<Calendar className="h-4 w-4" />}
            label="Registered"
            value={
              <span className="text-sm">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            }
          />
          <InfoItem
            icon={<Calendar className="h-4 w-4" />}
            label="Permissions"
            value={
              <span className="text-sm font-medium">
                {user.videoPermissions.length} video
                {user.videoPermissions.length !== 1 ? "s" : ""}
              </span>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      {value}
    </div>
  );
}

// -----------------------------------------------------------------------
// Sub-component: Permissions panel (server)
// -----------------------------------------------------------------------

async function PermissionsPanel({ userId }: { userId: string }) {
  const result = await getAllVideosWithPermissionStatus(userId);

  if (!result.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return <UserPermissions userId={userId} videos={result.data} />;
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/users">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
      </div>

      {/* User info */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        }
      >
        <UserInfoCard userId={userId} />
      </Suspense>

      {/* Permissions panel */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        }
      >
        <PermissionsPanel userId={userId} />
      </Suspense>
    </div>
  );
}
