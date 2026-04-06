"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Users, Video, Shield, PlayCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalyticsData } from "@/actions/analytics.actions";

// -----------------------------------------------------------------------
// Colors
// -----------------------------------------------------------------------
const INDIGO = "#6366f1";
const EMERALD = "#10b981";
const AMBER = "#f59e0b";
const PIE_COLORS = [INDIGO, EMERALD, AMBER, "#ef4444", "#8b5cf6"];

// -----------------------------------------------------------------------
// Stat Card
// -----------------------------------------------------------------------
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

function StatCard({ title, value, icon: Icon, colorClass }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/** Convert a {YYYY-MM: count} map to a sorted array for recharts */
function monthMapToArray(map: Record<string, number>) {
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month: formatMonth(month),
      count,
    }));
}

function renderPieLabel(props: PieLabelRenderProps) {
  const name = props.name as string;
  const percent = (props.percent as number) ?? 0;
  return `${name} ${(percent * 100).toFixed(0)}%`;
}

function formatMonth(yyyymm: string) {
  const [year, month] = yyyymm.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
}

// -----------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------

interface AnalyticsChartsProps {
  data: AnalyticsData;
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const { summary, topVideos, usersByMonth, permissionsByMonth, roleDistribution } =
    data;

  const usersOverTime = monthMapToArray(usersByMonth);
  const permissionsOverTime = monthMapToArray(permissionsByMonth);

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ผู้ใช้ทั้งหมด"
          value={summary.totalUsers.toLocaleString()}
          icon={Users}
          colorClass="text-indigo-500"
        />
        <StatCard
          title="วิดีโอทั้งหมด"
          value={summary.totalVideos.toLocaleString()}
          icon={Video}
          colorClass="text-emerald-500"
        />
        <StatCard
          title="วิดีโอที่ใช้งาน"
          value={summary.activeVideos.toLocaleString()}
          icon={PlayCircle}
          colorClass="text-amber-500"
        />
        <StatCard
          title="สิทธิ์ทั้งหมด"
          value={summary.totalPermissions.toLocaleString()}
          icon={Shield}
          colorClass="text-indigo-500"
        />
      </div>

      {/* Charts row 1: Bar + Pie */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top 10 videos by play count */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">10 วิดีโอยอดนิยมตามจำนวนการเล่น</CardTitle>
          </CardHeader>
          <CardContent>
            {topVideos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                ยังไม่มีข้อมูลวิดีโอ
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={topVideos}
                  margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                    }}
                  />
                  <Bar dataKey="playCount" fill={INDIGO} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Role distribution pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">การกระจายบทบาท</CardTitle>
          </CardHeader>
          <CardContent>
            {roleDistribution.every((r) => r.value === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                ยังไม่มีข้อมูลผู้ใช้
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={renderPieLabel}
                  >
                    {roleDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Two line charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User registrations over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              การลงทะเบียนผู้ใช้ (6 เดือนล่าสุด)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersOverTime.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                ยังไม่มีข้อมูลการลงทะเบียน
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={usersOverTime}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={EMERALD}
                    strokeWidth={2}
                    dot={{ fill: EMERALD, r: 4 }}
                    name="ผู้ใช้ใหม่"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Permissions granted over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              การให้สิทธิ์ (6 เดือนล่าสุด)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {permissionsOverTime.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                ยังไม่มีข้อมูลสิทธิ์
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={permissionsOverTime}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={AMBER}
                    strokeWidth={2}
                    dot={{ fill: AMBER, r: 4 }}
                    name="สิทธิ์"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
