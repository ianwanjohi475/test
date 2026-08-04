import type { Metadata } from "next";
import {
  Send,
  Star,
  MessageSquareWarning,
  Upload,
  Activity,
  Inbox,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StarMeter } from "@/components/star-meter";
import { Gauge } from "@/components/gauge";
import { WeekBars } from "@/components/week-bars";
import { EmptyState } from "@/components/empty-state";
import { Panel, PanelHeader, PanelBody } from "@/components/panel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const month = new Date().toLocaleString("en-US", { month: "long" });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Plan, send, and grow your reviews — all in one calm place."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/requests">
                <Send /> Send request
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/customers">
                <Upload /> Import customers
              </a>
            </Button>
          </div>
        }
      />

      {/* Headline metrics — honest zero-state for a new account. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Requests sent"
          value="0"
          hint="Across all channels"
          href="/requests"
          featured
        />
        <StatCard
          label="Reviews collected"
          value="0"
          hint="Public review clicks"
          href="/requests"
        />
        <StatCard
          label="Average rating"
          value="—"
          hint="From your customers"
          href="/requests"
        />
        <StatCard
          label="Feedback to address"
          value="0"
          hint="Private, low-rating notes"
          href="/requests"
        />
      </div>

      {/* Weekly activity + quick send */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Requests this week"
            description="How many review asks went out each day."
          />
          <PanelBody>
            <WeekBars />
            <p className="mt-4 text-center text-sm text-muted">
              No requests yet this week — bars fill in as you send.
            </p>
          </PanelBody>
        </Panel>

        <Panel className="flex flex-col lg:col-span-1">
          <PanelBody className="flex flex-1 flex-col">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-soft">
              <Sparkles className="h-5 w-5 text-ink" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold tracking-tight text-ink">
              Send a review request
            </h2>
            <p className="mt-1 text-sm text-muted">
              Enter a customer&rsquo;s name and email — Vouch sends a branded
              ask and routes the reply to Google or to you.
            </p>
            <div className="mt-auto flex flex-col gap-2 pt-5">
              <Button variant="gold" asChild>
                <a href="/requests">
                  <Send /> Send request
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/customers">
                  <Upload /> Import a CSV
                </a>
              </Button>
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* Rating · positive rate · this month */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel>
          <PanelHeader
            title="Your rating"
            description="The number local customers see first."
          />
          <PanelBody>
            <StarMeter value={null} count={0} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Positive review rate"
            description="Share of 4–5★ responses."
          />
          <PanelBody className="pt-2">
            <Gauge value={null} caption="No ratings yet" />
          </PanelBody>
        </Panel>

        {/* Dark highlight card — echoes the reference's premium dark tile. */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-card bg-evergreen-deep p-6 text-paper shadow-panel rings">
          <div className="flex items-center justify-between">
            <p className="text-sm text-paper/80">This month</p>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10">
              <Star className="h-[18px] w-[18px] text-gold" aria-hidden />
            </span>
          </div>
          <div className="mt-10">
            <p className="tabular font-display text-[2.75rem] font-semibold leading-none">
              0
            </p>
            <p className="mt-2 text-sm text-paper/70">
              Reviews collected in {month}
            </p>
          </div>
        </div>
      </div>

      {/* Recent activity + feedback */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Recent activity"
            description="Requests sent, pages opened, and stars collected."
            action={
              <Button variant="ghost" size="sm" asChild>
                <a href="/requests">View all</a>
              </Button>
            }
          />
          <PanelBody>
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="Send your first review request and every step — sent, opened, rated — shows up here in real time."
              action={
                <Button asChild>
                  <a href="/requests">
                    <Send /> Send your first request
                  </a>
                </Button>
              }
            />
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-1">
          <PanelHeader
            title="Feedback to address"
            description="Private notes from low ratings."
          />
          <PanelBody>
            <EmptyState
              icon={Inbox}
              title="Nothing to address"
              description="When a customer leaves 1–3★, their private feedback lands here so you can make it right."
            />
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
