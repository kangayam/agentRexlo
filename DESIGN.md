---
name: AgentFlow Core

colors:
  # ── Base surfaces ────────────────────────────────────────────────────────────
  background:               "#ffffff"
  surface:                  "#ffffff"
  surface-dim:              "#f8fafc"
  surface-container-lowest: "#ffffff"
  surface-container-low:    "#f8fafc"
  surface-container:        "#f1f5f9"
  surface-container-high:   "#e2e8f0"
  surface-container-highest:"#cbd5e1"

  # ── Text ─────────────────────────────────────────────────────────────────────
  on-surface:         "#111827"
  on-surface-variant: "#6b7280"
  on-surface-subtle:  "#9ca3af"
  inverse-surface:    "#1e293b"
  inverse-on-surface: "#f8fafc"

  # ── Borders & dividers ───────────────────────────────────────────────────────
  outline:         "#e5e7eb"
  outline-variant: "#f3f4f6"

  # ── Primary (dark navy — sidebar chrome, headings, primary buttons) ──────────
  primary:             "#0f172a"
  on-primary:          "#ffffff"
  primary-container:   "#1e293b"
  on-primary-container:"#f8fafc"
  inverse-primary:     "#64748b"

  # ── Secondary (light muted — secondary buttons, pills) ───────────────────────
  secondary:             "#f1f5f9"
  on-secondary:          "#0f172a"
  secondary-container:   "#e2e8f0"
  on-secondary-container:"#1e293b"

  # ── Semantic: Safe / ITC Accepted (emerald) ──────────────────────────────────
  safe:             "#ecfdf5"
  safe-border:      "#a7f3d0"
  safe-label:       "#065f46"
  on-safe:          "#047857"

  # ── Semantic: At Risk / Pending (amber) ──────────────────────────────────────
  risk:             "#fffbeb"
  risk-border:      "#fde68a"
  risk-label:       "#92400e"
  on-risk:          "#b45309"

  # ── Semantic: Blocked / Rejected / Urgent (red) ──────────────────────────────
  danger:           "#fef2f2"
  danger-border:    "#fecaca"
  danger-label:     "#991b1b"
  on-danger:        "#dc2626"

  # ── Semantic: Informational / Uploaded (blue) ────────────────────────────────
  info:             "#eff6ff"
  info-border:      "#bfdbfe"
  info-label:       "#1e40af"
  on-info:          "#2563eb"

  # ── Semantic: Unverified / Neutral (gray) ────────────────────────────────────
  neutral-tint:     "#f3f4f6"
  neutral-label:    "#374151"

  # ── Acting-as banner (amber) ─────────────────────────────────────────────────
  acting-as-bg:     "#fffbeb"
  acting-as-border: "#fde68a"
  acting-as-text:   "#92400e"

  # ── Notification badge ───────────────────────────────────────────────────────
  badge:            "#ef4444"
  on-badge:         "#ffffff"

  # ── Destructive ──────────────────────────────────────────────────────────────
  destructive:      "#dc2626"
  on-destructive:   "#ffffff"

typography:
  heading-xl:
    fontFamily: Geist Sans
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  heading-lg:
    fontFamily: Geist Sans
    fontSize: 20px
    fontWeight: "700"
    lineHeight: 28px
  heading-md:
    fontFamily: Geist Sans
    fontSize: 16px
    fontWeight: "600"
    lineHeight: 24px
  body-md:
    fontFamily: Geist Sans
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  body-sm:
    fontFamily: Geist Sans
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 16px
  label-md:
    fontFamily: Geist Sans
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 20px
  label-sm:
    fontFamily: Geist Sans
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
  tabular:
    fontFamily: Geist Sans
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 16px
    fontVariantNumeric: tabular-nums
  mono:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 16px

rounded:
  sm:      0.25rem
  DEFAULT: 0.375rem
  md:      0.5rem
  lg:      0.5rem
  xl:      0.75rem
  full:    9999px

spacing:
  unit:              4px
  xs:                4px
  sm:                8px
  md:                12px
  lg:                16px
  xl:                24px
  2xl:               32px
  page-padding:      24px
  section-gap:       24px
  table-cell-x:      12px
  table-cell-y:      8px
  card-padding:      16px
  sidebar-width:     224px

elevation:
  sm:
    boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"
  DEFAULT:
    boxShadow: "0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px -1px rgba(0,0,0,0.10)"
  lg:
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.10)"

components:
  # Sidebar
  sidebar:
    backgroundColor: "{colors.surface}"
    borderRight: "1px solid {colors.outline}"
    width: "{spacing.sidebar-width}"

  nav-link:
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "8px 12px"

  nav-link-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"

  # Buttons
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor:       "{colors.on-primary}"
    typography:      "{typography.label-md}"
    rounded:         "{rounded.md}"
    height:          40px
    padding:         "0 16px"

  button-primary-hover:
    backgroundColor: "{colors.primary-container}"

  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor:       "{colors.on-surface}"
    border:          "1px solid {colors.outline}"
    typography:      "{typography.label-md}"
    rounded:         "{rounded.md}"
    height:          40px
    padding:         "0 16px"

  button-ghost:
    backgroundColor: "transparent"
    textColor:       "{colors.on-surface-variant}"
    rounded:         "{rounded.md}"

  button-sm:
    height:  36px
    padding: "0 12px"

  # Input fields
  input:
    backgroundColor: "{colors.surface}"
    textColor:       "{colors.on-surface}"
    border:          "1px solid {colors.outline}"
    typography:      "{typography.body-md}"
    rounded:         "{rounded.md}"
    height:          40px
    padding:         "0 12px"

  input-focus:
    border: "2px solid {colors.primary}"

  # Data tables
  table-header:
    backgroundColor: "{colors.surface-container-low}"
    textColor:       "{colors.on-surface-variant}"
    typography:      "{typography.label-sm}"
    letterSpacing:   "0.05em"
    textTransform:   "uppercase"
    padding:         "12px 12px"

  table-row:
    backgroundColor: "{colors.surface}"
    borderBottom:    "1px solid {colors.outline-variant}"

  table-row-hover:
    backgroundColor: "{colors.surface-container-low}"

  table-cell:
    textColor:  "{colors.on-surface}"
    typography: "{typography.body-sm}"
    padding:    "8px 12px"

  # Summary cards (ITC risk dashboard)
  card-safe:
    backgroundColor: "{colors.safe}"
    border:          "1px solid {colors.safe-border}"
    rounded:         "{rounded.lg}"
    padding:         "{spacing.card-padding}"

  card-risk:
    backgroundColor: "{colors.risk}"
    border:          "1px solid {colors.risk-border}"
    rounded:         "{rounded.lg}"
    padding:         "{spacing.card-padding}"

  card-danger:
    backgroundColor: "{colors.danger}"
    border:          "1px solid {colors.danger-border}"
    rounded:         "{rounded.lg}"
    padding:         "{spacing.card-padding}"

  card-neutral:
    backgroundColor: "{colors.surface-container-low}"
    border:          "1px solid {colors.outline}"
    rounded:         "{rounded.lg}"
    padding:         "{spacing.card-padding}"

  # Status badges
  badge-base:
    rounded:   "{rounded.full}"
    padding:   "2px 10px"
    typography:"{typography.label-sm}"

  badge-safe:
    backgroundColor: "{colors.safe}"
    textColor:       "{colors.safe-label}"

  badge-risk:
    backgroundColor: "{colors.risk}"
    textColor:       "{colors.risk-label}"

  badge-danger:
    backgroundColor: "{colors.danger}"
    textColor:       "{colors.danger-label}"

  badge-neutral:
    backgroundColor: "{colors.neutral-tint}"
    textColor:       "{colors.neutral-label}"

  badge-info:
    backgroundColor: "{colors.info}"
    textColor:       "{colors.info-label}"

  # Filter chips (invoice table)
  filter-chip:
    rounded:         "{rounded.full}"
    border:          "1px solid {colors.outline}"
    backgroundColor: "{colors.surface}"
    textColor:       "{colors.on-surface-variant}"
    typography:      "{typography.label-sm}"
    padding:         "4px 12px"

  filter-chip-active:
    backgroundColor: "{colors.primary}"
    textColor:       "{colors.on-primary}"
    border:          "1px solid {colors.primary}"

  # Acting-as banner
  acting-as-banner:
    backgroundColor: "{colors.acting-as-bg}"
    borderBottom:    "1px solid {colors.acting-as-border}"
    textColor:       "{colors.acting-as-text}"
    padding:         "8px 16px"

  # Notification bell badge
  notification-badge:
    backgroundColor: "{colors.badge}"
    textColor:       "{colors.on-badge}"
    rounded:         "{rounded.full}"
    size:            16px
    typography:      "{typography.body-sm}"

  # Section panels / white cards
  panel:
    backgroundColor: "{colors.surface}"
    border:          "1px solid {colors.outline}"
    rounded:         "{rounded.xl}"
    padding:         "{spacing.xl}"
    boxShadow:       "{elevation.sm.boxShadow}"
---

## Brand & Style

AgentFlow Core is a professional B2B decision engine for Chartered Accountants in India. The design reflects the tool's job: help a CA manage 50–200 clients' monthly GST reconciliation with confidence and speed. The visual language is deliberately serious, data-dense, and minimal — styled to feel like enterprise software, not a consumer product.

The personality is **calm authority**. There are no gradients, no illustration, no playful curves. Every element earns its place by communicating information. The most important design decision is the semantic color system that encodes ITC risk state at a glance: emerald means money is safe, amber means attention is needed, red means action is overdue.

## Colors

The palette is strictly functional. A near-black navy (`#0f172a`) serves as the single primary color — it appears in the sidebar active state, primary buttons, page headings, and strong text. Everything else is drawn from the gray scale (gray-50 through gray-900) or the four semantic families.

**Semantic families** encode ITC reconciliation state and are the most visible color in the product:

- **Emerald** — ITC safe, auto-accepted invoices, "All Done" client status. Conveys that no money is at risk.
- **Amber** — ITC at risk, pending review, invoices needing attention. A warning tone, not an alarm.
- **Red** — ITC blocked, auto-rejected invoices, "Urgent" client status. Used sparingly; when it appears something requires immediate CA action.
- **Blue** — informational events (file uploaded, notification received). Neutral signal, not a risk indicator.

These four families always appear as `{color}-50` backgrounds with `{color}-200` borders and `{color}-800` text — tinted but never saturated — so they read as contextual highlights rather than primary UI elements.

The amber acting-as banner deserves special mention: when a CA is viewing the product through a client's eyes, the amber strip across the top of the viewport is the persistent reminder that they are in an impersonation context and not their own portal.

## Typography

The product uses **Geist Sans** (variable, loaded locally) for all UI text and **Geist Mono** for data strings that must align vertically or identify uniquely: GSTINs, invoice numbers, and amount columns. Both fonts ship with the Next.js default scaffold and require no external loading.

Type scale is deliberately compressed. Body text runs at 14px (`.text-sm`) and labels at 12px (`.text-xs`). This density is intentional — data tables holding 40–50 invoice rows must be scannable without scrolling. The trade-off is that spacing and weight must compensate: column headers are `uppercase tracking-wide font-medium` at 11–12px; amounts use `tabular-nums` to keep columns aligned.

Headings appear only at the top of pages (24px / semibold) and as section labels within panels (16px / semibold). There are no display-scale type sizes — the product is a tool, not a landing page.

## Layout & Spacing

The shell is a fixed left sidebar (224px) with a scrollable main content area filling the remaining viewport. This two-column layout is consistent across both the CA portal and the client portal.

The sidebar holds navigation links, a notification bell, and the signed-in user's name and email at the bottom. It uses a 1px right border against white and carries no background color — it reads as part of the chrome, not a distinct panel.

Page content uses 24px inset padding and a `space-y-6` rhythm between sections. White panels (`.bg-white.border.rounded-xl`) group related content. Tables are the primary content element and are given the full available width with no side constraints.

Spacing follows a 4px unit grid. The most common values are:
- `8px` — between inline elements (chips, badge + text)
- `12px` — table cell inset horizontal
- `16px` — card padding, gap between columns
- `24px` — page inset, section gap

## Elevation & Depth

Depth is minimal. The sidebar and white content panels sit on a `bg-gray-50` or `bg-slate-50` page background, creating a single elevation step. Panels use a 1px `border-gray-200` outline and `shadow-sm` (1px 2px 0 rgba(0,0,0,0.05)) — just enough to lift them off the page without visual noise.

Modals and dropdowns (e.g., the notification inbox) use `shadow-lg` and `z-50` to float clearly above page content. There is no intermediate "card" elevation between the page and modals.

## Shapes

All interactive elements use `rounded-md` (8px). Larger containers — section panels, the notification dropdown — use `rounded-xl` (12px) for a softer, more approachable feel. Filter chips and status badges use `rounded-full` to distinguish them visually from action elements. The base `--radius` CSS variable is set to `0.5rem` (8px), which anchors the shadcn/ui component library.

## Components

### Navigation Sidebar

Links in an idle state are gray-600 text on transparent background. The active link uses the dark navy primary as a filled background with white text — a high-contrast "you are here" signal. There is no hover animation; the state change is immediate.

The notification bell sits above the user info block and shows a red filled circle badge when there are unread items. The badge caps at "9+" to keep layout stable.

### Data Tables

Tables are the core UI primitive. The pattern is consistent: `bg-gray-50` header row with uppercase tracking labels, `divide-y divide-gray-100` row separators, and `hover:bg-gray-50` row hover. Amount columns right-align with `tabular-nums`. GSTIN strings use `font-mono text-xs`.

The "ITC at Risk" column and similar financial amounts use `₹` prefix with Indian locale formatting (`en-IN`, no decimals for whole rupee amounts). Zero or empty values render as `—` (em dash) to distinguish absence of risk from a zero value.

### Filter Chips

The invoice table uses a row of pill-shaped filter chips above the data. Inactive chips are white with a gray border. The active chip inverts to the dark navy primary fill with white text — matching the sidebar active link treatment, creating a consistent "selected" language across the product.

### Status Badges

Pill badges appear in two contexts: invoice match outcomes and client status. They always use the `{color}-50` background / `{color}-800` text pattern from the semantic palette. They never carry icons — the label text ("Accepted", "Urgent", "Pending") is the sole signal.

### Summary Cards

The four ITC summary cards at the top of the client dashboard each carry a semantic tint: emerald for Safe, amber for At Risk, red for Blocked, gray for Unverified. Card borders use the `{color}-200` weight so the color registers without overwhelming the number displayed inside. The number itself is `text-2xl font-semibold text-gray-900` — neutral, so the card color provides the context rather than the number itself.

### Acting-As Banner

When a CA impersonates a client via "View Queue", an amber strip appears at the top of the client portal above the sidebar. It names the client and offers an "Exit" button. The amber color is the only instance of a warm background used as a persistent layout element, making it immediately recognizable as a context indicator rather than content.
