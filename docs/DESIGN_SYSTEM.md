# AlgoStudio Design System

Canonical design reference for all public pages, proof pages, and shared product surfaces.

This document defines the visual foundation, component patterns, and design rules that guide the implementation of every user-facing surface in AlgoStudio. It is the single source of truth for design decisions during refactors and new page development.

---

## Design System Architecture

The system is organized in layers. Each layer inherits from the one above it.

### Core Foundation

Shared across every surface in the product. Defines:

- Color tokens
- Typography scale
- Spacing system
- Border styles
- Card patterns
- Badge patterns
- Semantic status language (success, warning, danger, neutral)
- Iconography rules
- Responsive behavior

Every surface — public marketing, proof reports, and the product dashboard — uses the same core tokens. This is what makes the product feel like one coherent system.

### Public Marketing Layer

Applies to: homepage, about, pricing, strategy discovery.

Extends the core foundation with:

- Narrative section structure (problem, solution, proof, CTA)
- Onboarding-oriented hierarchy (explain before showing data)
- Broader spacing for readability
- Simplified data presentation (fewer stats, more context)

### Proof / Verification Layer

Applies to: public proof pages, OG images, shareable reports.

Extends the core foundation with:

- Trust-first information hierarchy
- Verification ladder patterns
- Hash and chain display conventions
- Verdict presentation
- Screenshot-optimized layout
- Evidence-based visual language

This layer defines the canonical trust language for the product. Patterns established here (verification badges, ladder progression, verdict boxes, stat presentation) propagate to other layers when they display similar data.

### Dashboard / Product Layer

Applies to: in-app strategy detail, command center, monitoring panels, incident timelines.

Extends the core foundation with:

- Higher information density
- Interactive elements (disclosure sections, controls, filters)
- Operator-oriented language (actions, recommendations, diagnostics)
- Navigation and session context

The dashboard shares the same visual DNA as the public pages — same colors, same typography, same card patterns — but allows for denser layouts and more interactive patterns.

---

## 1. Visual Direction

### Identity

AlgoStudio is a monitoring and governance platform for algorithmic trading strategies. It does not place trades. It is not a trading bot, signal service, or primarily an EA builder.

The visual identity communicates: monitoring, verification, governance, strategy integrity, edge stability, public proof.

### Reference Point

**Financial research report meets modern SaaS dashboard.**

The closest analogue is Stripe's documentation clarity combined with the data density of an institutional risk analytics platform. The UI should feel like it was built by people who understand risk — not people trying to sell a trading product.

### What AlgoStudio Is Not

- Not a Bloomberg terminal (too dense, too retro for onboarding)
- Not a crypto dashboard (too flashy, too speculative)
- Not a dark trading bot UI (too theatrical, wrong associations)
- Not a generic SaaS landing page (too lightweight, not technical enough)

### Design Principles

1. **Institutional calm.** Every element earns its place. No decoration for decoration's sake.
2. **Evidence over assertion.** Numbers, badges, and verified states carry the page — not marketing copy.
3. **Quiet authority.** The design communicates competence through restraint.
4. **One coherent system.** A user moving from the homepage to a proof page to the dashboard should feel like they never left the same product.

---

## 2. Color System

### Theme Strategy

AlgoStudio uses a **dark-first canonical theme**. The goal is institutional clarity, not theatrical dark mode. Readability, hierarchy, and screenshot clarity always take priority over "looking dark."

The dark foundation communicates seriousness and technical depth — financial terminals, monitoring dashboards, and research platforms default dark for a reason. But the implementation must be restrained: neutral undertones, sufficient contrast, and clear elevation hierarchy.

A light theme may be introduced in the future for specific contexts (e.g., printed reports, accessibility preferences). The dark theme is the canonical default and the basis for all current design decisions.

### Background Tokens

| Token         | Value                    | Role                                                               |
| ------------- | ------------------------ | ------------------------------------------------------------------ |
| `bg-primary`  | `#09090B`                | Page background. Near-black with neutral undertone.                |
| `bg-elevated` | `#111114`                | Cards, panels, modals. One step above primary.                     |
| `bg-surface`  | `#18181B`                | Nested content within cards (stat tiles, code blocks, table rows). |
| `bg-inset`    | `#09090B` at 50% opacity | Recessed areas within elevated cards.                              |

The background palette uses the zinc family (neutral undertone). This replaces the previous purple-black (`#0A0118`, `#1A0626`) palette, which pushed toward crypto aesthetics when used broadly. The neutralized backgrounds allow semantic colors and accent to carry more visual weight.

### Brand & Accent

| Token           | Value                   | Role                                                                  |
| --------------- | ----------------------- | --------------------------------------------------------------------- |
| `accent`        | `#6366F1`               | Primary brand accent. Indigo. Links, active states, key badges, CTAs. |
| `accent-muted`  | `#4F46E5`               | Darker indigo for backgrounds/borders on accent elements.             |
| `accent-subtle` | `rgba(99,102,241,0.10)` | Tinted backgrounds behind accent elements.                            |
| `accent-text`   | `#818CF8`               | Lighter indigo for readable text on dark backgrounds.                 |

Indigo is used sparingly. It highlights and identifies — it does not dominate. Accent should never be the loudest color on a page; semantic colors (green, amber, red) take priority when status is being communicated.

### Semantic Colors

| Token     | Value     | Role                                                        |
| --------- | --------- | ----------------------------------------------------------- |
| `success` | `#10B981` | Verified, passing, healthy, positive states. Emerald green. |
| `warning` | `#F59E0B` | Attention, drift, at-risk, degraded. Amber.                 |
| `danger`  | `#EF4444` | Failed, invalidated, broken chain, critical. Red.           |
| `neutral` | `#71717A` | Muted, inactive, unknown, pending. Zinc-500.                |

These four states map to every verification, status, and health indicator in the system. There are no other semantic states.

### Text Colors

| Token            | Value     | Role                                                   |
| ---------------- | --------- | ------------------------------------------------------ |
| `text-primary`   | `#FAFAFA` | Headlines, primary content. Near-white.                |
| `text-secondary` | `#A1A1AA` | Body text, descriptions, supporting content. Zinc-400. |
| `text-muted`     | `#71717A` | Labels, timestamps, tertiary information. Zinc-500.    |
| `text-inverse`   | `#09090B` | Text on light/accent backgrounds (rare).               |

### Border Tokens

| Token            | Value                                   | Role                                                    |
| ---------------- | --------------------------------------- | ------------------------------------------------------- |
| `border-subtle`  | `rgba(255,255,255,0.06)`                | Default card/section borders. Barely visible.           |
| `border-default` | `rgba(255,255,255,0.10)`                | Emphasized borders, hover states, interactive elements. |
| `border-accent`  | Accent or semantic color at 20% opacity | Left-accent borders on verdict cards and alerts.        |

### CTA Color

| Token       | Value     | Role                                 |
| ----------- | --------- | ------------------------------------ |
| `cta`       | `#6366F1` | Primary CTA buttons. Same as accent. |
| `cta-hover` | `#818CF8` | Hover state.                         |
| `cta-text`  | `#FFFFFF` | Button text.                         |

Single CTA color. No gradients. No glow effects.

### Migration Reference

| Previous               | New                      | Token            |
| ---------------------- | ------------------------ | ---------------- |
| `#0A0118`              | `#09090B`                | `bg-primary`     |
| `#1A0626`              | `#111114`                | `bg-elevated`    |
| `#0A0118/50`           | `#18181B`                | `bg-surface`     |
| `rgba(79,70,229,0.15)` | `rgba(255,255,255,0.06)` | `border-subtle`  |
| `#E2E8F0`              | `#FAFAFA`                | `text-primary`   |
| `#94A3B8`              | `#A1A1AA`                | `text-secondary` |
| `#7C8DB0`              | `#71717A`                | `text-muted`     |

Semantic colors (`#10B981`, `#F59E0B`, `#EF4444`, `#6366F1`) remain unchanged.

---

## 3. Typography System

### Font Stack

```
Primary:   Inter (fallback: system-ui, sans-serif)
Monospace: JetBrains Mono (fallback: ui-monospace, monospace)
```

Inter is the standard for data-heavy interfaces: excellent tabular figures, clear character distinction, readable at small sizes. The design should not depend on a specific typeface — system-ui is an acceptable fallback.

### Scale

| Level           | Size             | Weight  | Tracking | Usage                                                          |
| --------------- | ---------------- | ------- | -------- | -------------------------------------------------------------- |
| Page title      | 36px / 2.25rem   | 800     | -0.025em | One per page. Strategy name, page headline.                    |
| Section heading | 20px / 1.25rem   | 700     | -0.01em  | Major section titles.                                          |
| Card heading    | 16px / 1rem      | 600     | normal   | Panel titles within sections.                                  |
| Body            | 14px / 0.875rem  | 400     | normal   | Descriptions, explanations, paragraphs.                        |
| Small body      | 13px / 0.8125rem | 400     | normal   | Dense data contexts, table cells.                              |
| Label           | 11px / 0.6875rem | 600     | 0.05em   | Uppercase. Above stats, column headers, metadata.              |
| Metric value    | 20-36px          | 700-800 | -0.01em  | Key numbers. Size varies by prominence. Always `tabular-nums`. |
| Mono            | 12px / 0.75rem   | 400     | normal   | Hashes, IDs, chain references.                                 |

### Line Height

- Body text: 1.6
- Headings: 1.2
- Metric values: 1.0
- Labels: 1.0

### Rules

- Maximum 3 font sizes per card. Typically: heading + value + label.
- Body text is 14px as the canonical default. Use 13px only for dense data contexts (tables, compact grids).
- Uppercase is reserved for 11px labels. Never uppercase headings or body text.
- No italic text in the design system. Italic reads as editorial/opinion; AlgoStudio is factual.
- Metric values always use `font-variant-numeric: tabular-nums` for vertical alignment.
- Bold is reserved for headings and metric values. Body text uses normal weight; use semibold for emphasis only when necessary.

---

## 4. Layout & Spacing System

### Content Width

| Context             | Max width            | Notes                                        |
| ------------------- | -------------------- | -------------------------------------------- |
| Default content     | `max-w-4xl` (896px)  | Proof pages, about, general content.         |
| Wide content        | `max-w-5xl` (1024px) | Tables, discovery grids, pricing comparison. |
| Full-bleed sections | 100% width           | Content inside constrained to max-w-5xl.     |

896px is the canonical default. It maintains readability on large screens without feeling sparse. Pages should read like a report, not fill a dashboard.

### Spacing Scale

Base unit: 4px. All spacing derives from multiples of 4.

| Token       | Value | Usage                                                      |
| ----------- | ----- | ---------------------------------------------------------- |
| `space-xs`  | 4px   | Tight internal gaps (icon to text).                        |
| `space-sm`  | 8px   | Compact spacing within components.                         |
| `space-md`  | 16px  | Standard internal card padding, gap between related items. |
| `space-lg`  | 24px  | Gap between cards within a section.                        |
| `space-xl`  | 32px  | Section title to section content.                          |
| `space-2xl` | 48px  | Canonical gap between major page sections.                 |
| `space-3xl` | 64px  | Hero to first content section. Top/bottom page padding.    |

### Card Padding

| Card type          | Padding      |
| ------------------ | ------------ |
| Standard panel     | 20px (`p-5`) |
| Dense data card    | 16px (`p-4`) |
| Stat tile (nested) | 12px (`p-3`) |

### Grid Usage

- Stat grids: `grid-cols-2 sm:grid-cols-3` or `grid-cols-2 sm:grid-cols-4` depending on item count.
- Two-column layouts: `grid-cols-1 md:grid-cols-2`.
- Card gap: 12-16px (`gap-3` or `gap-4`).
- No masonry layouts. Everything aligns to a strict grid.

### Page Rhythm

The canonical vertical rhythm for public pages:

```
[64px top padding]
[Hero / Header section]
[48px gap]
[Content section]
[48px gap]
[Content section]
[48px gap]
[CTA / Footer section]
[64px bottom padding]
```

48px is the canonical section gap. Within sections, cards are separated by 12-16px. This creates a clear visual heartbeat: dense inside sections, breathing room between them. Deviations from 48px are acceptable when the content relationship demands tighter or looser grouping, but should be the exception.

---

## 5. Responsive & Mobile Rules

### Approach

Mobile-first. All layouts are designed for narrow viewports first, then enhanced for wider screens.

### Breakpoints

Follow Tailwind defaults:

| Breakpoint | Width     | Usage                                    |
| ---------- | --------- | ---------------------------------------- |
| Base       | < 640px   | Mobile. Single column. Stacked layout.   |
| `sm`       | >= 640px  | Small tablets. Minor layout adjustments. |
| `md`       | >= 768px  | Tablets. Two-column layouts begin.       |
| `lg`       | >= 1024px | Desktop. Full layout.                    |

### Stacking Rules

- Two-column grids (`md:grid-cols-2`) collapse to single column on mobile.
- Stat grids max out at `grid-cols-2` on mobile, expanding to 3 or 4 columns on `sm`+.
- Side-by-side elements (e.g., share section title + buttons) stack vertically on mobile using `flex-col sm:flex-row`.

### Hero Compression

- Page title drops from 36px to 28px on mobile.
- Hero stat tiles remain in a 2-column or 3-column grid; values drop from 36px to 24px.
- Hero padding reduces from `p-6` to `p-4` on mobile.

### Table to Card Behavior

Data tables (strategy discovery, comparison grids) transform on mobile:

- Desktop: table with columns, sortable headers.
- Mobile: card list. Each row becomes a card with key information stacked vertically.
- The switch point is `md` (768px).

### Spacing Adjustments

| Token                   | Desktop | Mobile |
| ----------------------- | ------- | ------ |
| Section gap             | 48px    | 32px   |
| Page top/bottom padding | 64px    | 32px   |
| Card padding (standard) | 20px    | 16px   |
| Hero to content gap     | 64px    | 32px   |

### Touch Targets

- All interactive elements (buttons, links, clickable cards) have a minimum touch target of 44x44px on mobile.
- Card click targets span the full card area.

---

## 6. Iconography

### Style

- Simple line icons only. Single-weight stroke.
- Consistent stroke width: 1.5px or 2px across the system. Pick one and maintain it.
- 24x24px as the canonical icon size. 16x16px and 20x20px for inline/compact contexts.

### Rules

- Icons support meaning, not decoration. Every icon should communicate something specific (status, action, category). Remove any icon that exists purely for visual flair.
- No duotone, 3D, gradient, or illustration-heavy icons.
- No filled icons as the default. Filled variants may be used for active/selected states.
- Icon color follows the text or semantic color it accompanies. Icons do not have independent color treatment.
- Heroicons (outline) is the preferred icon set based on current usage. Avoid mixing icon sets.

### Usage Patterns

| Context           | Icon behavior                                                        |
| ----------------- | -------------------------------------------------------------------- |
| Status indicators | Small (16px) semantic-colored icon + text label.                     |
| Section headers   | No icons. Text-only headings.                                        |
| Action buttons    | Icon + text label. Never icon-only for primary actions.              |
| Inline metadata   | Icon (16px) + text. Icon in `text-muted`, text in `text-secondary`.  |
| Copy buttons      | Small clipboard icon (14-16px), ghost-styled, adjacent to the value. |
| Navigation        | Icon + label. Never icon-only.                                       |

---

## 7. Copy & Tone

### Voice

AlgoStudio's public-facing copy is factual, concise, and professional. It explains rather than promotes. It shows evidence rather than making claims.

### Rules

1. **Factual over promotional.** State what the product does. Do not describe how amazing it is.
2. **Clarity over hype.** If a sentence can be shorter without losing meaning, make it shorter.
3. **Problem before features.** Explain what problem exists before describing the solution. The user must feel the relevance before seeing the feature.
4. **Trust claims must be grounded in visible evidence.** Never write "trusted by thousands" unless the number is real and verifiable. If no social proof exists, omit the section entirely.
5. **Avoid crypto/trading-marketing language.** No "moon", "alpha", "edge" (in marketing context), "revolutionary", "game-changing", "unlock profits". The product monitors strategies — it doesn't make money for people.
6. **Avoid urgency-heavy SaaS copy.** No "Start your free trial today!", "Limited time!", "Don't miss out!". AlgoStudio CTAs are calm: "Start monitoring", "View proof", "Create account".
7. **No superlatives without evidence.** Never "the best", "the most advanced", "the only platform". Use specific, verifiable descriptions.
8. **Technical terms are acceptable.** The audience understands profit factor, drawdown, Sharpe ratio. Don't dumb these down — but always provide enough context that the number is meaningful.

### CTA Language

Preferred:

- "Start monitoring"
- "View proof"
- "Create account"
- "See pricing"
- "Learn more"

Avoid:

- "Get started now!"
- "Try it free!"
- "Join thousands of traders!"
- "Unlock your edge!"

### Metadata / Social Sharing Copy

- Title format: `{Name} -- {Level} Strategy | AlgoStudio`
- No emojis in metadata.
- No call-to-action language in titles or descriptions.
- Descriptions are factual summaries of what the page contains.

---

## 8. Core UI Components

### Hero Section

- Full-width background (`bg-primary`), content constrained to max width.
- Single headline (page title size), one supporting line (body, `text-secondary`).
- Optional badge row below headline.
- Optional key metric callouts (2-3 stat tiles).
- CTA button if appropriate.
- No background images, no gradients, no particles, no animation.

The hero's job is to state what the page is, not to impress. On proof pages, the hero doubles as a screenshot-friendly trust summary card.

### Stat Card / Tile

```
+---------------------+
|  LABEL              |  <- 11px, muted, uppercase
|                     |
|  Value              |  <- 20-28px, white, bold, tabular-nums
+---------------------+
```

- Background: `bg-surface` or `bg-inset`.
- Border-radius: 12px.
- Padding: 12-16px.
- Never more than 2 lines: label above, value below.
- Semantic color on values only when the number has directional meaning (profit = green, drawdown = red). Neutral numbers stay `text-primary`.
- This component is the same everywhere it appears — proof pages, dashboard, discovery cards. Same padding, same font sizes, same structure.

### Verification Badge

```
[ Shield icon ] Verified by AlgoStudio
```

- Small inline pill: `accent-subtle` background, `accent` border at 40% opacity, `accent-text` text.
- Shield SVG, 14-16px.
- Text: 12-13px, semibold.
- Used once per page, near the page title. Never repeated on the same page.

### Ladder Level Badge

```
[ Validated ]
```

- Pill shape, rounded-full.
- Background: level color at 10% opacity.
- Border: level color at 30% opacity.
- Text: level color, 12px, semibold.
- Colors: Submitted = `neutral`, Validated = `accent`, Verified = `success`, Proven = `warning`.

### Verdict Box

- Tinted container: verdict color at 8% opacity background, 1px border in verdict color at ~15% opacity.
- Single sentence of verdict text in verdict color, 14-18px depending on context, semibold.
- Used in proof page heroes and OG images.
- Always one sentence. Always factual.

### Proof / Audit Panel

- Card with `bg-elevated`, `border-subtle`.
- Left accent border (3px) in semantic color when the panel carries a verdict or status.
- Monospace text for hashes and chain references.
- Copy buttons (clipboard icon) inline with hash values.
- Chain verification status: icon (check/x/question) + text + semantic color.

### Data Table

- No visible row borders. Subtle background differentiation on hover only.
- Header row: 11px uppercase labels, `text-muted`, bottom border `border-subtle`.
- Cell text: 13px, `text-secondary`. Key column (e.g., strategy name) in `text-primary`.
- Sortable columns: subtle chevron indicator.
- Row click targets the full row.
- Transforms to card layout on mobile (see Responsive section).

### Score Bar / Risk Indicator

```
[Label]                           [Value]
[=========------------------------------ ]
```

- Horizontal bar, 4-6px height, rounded-full.
- Fill color: semantic based on score (green > 0.7, amber > 0.4, red below).
- Background track: `rgba(255,255,255,0.06)`.
- Label left-aligned, value right-aligned, bar below.

### Status Badge (Inline)

```
* Connected     * Delayed     * Disconnected
```

- Small dot (6px, rounded-full) + text (12px).
- Dot color follows semantic palette.
- No background pill for inline status. Reserve pills for ladder/verification badges.

### CTA Block

- Card or section with `bg-elevated` or transparent, centered text.
- Headline: 20px, semibold, `text-primary`.
- Subtitle: 14px, `text-secondary`.
- Single button: solid `cta` fill, `cta-text`, rounded-lg, `px-6 py-3`.
- One action per block. No competing buttons.
- Calm language (see Copy & Tone).

### Strategy Card (Discovery)

```
+--------------------------------------+
|  Strategy Name              [Badge]  |
|  AS-XXXXXXXX . EURUSD . M15         |
|                                      |
|  PF: 1.85   DD: 12%   Trades: 450   |
|                                      |
|  [Ladder level pill]                 |
+--------------------------------------+
```

- Card: `bg-elevated`, `border-subtle`, rounded-xl.
- Name: `text-primary`, 16px, semibold. Meta line: `text-muted`, 12px.
- Stats: 13px, `text-secondary`, 3-4 key numbers.
- Entire card is a click target.
- Hover: border transitions to `border-default`.

---

## 9. Public Page Structure Patterns

These are canonical defaults for each page type. They define the recommended section order and content priority. Adjust as needed based on content requirements, but deviations should be intentional and justified.

### Homepage

**Priority: Explain what AlgoStudio is. Communicate the problem it solves. Establish credibility.**

```
1. Hero
   Positioning headline (monitoring/governance, not trading/building).
   One-liner subtitle. CTA.
   Optional: 2-3 aggregate platform metrics.

2. Problem
   3 pain points. "Is my strategy still working?" / "What happens when edge decays?" / "Can I prove my track record?"

3. Solution
   3 capability pillars: Monitor - Verify - Prove.
   Icon + heading + short description each.

4. How It Works
   3-4 step process. Connect - Monitor - Verify - Share.
   Minimal visual. No mock screenshots unless they add clarity.

5. Proof Layer
   Explain verification ladder.
   Show or link to a real proof page example.

6. Social Proof (if available)
   Aggregate stats only if real and verifiable.
   Omit entirely if no credible social proof exists.

7. CTA
   Repeated CTA block. Calm, professional.
```

Pricing information may be referenced briefly (e.g., "Free to start" in the hero) but the homepage should not include a full pricing comparison. Link to the dedicated pricing page instead.

### Pricing Page

**Priority: Clarity. What you get at each tier.**

```
1. Header
   "Pricing" + one-liner.

2. Plan comparison
   2-3 tier cards. Name, price, key limits, features. CTA per plan.

3. Feature matrix (optional)
   Full comparison table below cards. Checkmarks.

4. FAQ (optional)
   Collapsible, 4-6 questions.
```

### Proof Page

**Priority: Trust. This page exists to prove something to a skeptic.**

```
1. Hero card (name, badges, verdict, 3 key stats)
2. Freshness warnings
3. Risk disclaimer
4. Verification ladder
5. Share section
6. Backtest evaluation + Monte Carlo
7. Live track record + equity curve + risk metrics
8. Edge stability (drift, health scores)
9. Proof integrity (chain, hashes, download)
10. Footer
```

The proof page defines the canonical trust language for the product: how verification levels are presented, how verdicts are derived, how statistical evidence is displayed, and how proof integrity is communicated. These patterns should be referenced when similar data appears on other pages.

### Strategy Discovery Page

**Priority: Scannable comparison. Help users find credible strategies.**

```
1. Header with explanatory subtitle
2. Sort controls
3. Strategy list (table on desktop, cards on mobile)
4. Empty state
```

Search and filtering may be added when the volume of strategies justifies it. Start minimal.

### About Page

**Priority: What AlgoStudio is and why it exists.**

```
1. Hero with mission statement
2. Philosophy / approach
3. How it works (abbreviated)
4. Team (only if real)
5. CTA
```

No startup origin story. State the mission, explain the approach, link to deeper content.

---

## 10. Trust & Proof Visual Language

### The Four Semantic States

Every verification, status, and health indicator maps to one of four states:

| State               | Color           | Visual                    | Usage                                         |
| ------------------- | --------------- | ------------------------- | --------------------------------------------- |
| Verified / Passing  | `success` green | Filled dot, check icon    | Chain intact, health robust, level achieved   |
| Attention / At Risk | `warning` amber | Filled dot, alert icon    | Drift detected, degraded health, stale data   |
| Failed / Critical   | `danger` red    | Filled dot, x icon        | Chain broken, invalidated, critical incident  |
| Unknown / Pending   | `neutral` zinc  | Hollow dot, question icon | Awaiting data, in progress, not yet evaluated |

No other semantic states exist. Everything maps to these four.

### Verification Ladder

- Always horizontal, left-to-right progression: Submitted - Validated - Verified - Proven.
- Filled dots for completed levels, highlighted dot for current, hollow for future.
- Connector lines colored when the preceding level is completed.
- Always paired with a description of the current level. Never shown without context.
- Appears on every proof page. May appear in condensed form on strategy cards and discovery pages.

### Hash & Chain Display

- Hashes: monospace, truncated to 16 characters + `...`, with copy button.
- Chain length: plain number, never visualized as a chart.
- Chain integrity: binary pass/fail. Green check or red x. No partial states.

### Verdict Presentation

The verdict is the single-sentence trust summary derived from existing signals (ladder level, drift status, chain integrity). Rules:

- Displayed in a verdict box (tinted background, colored text).
- Always one sentence.
- Always factual. "Proven track record with sustained live performance." Not "This is a great strategy."
- Derived from existing data signals only. Never invented or approximated.

### Statistical Evidence Display

- Always show the basis: "Based on ~1,000 simulations", "450 trades evaluated".
- Never show a number without context for what it represents.
- Percentages: no space before `%`. Use `toFixed(1)` for percentages, `toFixed(2)` for ratios/factors.
- Monetary values: `$` prefix, `toFixed(2)`.
- Large numbers: `toLocaleString` for comma separators (1,234 not 1234).

### Governance Display

- Lifecycle phases (RUN, PAUSE, STOP): uppercase, monospace-adjacent styling.
- Phase transitions: timeline events, not state machine diagrams.
- Reason codes: always mapped to human-readable labels. Never expose raw enum values publicly.

---

## 11. Design Consistency Rules

### Background Usage

1. Every page uses `bg-primary` as the page background. No colored section backgrounds.
2. Cards use `bg-elevated`. This is the one card background.
3. Nested content within cards uses `bg-surface` or `bg-inset`.
4. Maximum nesting depth: 2 (page - card - inset). Avoid page - card - card - inset.

### Color Limits

5. Prefer no more than 2 semantic colors on a single card. If a card needs to show passing, failing, and at-risk states simultaneously, consider breaking it into separate cards.
6. Accent indigo is for interactive elements and brand identity. Not for data or status.
7. No gradients in the UI. Solid colors only. Subtle radial decorative elements (e.g., background orbs) are acceptable on the homepage hero only and should be very restrained.
8. Section differentiation comes from card elevation and spacing, not background color changes.

### Typography Limits

9. Maximum 3 font sizes per card.
10. Canonical body size is 14px. Deviations should be justified.
11. Uppercase is reserved for 11px labels.
12. No italic.

### Component Consistency

13. Stat tiles are the same component everywhere. Same padding, same sizes, same structure.
14. Badges follow one pattern: pill, tinted background, colored text/border.
15. CTA buttons follow one pattern: solid accent fill, white text, rounded-lg.
16. Section headings: 20px, bold, `text-primary`, with `space-xl` (32px) below before content.

### Border Rules

17. Cards always have a visible border (`border-subtle`). Borderless cards on dark backgrounds lack sufficient visual containment.
18. Left accent borders (3px) are reserved for verdict/alert cards. Not decorative.
19. Horizontal rules (`border-t`) are used inside cards to separate sub-sections. Not between cards.

### Spacing Defaults

20. Section gap: 48px as the canonical default. Tighter (32px) or looser (64px) grouping is acceptable when content relationships demand it.
21. Card gap within a section: 12-16px.
22. Card padding: 20px as the canonical default.

---

## 12. Screenshot & Shareability

### OG Image Standards

- Every public proof page has a dynamic OG image (1200x630).
- OG image uses the same color system: `bg-primary` outer, `bg-elevated` card.
- Content: strategy name, ladder badge, verdict, up to 3 stats, AlgoStudio branding.
- Strategy name and at least one stat should be legible when the image is displayed at 300px wide (Reddit thumbnail size).

### Screenshot-Friendly Layout

1. **Self-contained hero.** The hero card of every proof page must be meaningful when cropped. A screenshot of just the hero communicates: what strategy, what level, what verdict, what key numbers.

2. **Information inside bordered cards.** When a card is screenshotted, the border provides visual containment and context.

3. **High contrast for important values.** White text on dark backgrounds. Semantic colors for status values. Never low-contrast text for important numbers.

4. **Front-loaded importance.** The most critical trust information appears above the fold. A screenshot of the top of any proof page should convey the core message.

5. **Left-accent borders as visual anchors.** A green left border on a proof card in a Discord embed or Twitter screenshot immediately signals "passing/verified" before text is read.

### Social Platform Behavior

| Platform  | Key consideration                                                                             |
| --------- | --------------------------------------------------------------------------------------------- |
| X/Twitter | Large card preview. OG image dominates. Title and description must be strong standalone text. |
| Discord   | Dark embed blends with Discord dark theme. Card borders provide visual separation.            |
| Reddit    | Small thumbnail. Strategy name and key stat must be legible at reduced size.                  |
| Telegram  | Inline preview similar to Discord.                                                            |
| Forums    | Often URL-only with OG title/description. Metadata text must stand alone without the image.   |

### Metadata Rules

- Title: `{Name} -- {Level} Strategy | AlgoStudio`
- Description: data-rich when stats exist, strong generic when they don't.
- No emojis in metadata.
- No CTA language in metadata.
- Professional, factual, concise.
