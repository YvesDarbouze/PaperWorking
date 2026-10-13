'use client';

import React, { useState } from 'react';
import Button, { type ButtonVariant, type ButtonSize } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  RocketLaunch,
  BookmarkSimple,
  Bookmark,
  ArrowsClockwise,
  Funnel,
  Plus,
  Keyboard,
} from '@phosphor-icons/react';

export default function DesignSystemButtonsPage() {
  const [toggleState, setToggleState] = useState(false);
  const [interactiveLoading, setInteractiveLoading] = useState(false);
  const [confirmedDangerAction, setConfirmedDangerAction] = useState(false);

  const variants: ButtonVariant[] = ['primary', 'secondary', 'tertiary', 'danger'];
  const sizes: ButtonSize[] = ['sm', 'md', 'lg'];

  const triggerInteractiveLoading = () => {
    setInteractiveLoading(true);
    setTimeout(() => {
      setInteractiveLoading(false);
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 lg:p-12 font-sans selection:bg-primary/20 selection:text-foreground">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <header className="border-b border-border pb-8 space-y-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-none bg-primary" />
            <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
              PaperWorking Design System
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Canonical Button Component Matrix
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Dark, dense, high-contrast button specifications for Bloomberg-terminal real estate investment workflows.
            Complies with the single-primary rule, Radix-Lyra crisp precision edges, and strict state accessibility contracts.
          </p>
        </header>

        {/* Section 1: Visual Hierarchy x Sizes */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">1. Visual Hierarchy &times; Sizes</h2>
              <p className="text-xs text-muted-foreground">Default resting state across all 4 canonical variants.</p>
            </div>
            <Badge variant="outline" className="rounded-none">
              Rule: Max 1 Primary Per Section
            </Badge>
          </div>

          <div className="rounded-none border border-border bg-card p-6 overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse" data-testid="button-matrix-table">
              <thead>
                <tr className="border-b border-border text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="pb-4 pl-2">Variant</th>
                  <th className="pb-4">SM (32px)</th>
                  <th className="pb-4">MD (40px - Default)</th>
                  <th className="pb-4">LG (48px - Conversion)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {variants.map((v) => (
                  <tr key={v} className="hover:bg-muted/30 transition-colors">
                    <td className="py-5 pl-2 font-mono text-[12px] uppercase font-bold text-foreground">
                      {v}
                    </td>
                    <td className="py-5 pr-4">
                      <Button variant={v} size="sm" data-testid={`btn-${v}-sm`}>
                        {v.charAt(0).toUpperCase() + v.slice(1)} SM
                      </Button>
                    </td>
                    <td className="py-5 pr-4">
                      <Button variant={v} size="md" data-testid={`btn-${v}-md`}>
                        {v.charAt(0).toUpperCase() + v.slice(1)} MD
                      </Button>
                    </td>
                    <td className="py-5 pr-4">
                      <Button variant={v} size="lg" data-testid={`btn-${v}-lg`}>
                        {v.charAt(0).toUpperCase() + v.slice(1)} LG
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Interactive States (Disabled, Loading with Width Lock) */}
        <section className="space-y-6">
          <div>
            <h2 className="text-[16px] font-bold text-foreground">2. Interactive States &amp; Safeguards</h2>
            <p className="text-[13px] text-muted-foreground">
              Validating disabled (50% opacity, pointer-events-none) and loading states (layout width locked).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Disabled State Card */}
            <div className="rounded-none border border-border bg-card p-6 space-y-4">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Disabled State (All Variants)
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" size="md" disabled data-testid="btn-primary-disabled">
                  Primary Disabled
                </Button>
                <Button variant="secondary" size="md" disabled data-testid="btn-secondary-disabled">
                  Secondary Disabled
                </Button>
                <Button variant="tertiary" size="md" disabled data-testid="btn-tertiary-disabled">
                  Tertiary Disabled
                </Button>
                <Button variant="danger" size="md" disabled data-testid="btn-danger-disabled">
                  Danger Disabled
                </Button>
              </div>
            </div>

            {/* Loading State Card (with Zero-Layout-Shift Width Locking) */}
            <div className="rounded-none border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Loading State (Width-Locked)
                </h3>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={triggerInteractiveLoading}
                  data-testid="test-toggle-loading"
                >
                  {interactiveLoading ? 'Loading Active (2s)...' : 'Test Live Width Lock'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  variant="primary"
                  size="md"
                  loading={interactiveLoading || true}
                  data-testid="btn-primary-loading"
                >
                  Create New Project
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  loading={interactiveLoading || true}
                  data-testid="btn-secondary-loading"
                >
                  Deal Underwriting Sync
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Functional Roles (CTA, Icon, Dropdown, Toggle, Danger Confirm) */}
        <section className="space-y-6">
          <div>
            <h2 className="text-[16px] font-bold text-foreground">3. Functional Roles (Props Composition)</h2>
            <p className="text-[13px] text-muted-foreground">
              No proliferation of specialized button components; all patterns compose cleanly via props.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CTA Role */}
            <div className="rounded-none border border-border bg-card p-6 space-y-3">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Conversion CTA (`roleVariant="cta"`)
              </h3>
              <p className="text-[12px] text-muted-foreground">Enforces primary variant + lg sizing.</p>
              <div>
                <Button
                  roleVariant="cta"
                  icon={<RocketLaunch className="h-5 w-5" weight="bold" />}
                  data-testid="btn-role-cta"
                >
                  Explore Deals
                </Button>
              </div>
            </div>

            {/* Dropdown Role */}
            <div className="rounded-none border border-border bg-card p-6 space-y-3">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Dropdown Disclosure (`roleVariant="dropdown"`)
              </h3>
              <p className="text-[12px] text-muted-foreground">Appends standard disclosure chevron.</p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  roleVariant="dropdown"
                  data-testid="btn-role-dropdown"
                >
                  Deals Filter
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  roleVariant="dropdown"
                  data-testid="btn-role-dropdown-sm"
                >
                  Account
                </Button>
              </div>
            </div>

            {/* Toggle Role */}
            <div className="rounded-none border border-border bg-card p-6 space-y-3">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Binary Toggle (`roleVariant="toggle"`)
              </h3>
              <p className="text-[12px] text-muted-foreground">
                Binds `aria-pressed={toggleState ? 'true' : 'false'}` for state inspection.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  roleVariant="toggle"
                  isPressed={toggleState}
                  onClick={() => setToggleState(!toggleState)}
                  icon={
                    toggleState ? (
                      <BookmarkSimple className="h-4 w-4" weight="fill" />
                    ) : (
                      <Bookmark className="h-4 w-4" weight="bold" />
                    )
                  }
                  data-testid="btn-role-toggle"
                >
                  {toggleState ? 'Saved Deal' : 'Save Deal'}
                </Button>
                <span className="text-[11px] font-mono text-muted-foreground">
                  aria-pressed: {String(toggleState)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Square Icon Buttons */}
            <div className="rounded-none border border-border bg-card p-6 space-y-4">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Square Icon Buttons (SM / MD / LG)
              </h3>
              <p className="text-[12px] text-muted-foreground">
                Requires `aria-label` when text-less. Square dimensions matching size heights.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  isIconOnly
                  aria-label="Refresh metrics (sm)"
                  icon={<ArrowsClockwise className="h-4 w-4" weight="bold" />}
                  data-testid="btn-icon-sm"
                />
                <Button
                  variant="secondary"
                  size="md"
                  isIconOnly
                  aria-label="Filter listings (md)"
                  icon={<Funnel className="h-4 w-4" weight="bold" />}
                  data-testid="btn-icon-md"
                />
                <Button
                  variant="primary"
                  size="lg"
                  isIconOnly
                  aria-label="Add project (lg)"
                  icon={<Plus className="h-5 w-5" weight="bold" />}
                  data-testid="btn-icon-lg"
                />
              </div>
            </div>

            {/* Danger Confirmation Pattern */}
            <div className="rounded-none border border-border bg-card p-6 space-y-4">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Danger with Confirmation Pattern
              </h3>
              <p className="text-[12px] text-muted-foreground">
                Requires double-click to confirm destructive actions, preventing accidental data loss.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="danger"
                  size="md"
                  confirmDanger
                  confirmDangerLabel="Confirm Delete Project?"
                  onConfirmDanger={() => setConfirmedDangerAction(true)}
                  data-testid="btn-danger-confirm"
                >
                  Delete Project
                </Button>
                {confirmedDangerAction && (
                  <span className="text-[12px] text-destructive font-semibold" data-testid="danger-confirmed-msg">
                    Project deletion confirmed!
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Focus-Visible Ring Keyboard Demonstration */}
        <section className="rounded-none border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Keyboard className="h-5 w-5 text-muted-foreground" weight="bold" />
            <h2 className="text-[15px] font-bold">4. Focus-Visible Keyboard Contract (Tab Navigation)</h2>
          </div>
          <p className="text-[13px] text-muted-foreground max-w-2xl">
            Press <kbd className="px-2 py-0.5 bg-muted border border-border rounded-none text-[11px] font-mono">Tab</kbd> on your keyboard
            to navigate sequentially between buttons. Each variant renders a high-contrast 1px ring
            in accordance with the Radix-Lyra design system, guaranteeing strict a11y compliance.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button variant="primary" size="md" data-testid="tab-target-1">
              Tab Target 1 (Primary)
            </Button>
            <Button variant="secondary" size="md" data-testid="tab-target-2">
              Tab Target 2 (Secondary)
            </Button>
            <Button variant="tertiary" size="md" data-testid="tab-target-3">
              Tab Target 3 (Tertiary)
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
