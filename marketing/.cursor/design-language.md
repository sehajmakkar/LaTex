## Cursor Prompt for TeXel Dashboard Design Migration

> **Apply the following design system from the TeXel landing page to this dashboard. Match the fonts, colors, spacing, component styles, and visual tone exactly. The landing page is a dark, monochromatic zinc-based design with subtle gradients and premium feel.**

---

### 1. FONTS

Install and configure these 3 fonts:

- **Primary body font:** `Manrope` (Google Font, loaded via `next/font/google` with variable `--font-manrope`). Used for all body text, paragraphs, UI elements.
- **Display/hero font:** `Cal Sans` (loaded via Google Fonts stylesheet: `https://fonts.googleapis.com/css2?family=Cal+Sans&display=swap`). Used for large headings, brand name, pricing numbers, metric values. Applied via class `.font-display` or CSS `font-family: "Cal Sans", var(--font-manrope), system-ui, sans-serif`.
- **Heading/label font:** `Instrument Sans` (loaded via Google Fonts stylesheet: `https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap`). Used for card titles, section subheadings, navigation labels. Applied via class `.font-heading` or CSS `font-family: "Instrument Sans", var(--font-manrope), system-ui, sans-serif`.
- **Monospace:** `Geist Mono` for code/keyboard shortcuts.

In `layout.tsx`, set `<html className="dark">` and apply `<body className="${manropeVariable} font-sans antialiased bg-zinc-950 text-zinc-100">`.

Add these custom CSS classes:

```css
.font-display {
  font-family: "Cal Sans", var(--font-manrope), system-ui, sans-serif;
}
.font-heading {
  font-family: "Instrument Sans", var(--font-manrope), system-ui, sans-serif;
}
```

And in the Tailwind theme:

```css
--font-sans: var(--font-manrope), "Geist", system-ui, sans-serif;
--font-mono: "Geist Mono", monospace;
--font-display: "Cal Sans", var(--font-manrope), system-ui, sans-serif;
--font-heading: "Instrument Sans", var(--font-manrope), system-ui, sans-serif;
```

---

### 2. COLOR PALETTE (oklch, dark-first)

The entire design uses a **monochromatic zinc palette** with NO brand accent color — just shades of gray/zinc. Replace your current color tokens with these exact CSS custom properties:

```css
:root {
  --background: oklch(0.09 0 0); /* Near-black (#111) */
  --foreground: oklch(0.95 0 0); /* Near-white */
  --card: oklch(0.12 0 0); /* Slightly lighter than bg */
  --card-foreground: oklch(0.95 0 0);
  --popover: oklch(0.12 0 0);
  --popover-foreground: oklch(0.95 0 0);
  --primary: oklch(0.95 0 0); /* White-ish (for primary buttons) */
  --primary-foreground: oklch(0.09 0 0); /* Dark text on primary */
  --secondary: oklch(0.18 0 0); /* Dark gray */
  --secondary-foreground: oklch(0.95 0 0);
  --muted: oklch(0.18 0 0);
  --muted-foreground: oklch(0.55 0 0); /* Mid-gray for secondary text */
  --accent: oklch(0.18 0 0);
  --accent-foreground: oklch(0.95 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.22 0 0); /* Very subtle borders */
  --input: oklch(0.22 0 0);
  --ring: oklch(0.45 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0 0);
}
```

The `.dark` class uses the same values (the site is dark-mode only).

**Key Tailwind zinc mapping used throughout all components:**

- Page background: `bg-zinc-950`
- Primary text: `text-zinc-100`
- Secondary/body text: `text-zinc-500`
- Tertiary/faded text: `text-zinc-400`
- Very faded text: `text-zinc-600`
- Card backgrounds: `bg-zinc-900/50`
- Card borders: `border-zinc-800/50`
- Card hover borders: `hover:border-zinc-700/50`
- Icon containers: `bg-zinc-800`
- Icon colors: `text-zinc-400` → `group-hover:text-zinc-200`
- Dividers/separators: `border-zinc-900` or `border-zinc-800/50`
- Input/inner panels: `bg-zinc-950` with `border-zinc-800`

---

### 3. COMPONENT STYLING PATTERNS

**Cards:**

- `rounded-2xl` border radius
- `border-zinc-800/50 bg-zinc-900/50` base
- `hover:border-zinc-700/50 transition-all duration-300` on hover
- Padding: `p-6` or `p-8`
- No shadows — rely on border/background contrast

**Buttons:**

- Primary CTA: `rounded-full bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200` (white pill button)
- Secondary/ghost: `text-zinc-400 hover:text-zinc-100 transition-colors` with no background
- Destructive uses the oklch destructive token

**Navigation bar:**

- `rounded-full bg-zinc-900/70 border border-zinc-800/50 backdrop-blur-md`
- Floating/fixed at top with `p-4`
- Nav links: `text-sm rounded-full text-zinc-400 hover:text-zinc-100`
- CTA button in nav: `rounded-full bg-zinc-100 text-zinc-900 font-medium`

**Badges/Pills:**

- `rounded-full border border-zinc-800 py-1.5 px-4 text-sm text-zinc-400`
- Or: `bg-zinc-900/80 border border-zinc-800` with icon

**Section layout:**

- Max-width: `max-w-5xl mx-auto`
- Section padding: `px-6 py-24`
- Section headers pattern:
  - Small label: `text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4`
  - Title: `font-display text-3xl md:text-4xl font-bold text-zinc-100 mb-4`
  - Description: `text-zinc-500 max-w-xl mx-auto text-balance`

**Icon containers (in feature cards):**

- `w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center`
- Icons: `w-5 h-5 text-zinc-400`

**Gradient text:**

- `bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 bg-clip-text text-transparent`

**Progress bars:**

- Track: `h-2 bg-zinc-800 rounded-full`
- Fill: `bg-gradient-to-r from-zinc-500 to-zinc-300 rounded-full`

**Pricing highlighted card (inverted):**

- `bg-zinc-100 border-zinc-100` with `text-zinc-900` text (white card among dark ones)

---

### 4. TYPOGRAPHY SCALE & USAGE

| Element              | Classes                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Page hero headline   | `font-display font-bold text-5xl md:text-7xl text-zinc-100`                                                  |
| Hero subtitle        | `text-3xl md:text-5xl bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 bg-clip-text text-transparent` |
| Section titles       | `font-display text-3xl md:text-4xl font-bold text-zinc-100`                                                  |
| Card titles          | `font-heading font-semibold text-zinc-100` (default size)                                                    |
| Card descriptions    | `text-zinc-500 text-sm`                                                                                      |
| Section descriptions | `text-zinc-500 text-lg text-balance`                                                                         |
| Body/paragraph       | `text-lg md:text-xl text-zinc-500 leading-relaxed text-balance`                                              |
| Small labels         | `text-sm font-medium text-zinc-500 uppercase tracking-wider`                                                 |
| Metric values        | `font-display text-3xl md:text-4xl font-bold text-zinc-100`                                                  |
| Metric labels        | `text-sm font-medium text-zinc-400`                                                                          |
| Footer links         | `text-sm text-zinc-500 hover:text-zinc-300`                                                                  |
| Brand name           | `font-display text-xl font-semibold text-zinc-100`                                                           |

---

### 5. ANIMATIONS & INTERACTIONS (Framer Motion)

The landing page uses `framer-motion` extensively:

- **Scroll reveal:** `initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}` with staggered delays
- **Hover effects:** Cards use `group` hover patterns — `group-hover:text-zinc-200`, `group-hover:translate-x-1`
- **Button hover:** `hover:scale-105 active:scale-95 transition-transform duration-300`
- **Pulsing elements:** `animate={{ opacity: [0.5, 1, 0.5] }}` with `repeat: Infinity`
- **Progress bars animate on scroll:** `initial={{ width: "0%" }} whileInView={{ width: "99.9%" }}`
- **Transition timing:** `duration: 0.5` for most reveals, `ease: [0.16, 1, 0.3, 1]` for smooth easing

---

### 6. SPECIAL EFFECTS

- **Liquid metal border** on CTA buttons using `@paper-design/shaders-react` — a WebGL animated metallic border effect wrapping rounded-full buttons
- **Smooth scrolling** via `@studio-freight/react-lenis` (Lenis provider wrapping the app)
- **Backdrop blur** on nav: `backdrop-blur-md`
- **Gradient overlays:** `bg-gradient-to-b from-zinc-900/50 via-transparent to-transparent`
- **Mask gradients** for scrolling content: `[mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]`
- **Scrollbar hidden globally** via CSS:
  ```css
  html::-webkit-scrollbar {
    display: none;
  }
  html {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  ```

---

### 7. KEY DEPENDENCIES

```
framer-motion (or motion) — animations
@studio-freight/react-lenis — smooth scrolling
@paper-design/shaders-react — liquid metal shader effect (optional for dashboard)
lucide-react — icon library
tailwind-merge + clsx — utility class merging
class-variance-authority — component variants
next-themes — theme provider (dark mode)
```

---

### 8. SUMMARY OF DESIGN PHILOSOPHY

- **Dark-mode only**, monochromatic zinc palette with no brand accent color
- **Premium & minimal** — no loud colors, no gradients except subtle zinc-to-zinc
- **Generous whitespace** — `py-24` between sections, `gap-3` to `gap-6` grid spacing
- **Rounded-2xl cards**, rounded-full buttons and pills
- **Semi-transparent backgrounds** (`/50`, `/70`, `/80` opacity suffixes everywhere)
- **Subtle borders** that lighten on hover for interactivity cues
- **Three-tier typography** — Cal Sans for impact, Instrument Sans for UI headings, Manrope for body
- **Smooth micro-interactions** — scale, translate, opacity transitions on everything interactive

---

Apply all of these to the dashboard: replace the existing color tokens, install the fonts, update the Tailwind config/CSS, and restyle all components (sidebar, cards, tables, charts, modals, inputs, buttons, navigation) to match this design system.
