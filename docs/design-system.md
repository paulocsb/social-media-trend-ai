# Design System

This document defines the visual language for the Instagram Trend Intelligence Platform.
It is the authoritative reference for all UI decisions — typography, color, spacing,
components, and interaction patterns. Follow it exactly when building or reviewing UI.

---

## 1. Visual Theme & Atmosphere

The design philosophy is reductive: every pixel serves the content. The interface retreats
until it becomes invisible, letting data and actions take center stage. This is minimalism
as a functional choice, not an aesthetic preference.

**Key characteristics:**
- Vast expanses of near-white (light) or pure black (dark) as cinematic backdrops
- A single chromatic accent color reserved exclusively for interactive elements
- SF Pro Display for large text, SF Pro Text for body — optical sizing as philosophy
- Tight headline line-heights (1.07–1.14) creating billboard-like impact
- Generous whitespace between sections; compression within text blocks
- Frosted glass surfaces (backdrop-filter blur) for panels, sidebar, and modals
- Generous border radii (12–24px on containers, 9999px for pills) creating a spatial, tactile feel
- Solid color backgrounds only — no gradients, textures, or decorative patterns

---

## 2. Color Palette

### Primary surfaces

| Role | Light | Dark |
|---|---|---|
| Page background | `#f5f5f7` | `#000000` |
| Surface (cards) | `#ffffff` | `#1c1c1e` |
| Surface raised | `#edede0` | `#2c2c2e` |
| Primary text | `#1d1d1f` | `#ffffff` |
| Secondary text | `rgba(0,0,0,0.80)` | `rgba(235,235,245,0.60)` |
| Tertiary text | `rgba(0,0,0,0.48)` | `rgba(235,235,245,0.35)` |

### Interactive — the only chromatic color

| Role | Value | Use |
|---|---|---|
| Accent (primary CTA, focus, active) | `#0071e3` | Buttons, links, focus rings, active nav |
| Accent hover | `#0077ed` | Hover state of accent elements |
| Accent light | `rgba(0,113,227,0.12)` | Ghost button hover, light tint backgrounds |

**Accent rule:** `#0071e3` is the ONLY chromatic color. Every other color is neutral or semantic.
Use it exclusively for interactive elements — buttons, active states, links, focus rings, icons
that signal an action. Never use it decoratively.

### Semantic colors (status only, never as accent)

| Role | Light | Dark |
|---|---|---|
| Success | `#28cd41` | `#30d158` |
| Warning | `#ff9500` | `#ff9f0a` |
| Destructive | `#ff3b30` | `#ff453a` |

### Borders & surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `--border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | Standard borders |
| `--border-subtle` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.05)` | Dividers, subtle separators |
| `--surface-inset` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.05)` | Input backgrounds, inset areas |
| `--surface-tint` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` | Chip/tag backgrounds |
| `--surface-strong` | `rgba(0,0,0,0.14)` | `rgba(255,255,255,0.20)` | Neutral badge backgrounds |
| `--surface-hover` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.06)` | Row hover states |
| `--surface-active` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.12)` | Active/selected states |

---

## 3. Typography

### Font families

Two optical variants — **never mix** within the same text element.

| Tailwind class | Font | When to use |
|---|---|---|
| `font-display` | SF Pro Display | Text **≥20px** — headlines, page titles, large UI labels |
| `font-sans` (default) | SF Pro Text | Text **<20px** — body copy, labels, UI elements, captions |
| `font-mono` | SF Mono | Code, monospaced data |

Fallback chain: `SF Pro Icons, -apple-system, BlinkMacSystemFont, Helvetica Neue, Helvetica, Arial, sans-serif`

SF Pro Display has wider letter spacing and thinner strokes optimised for large sizes.
SF Pro Text is tighter and sturdier for reading at small sizes. The switch at 20px is non-negotiable.

### Type scale

| Utility | Font variant | Size | Weight | Line-height | Letter-spacing | Use |
|---|---|---|---|---|---|---|
| `.text-headline-xl` | display | 48px | 600 | 52px (1.07) | −0.28px | Major heroes |
| `.text-headline-lg` | display | 40px | 600 | 44px (1.10) | −0.28px | Section heroes |
| `.text-headline-md` | display | 32px | 600 | 36px (1.12) | −0.28px | Feature headings |
| `.text-title-xl` | display | 28px | 600 | 34px (1.14) | −0.28px | Page titles `<h1>` |
| `.text-title-lg` | display | 24px | 600 | 30px (1.25) | −0.374px | Sub-page titles |
| `.text-title` | sans | 18px | 600 | auto | −0.374px | Section headings `<h2>` |
| `.text-body-xl` | display | 20px | 400 | 28px (1.40) | −0.374px | Large introductory body |
| `.text-body-lg` | sans | 18px | 400 | 26px (1.44) | −0.374px | Large descriptions |
| `.text-body` | sans | 14px | 400 | 20px (1.43) | −0.224px | Standard body text |
| `.text-body-sm` | sans | 12px | 400 | 18px (1.50) | −0.12px | Small body / metadata |
| `.text-caption` | sans | 11px | 400 | 16px (1.45) | −0.12px | Captions, timestamps (secondary color) |
| `.text-label` | sans | 11px | 500 | auto | wider (uppercase) | Section labels (tertiary color) |

### Typography principles

- **Optical sizing is mandatory:** `font-display` at ≥20px, `font-sans` below. Never reverse this.
- **Negative tracking at every size:** headlines at −0.28px, body at −0.374px, small at −0.224px, micro at −0.12px. Positive letter-spacing is never used.
- **Weight restraint:** The scale is 400 (regular) → 600 (semibold). Weight 700 is used only for rare bold card titles. Never use 800 or 900.
- **Headline line-height is tight:** 1.07–1.14 for headlines creates compressed, billboard-like impact. Body opens to 1.43–1.50 for readable rhythm.
- **No center-aligned body text:** Headlines may be centered; body copy is always left-aligned.

---

## 4. Spacing

Base unit: **8px**. The scale is dense at small sizes for micro-adjustments, then jumps in larger steps.

Common values: `2px, 4px, 6px, 8px, 10px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px`

In Tailwind terms: `gap-1 (4px), gap-2 (8px), gap-3 (12px), gap-4 (16px), gap-5 (20px), gap-6 (24px), gap-8 (32px)`

**Section spacing:** `space-y-6` between sections within a page. `space-y-8` between major page areas.

---

## 5. Border Radius

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 8px | Small UI elements, inner buttons |
| `rounded` / `rounded-md` | 12px | Default — cards, inputs, dropdowns |
| `rounded-lg` | 16px | Panels, larger cards |
| `rounded-xl` | 20px | Section cards, grid items |
| `rounded-2xl` | 24px | Modals, large feature panels |
| `rounded-full` | 9999px | Pills, chips, tags, circular icon buttons |

Large radii (20–24px) on containers create a spatial, tactile feel. Pills (9999px) are the
signature shape for CTAs, status badges, and filter controls.

---

## 6. Elevation & Shadows

**One shadow per element — never stack multiple shadow layers.**

Shadow is used sparingly. Most elements have no shadow at all — elevation comes from
background color contrast. When shadow is needed, it is soft, wide, and diffused —
mimicking a studio light casting a natural shadow beneath a physical object.

| Class | Value | Use |
|---|---|---|
| `.glass` / `shadow-card` | `rgba(0,0,0,0.10) 3px 5px 30px 0px` (light) | Standard glass panels |
| `.glass-raised` / `shadow-panel` | `rgba(0,0,0,0.14) 0px 8px 40px 0px` (light) | Elevated panels, focused cards |
| `shadow-modal` | `rgba(0,0,0,0.5) 0px 24px 80px 0px` | Full overlay modals |
| `shadow-subtle` | `0 2px 8px rgba(0,0,0,0.3)` | Very light lift (rare) |

**Never use:** `shadow-glow`, `shadow-glow-sm` — glow/chromatic shadows are not part of this system.

---

## 7. Glass Surfaces

Glass is the primary surface treatment. It adapts automatically to light and dark mode via CSS variables.

```css
/* Standard glass — navigation, sidebar, status bars */
.glass {
  background: var(--glass-bg);                        /* rgba(255,255,255,0.72) light / rgba(28,28,30,0.72) dark */
  border: 1px solid var(--glass-border);              /* rgba(0,0,0,0.08) / rgba(255,255,255,0.08) */
  backdrop-filter: saturate(180%) blur(20px);
  box-shadow: var(--glass-shadow);
}

/* Raised glass — cards, panels, active content areas */
.glass-raised {
  background: var(--glass-raised-bg);                 /* rgba(255,255,255,0.88) light / rgba(44,44,46,0.82) dark */
  border: 1px solid var(--glass-border);
  backdrop-filter: saturate(180%) blur(24px);
  box-shadow: var(--glass-raised-shadow);
}

/* Sidebar */
.glass-sidebar {
  background: var(--glass-sidebar-bg);
  border-right: 1px solid var(--glass-sidebar-border);
  backdrop-filter: saturate(180%) blur(24px);
}
```

`.card` = `.glass.rounded-xl` — the standard card component.

---

## 8. Components

### Button

```tsx
// Variants: primary | secondary | ghost | destructive | outline
// Sizes: sm (h-7 px-3 text-13px) | md (h-9 px-4 text-15px, default) | lg (h-11 px-5 text-17px) | icon (h-8 w-8)

<Button variant="primary">Save</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="ghost">Learn more</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Export</Button>
```

**Specification:**

| Variant | Background | Text | Border |
|---|---|---|---|
| primary | `bg-accent` | `text-white font-medium` | none |
| secondary | `.glass` | `text-primary` | `glass-border` |
| ghost | transparent | `text-accent` | none |
| destructive | `bg-destructive` | `text-white` | none |
| outline | `bg-surface-raised` | `text-primary` | `border-border` |

**Rules — enforced in `button.tsx`:**
- No `active:scale-*` on any variant — state changes are color-only
- No glow shadows on any variant
- Primary uses `font-medium` (not semibold or bold)
- Disabled: `opacity-40 pointer-events-none`
- Hover: background shifts slightly; no border appears where there was none

### Badge

```tsx
// Variants: default | secondary | success | warning | destructive | outline
<Badge variant="success">completed</Badge>
<Badge variant="warning">partial</Badge>
<Badge variant="destructive">high</Badge>
<Badge variant="secondary">low</Badge>
<Badge variant="default">active</Badge>
```

All badges: `rounded-full px-2 py-0.5 text-[12px] font-medium`. No borders except `outline` variant.
Background is always a tinted version of the semantic color (`/10`) so badges never overpower surrounding content.

### Card

```tsx
<Card>                                  // .glass.rounded-xl
  <CardHeader>                          // flex justify-between px-5 pt-4 pb-3
    <CardTitle>Title</CardTitle>        // text-[14px] font-semibold
    <button className="text-accent text-[12px]">Add</button>
  </CardHeader>
  <CardContent>                         // px-5 pb-4
    content
  </CardContent>
</Card>
```

### IconButton

```tsx
// Variants: default | destructive
<IconButton icon={Pencil} onClick={...} title="Edit" />
<IconButton icon={Trash2} variant="destructive" onClick={...} title="Delete" />
```

`h-8 w-8 rounded-full border` — compact circular action button.

### Input

```tsx
<Input
  placeholder="Search..."
  value={val}
  onChange={(e) => setVal(e.target.value)}
/>
```

`rounded-md bg-surface-inset border border-border-subtle` with focus ring on `:focus-visible`.

---

## 9. Layout Principles

### Page structure

Every page root:
```tsx
<div className="space-y-6 animate-fade-in">
  <h1 className="text-title-xl">Page Title</h1>
  {/* sections */}
</div>
```

### Content width

Max content width: `max-w-5xl mx-auto px-8 py-8` (set in `AppLayout.tsx`). Never override this per-page.

### Grid

- 2-col: `grid grid-cols-2 gap-5`
- 3-col: `grid grid-cols-3 gap-3` (post grid)
- Never exceed 3 columns within the content area

### Whitespace philosophy

Each section breathes. `space-y-6` between sections. Within a section, content is tightly set
(negative tracking, tight line-heights) while the space around it is generous.
This tension — dense text, open surroundings — creates visual hierarchy through rhythm alone.

---

## 10. Common UI Patterns

### Section heading
```tsx
<div className="flex items-center gap-2 mb-3">
  <Icon className="w-3.5 h-3.5 text-accent" />
  <h2 className="text-title">Section Name</h2>
</div>
```

### Error banner
```tsx
<div className="rounded-xl bg-destructive/10 border border-destructive/25 px-4 py-3 flex items-start gap-3">
  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
  <p className="text-[13px] text-destructive">{parseError(error)}</p>
</div>
```

### Success inline feedback
```tsx
<p className="text-[12px] text-success font-medium">Saved ✓</p>
```

### Loading spinner
```tsx
<div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
```

### Skeleton shimmer
```tsx
<div className="skeleton h-8 rounded-full w-24" />
// .skeleton applies a left-to-right shimmer gradient animation
```

### Empty state
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="w-8 h-8 text-tertiary mb-3" />
  <p className="text-[14px] font-medium text-secondary">No items yet</p>
  <p className="text-caption mt-1">Do X to get started.</p>
</div>
```

### Modal shell
```tsx
<div
  className="fixed inset-0 z-50 flex items-center justify-center p-4"
  style={{ background: 'rgba(0,0,0,0.7)' }}
  onClick={(e) => e.target === e.currentTarget && onClose()}
>
  <div className="glass-raised rounded-2xl w-full max-w-sm shadow-modal animate-scale-in">
    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-subtle">
      <p className="text-[15px] font-semibold text-primary">{title}</p>
      <button onClick={onClose} className="p-2 rounded-full border bg-surface-inset border-border-subtle text-tertiary hover:text-primary transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
</div>
```

### Accent pill (status / CTA link)
```tsx
<div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-accent/10 border border-accent/25 text-accent">
  <Sparkles className="w-3 h-3" />
  Ready
</div>
```

### Glass status bar (two cells)
```tsx
<div className="glass rounded-2xl border border-border-subtle overflow-hidden">
  <div className="flex divide-x divide-border-subtle">
    <div className="flex-1 px-5 py-4 flex items-center gap-3 min-w-0">
      {/* cell 1 */}
    </div>
    <div className="flex-1 px-5 py-4 flex items-center gap-3 min-w-0">
      {/* cell 2 */}
    </div>
  </div>
</div>
```

### Hashtag / tag chip
```tsx
<div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-medium bg-surface-tint border-border-subtle text-primary">
  <ScoreDot score={score} />
  <span>#{tag}</span>
  <span className="text-[11px] font-semibold tabular-nums text-success">{score}</span>
</div>
```

---

## 11. Animations

| Class | Keyframes | Use |
|---|---|---|
| `animate-fade-in` | `opacity 0→1` + `translateY 6px→0`, 0.22s ease-out | Page / section mount |
| `animate-scale-in` | `scale 0.96→1` + `opacity 0→1`, 0.2s ease-out | Modal open |
| `animate-spin` | 360° rotation, linear | Loading spinners |
| `animate-spin-slow` | 360° rotation, 1.4s linear | Slow decorative spin |
| `animate-pulse-dot` | opacity + scale pulse, 1.2s | Live status indicator dots |
| `animate-shimmer` | gradient sweep left→right, 1.6s | Skeleton loaders (via `.skeleton`) |

---

## 12. Do's and Don'ts

### Do
- Use `font-display` for all text at 20px and above
- Apply negative letter-spacing at every text size — never positive tracking
- Use `#0071e3` accent exclusively for interactive elements
- Use a single shadow layer per element — one value, never a comma-separated list
- Use `rounded-2xl` (24px) for modals, `rounded-xl` (20px) for cards, `rounded-full` for pills
- Use `font-semibold` (600) for headlines and titles
- Use `font-medium` for primary button text
- Use glass surfaces (`backdrop-filter: saturate(180%) blur(20px)`) for the sidebar and floating panels
- Keep semantic colors (success, warning, destructive) for status only — never as accent
- Compress headline line-heights to 1.07–1.14 for billboard-like impact

### Don't
- Don't use `font-display` below 20px or `font-sans` at 20px and above
- Don't introduce additional chromatic colors beyond the accent and semantic set
- Don't use `shadow-glow` or any glow/chromatic shadow
- Don't use `active:scale-*` on buttons — color change only
- Don't use `font-bold` (700) on headlines — maximum is `font-semibold` (600)
- Don't use positive letter-spacing on any text
- Don't add textures, patterns, or gradients to backgrounds — solid colors only
- Don't stack multiple shadow layers on a single element
- Don't center-align body text — only headlines may be centered
- Don't use inline styles for colors — always use Tailwind tokens

---

## 13. Focus & Accessibility

Global focus ring (defined in `index.css`, applies to all interactive elements):
```css
:focus-visible {
  outline: 2px solid #0071e3;
  outline-offset: 2px;
  border-radius: 6px;
}
```

- All buttons, links, and form controls must be keyboard-reachable
- Touch targets minimum 44×44px (buttons use `h-9 px-4` = ~36px height at md; use `h-11` for primary CTAs)
- Never suppress the focus ring for mouse users unless the element has a visible pressed/active state
- Color is never the only indicator of state — always pair with text, icon, or shape change
