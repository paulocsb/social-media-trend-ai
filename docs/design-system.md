# Design System

> Apple Design principles (see `/Users/paulocsb/Workspace/dev/awesome-design-md/design-md/apple/Design.md`)
> applied to a Vision Pro–feel dashboard. Apple Web typography and colors; Vision Pro border radii.

---

## Font Families

Two optical variants — **never mix** within the same text element.

| Class | Font | Use when |
|---|---|---|
| `font-display` | SF Pro Display | Text ≥20px (headlines, titles, large UI) |
| `font-sans` (default) | SF Pro Text | Text <20px (body, labels, UI copy) |

**Fallback chain (both):** `SF Pro Icons, -apple-system, BlinkMacSystemFont, Helvetica Neue, Helvetica, Arial, sans-serif`

`font-mono`: `SF Mono, ui-monospace, SFMono-Regular, Menlo, monospace`

---

## Typography Scale

| Utility class | Font | Size | Weight | Line-height | Tracking | Use |
|---|---|---|---|---|---|---|
| `.text-headline-xl` | display | 48px | 600 | 52px | −0.28px | Major page heroes |
| `.text-headline-lg` | display | 40px | 600 | 44px | −0.28px | Section heroes |
| `.text-headline-md` | display | 32px | 600 | 36px | −0.28px | Feature headings |
| `.text-title-xl` | display | 28px | 600 | 34px | −0.28px | Page titles (`<h1>`) |
| `.text-title-lg` | display | 24px | 600 | 30px | −0.374px | Sub-page titles |
| `.text-title` | sans | 18px | 600 | auto | −0.374px | Section headings (`<h2>`) |
| `.text-body-xl` | display | 20px | 400 | 28px | −0.374px | Large body |
| `.text-body-lg` | sans | 18px | 400 | 26px | −0.374px | Large descriptions |
| `.text-body` | sans | 14px | 400 | 20px | −0.224px | Standard body |
| `.text-body-sm` | sans | 12px | 400 | 18px | −0.12px | Small body |
| `.text-caption` | sans | 11px | 400 | 16px | −0.12px | Captions, metadata (secondary color) |
| `.text-label` | sans | 11px | 500 | — | wider | Uppercase section labels (tertiary color) |

**Rule:** Apply negative tracking at all sizes — Apple tracks tight universally.

---

## Color Tokens

### CSS custom properties (defined in `index.css`)

**Light mode (`:root`)**

| Token | Value | Use |
|---|---|---|
| `--background` | `245 245 247` (#f5f5f7) | Page background |
| `--surface` | `255 255 255` (#ffffff) | Card / panel surface |
| `--surface-raised` | `237 237 240` | Elevated surface |
| `--primary` | `29 29 31` (#1d1d1f) | Primary text |
| `--secondary` | `rgba(0,0,0,0.80)` | Secondary text |
| `--tertiary` | `rgba(0,0,0,0.48)` | Tertiary, disabled, placeholder |
| `--border` | `rgba(0,0,0,0.08)` | Standard borders |
| `--border-subtle` | `rgba(0,0,0,0.04)` | Subtle dividers |
| `--surface-inset` | `rgba(0,0,0,0.04)` | Input backgrounds, inset areas |
| `--surface-tint` | `rgba(0,0,0,0.06)` | Chip/tag backgrounds |
| `--surface-strong` | `rgba(0,0,0,0.14)` | Neutral badge backgrounds |
| `--glass-shadow` | `rgba(0,0,0,0.10) 3px 5px 30px` | `.glass` elevation |
| `--glass-raised-shadow` | `rgba(0,0,0,0.14) 0px 8px 40px` | `.glass-raised` elevation |

**Dark mode (`.dark`)**

| Token | Value |
|---|---|
| `--background` | `0 0 0` (#000000) |
| `--surface` | `28 28 30` (#1c1c1e) |
| `--surface-raised` | `44 44 46` (#2c2c2e) |
| `--primary` | `255 255 255` |
| `--secondary` | `rgba(235,235,245,0.60)` |
| `--tertiary` | `rgba(235,235,245,0.35)` |
| `--glass-shadow` | `rgba(0,0,0,0.22) 3px 5px 30px` |
| `--glass-raised-shadow` | `rgba(0,0,0,0.36) 0px 8px 40px` |

### Tailwind color aliases

```js
accent: { DEFAULT: '#0071e3', hover: '#0077ed', light: 'rgba(0,113,227,0.12)' }
success:     '#28cd41'  // dark: '#30d158'
warning:     '#ff9500'  // dark: '#ff9f0a'
destructive: '#ff3b30'  // dark: '#ff453a'
```

**Accent rule:** `#0071e3` is the ONLY chromatic color in the interface. Use it ONLY for interactive elements (buttons, active states, links, focus). Never use it for decorative purposes.

---

## Border Radius (Vision Pro scale)

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 8px | Small elements |
| `rounded` / `rounded-md` | 12px | Default cards, inputs |
| `rounded-lg` | 16px | Panels |
| `rounded-xl` | 20px | Cards, modals inner |
| `rounded-2xl` | 24px | Modals, large panels |
| `rounded-full` | 9999px | Pills, chips, circular buttons |

---

## Elevation & Shadows

**One shadow per element — never stack layers.**

| Class | Shadow | Use |
|---|---|---|
| `.glass` | `var(--glass-shadow)` | Standard glass cards |
| `.glass-raised` | `var(--glass-raised-shadow)` | Elevated modals, panels |
| `shadow-card` | same as `--glass-shadow` | Tailwind alias |
| `shadow-panel` | same as `--glass-raised-shadow` | Tailwind alias |
| `shadow-modal` | `rgba(0,0,0,0.5) 0px 24px 80px` | Overlay modals |
| `shadow-subtle` | `0 2px 8px rgba(0,0,0,0.3)` | Very light lift |

**Never use:** `shadow-glow`, `shadow-glow-sm` — glow effects are not Apple web style.

---

## Glass Utilities

```css
.glass        { background: var(--glass-bg); border: 1px solid var(--glass-border);
                backdrop-filter: saturate(180%) blur(20px); box-shadow: var(--glass-shadow); }

.glass-raised { background: var(--glass-raised-bg); border: 1px solid var(--glass-border);
                backdrop-filter: saturate(180%) blur(24px); box-shadow: var(--glass-raised-shadow); }

.glass-sidebar { background: var(--glass-sidebar-bg); border-right: 1px solid var(--glass-sidebar-border);
                 backdrop-filter: saturate(180%) blur(24px); }
```

`.card` is an alias for `.glass.rounded-xl`.

---

## Components

### Button

```tsx
// Variants: primary | secondary | ghost | destructive | outline
// Sizes: sm (h-7) | md (h-9, default) | lg (h-11) | icon (h-8 w-8)

<Button variant="primary">Save</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="destructive">Delete</Button>
```

**Rules:**
- Primary: `bg-accent text-white font-medium` — no glow, no scale on active
- No `active:scale-*` on any variant
- No `shadow-glow` or `shadow-glow-sm`
- Disabled: `opacity-40 pointer-events-none`

### Badge

```tsx
// Variants: default | secondary | success | warning | destructive | outline
<Badge variant="success">completed</Badge>
<Badge variant="warning">partial</Badge>
<Badge variant="destructive">failed</Badge>
<Badge variant="secondary">low</Badge>  // neutral
```

All badges: `rounded-full px-2 py-0.5 text-[12px] font-medium`. No borders except `outline` variant.

### Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <button className="text-accent text-[12px]">Action</button>
  </CardHeader>
  <CardContent>content</CardContent>
</Card>
```

### IconButton

```tsx
// variants: default | destructive
<IconButton icon={Trash2} variant="destructive" onClick={...} title="Delete" />
```

### Input

```tsx
<Input placeholder="..." value={val} onChange={(e) => setVal(e.target.value)} />
```

---

## Common UI Patterns

### Page root
```tsx
<div className="space-y-6 animate-fade-in">
  <h1 className="text-title-xl">Page Title</h1>
  ...
</div>
```

### Section heading
```tsx
<div className="flex items-center gap-2 mb-3">
  <Hash className="w-3.5 h-3.5 text-accent" />
  <h2 className="text-title">Section</h2>
</div>
```

### Error banner
```tsx
<div className="rounded-xl bg-destructive/10 border border-destructive/25 px-4 py-3 flex items-start gap-3">
  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
  <p className="text-[13px] text-destructive">{parseError(error)}</p>
</div>
```

### Loading spinner
```tsx
<div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
```

### Skeleton shimmer
```tsx
<div className="skeleton h-8 rounded-full w-24" />  // .skeleton applies shimmer animation
```

### Modal shell
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
     onClick={(e) => e.target === e.currentTarget && onClose()}>
  <div className="glass-raised rounded-2xl w-full max-w-sm shadow-modal animate-scale-in">
    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-subtle">
      <p className="text-[15px] font-semibold">{title}</p>
      <button onClick={onClose}>...</button>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
</div>
```

### Status indicator (accent pill)
```tsx
<div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-accent/10 border border-accent/25 text-accent">
  <Sparkles className="w-3 h-3" />
  Ready
</div>
```

### Two-column status bar
```tsx
<div className="glass rounded-2xl border border-border-subtle overflow-hidden">
  <div className="flex divide-x divide-border-subtle">
    <div className="flex-1 px-5 py-4 flex items-center gap-3">...</div>
    <div className="flex-1 px-5 py-4 flex items-center gap-3">...</div>
  </div>
</div>
```

---

## Animations

| Class | Effect | Use |
|---|---|---|
| `animate-fade-in` | opacity 0→1 + translateY 6px→0 | Page/section mount |
| `animate-scale-in` | scale 0.96→1 + opacity | Modal open |
| `animate-spin` | 360° rotation | Loading spinners |
| `animate-pulse-dot` | opacity + scale pulse | Live status dots |
| `animate-shimmer` | gradient sweep | Skeleton loaders (via `.skeleton`) |

---

## Focus & Accessibility

Global focus ring (defined in `index.css`):
```css
:focus-visible { outline: 2px solid #0071e3; outline-offset: 2px; border-radius: 6px; }
```

All interactive elements must be reachable by keyboard and show the focus ring.
