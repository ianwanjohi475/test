import type { Metadata } from "next";
import {
  Send,
  Star,
  MessageSquareWarning,
  TrendingUp,
  Activity,
  LineChart,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StarMeter } from "@/components/star-meter";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Your reviews at a glance — requests, ratings, and feedback that needs you."
        action={
          <Button asChild>
            <a href="/requests">
              <Send /> Send request
            </a>
          </Button>
        }
      />

      {/* Headline metrics — zero state for a new account, not fake numbers. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Requests sent"
          value="0"
          hint="Across all channels"
          icon={Send}
        />
        <StatCard
          label="Reviews collected"
          value="0"
          hint="Public review clicks"
          icon={Star}
          accent
        />
        <StatCard
          label="Average rating"
          value="—"
          hint="From your customers"
          icon={TrendingUp}
        />
        <StatCard
          label="Feedback to address"
          value="0"
          hint="Private, low-rating notes"
          icon={MessageSquareWarning}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Signature: the star meter — the one place gold appears boldly. */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Your rating</CardTitle>
            <CardDescription>
              The number your local customers see first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StarMeter value={null} count={0} />
          </CardContent>
        </Card>

        {/* Rating trend — the chart itself lands in Phase 4. */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rating trend</CardTitle>
            <CardDescription>
              How your average moves as reviews come in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={LineChart}
              title="No trend yet"
              description="Once ratings start landing, you'll see your trend line here — week over week."
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Requests sent, pages opened, and stars collected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Activity}
            title="No requests yet"
            description="Send your first review request to see results appear here."
            action={
              <Button asChild>
                <a href="/requests">
                  <Send /> Send your first request
                </a>
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
