# TV Legibility Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase the default text sizes on the public/TV presentation view (`/{username}/{slug}`) so alumni-card content is legible from realistic wall-mounted viewing distances, per digital-signage design guidance (~1 inch of letter height per 10ft, headline 25–50% larger than body).

**Architecture:** No new components or data flow. This is a targeted sizing change in two places: (1) the default `titleSizePx` value used when a presentation has never explicitly saved a title size, changed in both the DB column default and the three JS fallback literals that mirror it, and (2) the hardcoded Tailwind arbitrary-value `clamp()` strings in `SlideCarousel.tsx` that size the degree/year label, name, and role/company lines on the **active** card in TV mode only.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (arbitrary values via `text-[clamp(...)]`), Supabase Postgres migrations, Vite.

## Global Constraints

- **No test framework exists in this repo** (no vitest/jest, no `test` script in `package.json`) and this plan does not introduce one. The established precedent for a "runnable check" here is `scripts/check-carousel-math.mjs` — a plain Node script using `node:assert/strict`, run directly with `node`. Every task in this plan follows that same pattern instead of a testing library.
- **Every task's actual quality gate is the project's existing one:** `npx tsc -b --noEmit`, `npm run lint`, `npm run build` must all stay clean. Run all three after every task.
- **Scope is TV mode only** (`compact={false}` and `fixed={false}` in `SlideCarousel.tsx` — the real public presentation page, not the admin live-canvas preview or the embedded dashboard-card preview). Do not touch the `compact`/`fixed` branches of any ternary.
- **Scope is the active-card tier only** (`isActive` branch). The near/far carousel tiers are peripheral/decorative by design (same convention as Netflix-style carousels — side cards aren't meant to be read in full) and several of them already share their string with the `compact` (preview) branch, so touching them risks changing the admin preview too. Leave them as-is.
- **Bullets and company-logo sizing are explicitly out of scope.** Both fields were removed from the slide editor UI in an earlier pass (the editor now only exposes Photo, Name, Degree & year, Position, Company) — new slides never populate `bullets` or `companyLogoUrl`, so tuning their display size has no practical effect today.
- **Do not backfill existing database rows.** The DB migration in Task 1 only changes the column `DEFAULT`, which affects presentations created *after* this migration runs. Existing presentations keep whatever `title_size_px` they already have (admins can already change it via the Global Settings panel).
- **Do not run `supabase db push` (or any command that applies the migration to a live database) without the user's explicit go-ahead.** Creating the migration file is safe and local; applying it touches a possibly-shared Supabase project.

---

## File Structure

- **Modify:** `supabase/migrations/` — add one new migration file bumping the `title_size_px` column defaults.
- **Modify:** `src/lib/supabase.ts` — bump the `?? 42` fallback in `fetchSettings`.
- **Modify:** `src/lib/usePresentationData.ts` — bump the `defaultSettings.titleSizePx` literal.
- **Modify:** `src/components/AdminDashboard.tsx` — bump the initial `useState<Settings>` literal.
- **Modify:** `src/components/SlideCarousel.tsx` — bump three `clamp()` strings in the active-card TV branch (degree/year label, name, and the shared job-title/company string, which appears twice).
- **Create:** `scripts/check-legibility-sizes.mjs` — a `check-carousel-math.mjs`-style assertion script that fails if the new sizes ever get silently reverted.

---

### Task 1: Raise the default title size (DB default + JS fallbacks)

**Files:**
- Create: `supabase/migrations/20260911140000_increase_title_size_default.sql`
- Modify: `src/lib/supabase.ts:316`
- Modify: `src/lib/usePresentationData.ts:18`
- Modify: `src/components/AdminDashboard.tsx:30`
- Test: `scripts/check-title-size-default.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new is exported. The three JS locations and the DB default must all agree on the number `64` — later tasks don't depend on this, but a future engineer changing the default again should update all four places together.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260911140000_increase_title_size_default.sql`:

```sql
-- Raise the default screen-title size from 42px to 64px so new
-- presentations start at a more legible size for a wall-mounted TV.
-- Existing presentations keep whatever title_size_px they already have.
alter table public.presentation_settings
  alter column title_size_px set default 64;

alter table public.settings
  alter column title_size_px set default 64;
```

- [ ] **Step 2: Update the JS fallback in `fetchSettings`**

In `src/lib/supabase.ts`, find this line (currently line 316):

```ts
    titleSizePx: data?.title_size_px ?? 42,
```

Change it to:

```ts
    titleSizePx: data?.title_size_px ?? 64,
```

- [ ] **Step 3: Update the default in `usePresentationData`**

In `src/lib/usePresentationData.ts`, find this line (currently line 18, inside the `defaultSettings` object):

```ts
  titleSizePx: 42,
```

Change it to:

```ts
  titleSizePx: 64,
```

- [ ] **Step 4: Update the initial state in `AdminDashboard`**

In `src/components/AdminDashboard.tsx`, find this line (currently line 30):

```tsx
  const [settings, setSettings] = useState<Settings>({ autoplayIntervalMs: 5000, logoScale: 1, titleText: 'Department of Computer Science and Technology', titleColor: '#ffffff', titleSizePx: 42, titleBold: true })
```

Change `titleSizePx: 42` to `titleSizePx: 64`:

```tsx
  const [settings, setSettings] = useState<Settings>({ autoplayIntervalMs: 5000, logoScale: 1, titleText: 'Department of Computer Science and Technology', titleColor: '#ffffff', titleSizePx: 64, titleBold: true })
```

- [ ] **Step 5: Write the check script**

Create `scripts/check-title-size-default.mjs`:

```js
// Guards against the four title_size_px defaults (3 JS fallbacks + the
// migration) drifting out of sync with each other.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const EXPECTED = 64

const supabaseTs = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8')
assert.match(supabaseTs, new RegExp(`titleSizePx: data\\?\\.title_size_px \\?\\? ${EXPECTED},`),
  `supabase.ts fetchSettings fallback should be ${EXPECTED}`)

const hookTs = readFileSync(new URL('../src/lib/usePresentationData.ts', import.meta.url), 'utf8')
assert.match(hookTs, new RegExp(`titleSizePx: ${EXPECTED},`),
  `usePresentationData.ts defaultSettings should be ${EXPECTED}`)

const adminTsx = readFileSync(new URL('../src/components/AdminDashboard.tsx', import.meta.url), 'utf8')
assert.match(adminTsx, new RegExp(`titleSizePx: ${EXPECTED}, titleBold`),
  `AdminDashboard.tsx initial settings state should be ${EXPECTED}`)

const migrationSql = readFileSync(new URL('../supabase/migrations/20260911140000_increase_title_size_default.sql', import.meta.url), 'utf8')
assert.match(migrationSql, new RegExp(`set default ${EXPECTED}`, 'g'),
  'migration should set default to the same value')
assert.equal((migrationSql.match(new RegExp(`set default ${EXPECTED}`, 'g')) ?? []).length, 2,
  'migration should update both presentation_settings and settings')

console.log('title size default OK')
```

- [ ] **Step 6: Run the check script**

Run: `node scripts/check-title-size-default.mjs`
Expected output: `title size default OK`

- [ ] **Step 7: Run the project's existing quality gates**

Run: `npx tsc -b --noEmit`
Expected: no output, exit code 0

Run: `npm run lint`
Expected: no output, exit code 0

Run: `npm run build`
Expected: build succeeds (`✓ built in ...`)

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260911140000_increase_title_size_default.sql src/lib/supabase.ts src/lib/usePresentationData.ts src/components/AdminDashboard.tsx scripts/check-title-size-default.mjs
git commit -m "feat: raise default screen-title size for TV legibility"
```

- [ ] **Step 9 (manual, do not automate): apply the migration**

This step is NOT for an agent to run automatically — it touches a Supabase project that may be shared/linked. Tell the user the migration file is ready and ask them to run their normal migration deploy step (e.g. `supabase db push`) themselves, or confirm explicitly before you run it.

---

### Task 2: Increase the active-card text sizes in TV mode

**Files:**
- Modify: `src/components/SlideCarousel.tsx:103` (degree/year label)
- Modify: `src/components/SlideCarousel.tsx:123` (name)
- Modify: `src/components/SlideCarousel.tsx:130` and `:137` (job title and company — identical string, appears twice)
- Test: `scripts/check-legibility-sizes.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new is exported — this only changes literal strings inside `SlideCarousel`'s JSX. No prop or type changes.

- [ ] **Step 1: Bump the degree/year label size**

In `src/components/SlideCarousel.tsx`, line 103 currently reads:

```tsx
                isActive ? fixed ? 'text-[clamp(0.55rem,1.2cqw,0.9rem)]' : compact ? 'text-base' : 'text-[clamp(1.1rem,1.5vw,1.4rem)]' : absOffset === 1 ? fixed ? 'text-[clamp(0.4rem,0.85cqw,0.65rem)]' : 'text-[clamp(0.8rem,1.1vw,1rem)]' : fixed ? 'text-[clamp(0.35rem,0.7cqw,0.5rem)]' : 'text-[clamp(0.65rem,0.9vw,0.85rem)]'
```

Change only the TV/active segment — `'text-[clamp(1.1rem,1.5vw,1.4rem)]'` — to `'text-[clamp(1.5rem,2vw,1.875rem)]'`. Leave every other segment on the line untouched:

```tsx
                isActive ? fixed ? 'text-[clamp(0.55rem,1.2cqw,0.9rem)]' : compact ? 'text-base' : 'text-[clamp(1.5rem,2vw,1.875rem)]' : absOffset === 1 ? fixed ? 'text-[clamp(0.4rem,0.85cqw,0.65rem)]' : 'text-[clamp(0.8rem,1.1vw,1rem)]' : fixed ? 'text-[clamp(0.35rem,0.7cqw,0.5rem)]' : 'text-[clamp(0.65rem,0.9vw,0.85rem)]'
```

- [ ] **Step 2: Bump the name size**

Line 123 currently reads:

```tsx
                    isActive ? fixed ? 'text-[clamp(0.6rem,1.4cqw,1rem)] leading-tight' : compact ? 'text-xl leading-tight' : 'text-[clamp(1.5rem,2.5vw,2.25rem)] leading-tight' : absOffset === 1 ? fixed ? 'text-[clamp(0.4rem,0.9cqw,0.7rem)] leading-tight' : 'text-[clamp(0.85rem,1.25vw,1.1rem)] leading-tight' : fixed ? 'text-[clamp(0.35rem,0.7cqw,0.55rem)] leading-tight' : 'text-[clamp(0.7rem,1vw,0.9rem)] leading-tight'
```

Change only the TV/active segment — `'text-[clamp(1.5rem,2.5vw,2.25rem)] leading-tight'` — to `'text-[clamp(3rem,5vw,4.5rem)] leading-tight'`:

```tsx
                    isActive ? fixed ? 'text-[clamp(0.6rem,1.4cqw,1rem)] leading-tight' : compact ? 'text-xl leading-tight' : 'text-[clamp(3rem,5vw,4.5rem)] leading-tight' : absOffset === 1 ? fixed ? 'text-[clamp(0.4rem,0.9cqw,0.7rem)] leading-tight' : 'text-[clamp(0.85rem,1.25vw,1.1rem)] leading-tight' : fixed ? 'text-[clamp(0.35rem,0.7cqw,0.55rem)] leading-tight' : 'text-[clamp(0.7rem,1vw,0.9rem)] leading-tight'
```

- [ ] **Step 3: Bump the job-title and company sizes (both occurrences)**

Lines 130 and 137 are character-for-character identical:

```tsx
                    isActive ? fixed ? 'text-[clamp(0.4rem,0.9cqw,0.65rem)]' : compact ? 'text-sm' : 'text-[clamp(1rem,1.35vw,1.25rem)]' : absOffset === 1 ? fixed ? 'text-[clamp(0.35rem,0.65cqw,0.5rem)]' : 'text-[clamp(0.75rem,1vw,0.95rem)]' : fixed ? 'text-[clamp(0.3rem,0.55cqw,0.45rem)]' : 'text-[clamp(0.6rem,0.85vw,0.8rem)]'
```

On **both** lines, change only the TV/active segment — `'text-[clamp(1rem,1.35vw,1.25rem)]'` — to `'text-[clamp(1.875rem,2.5vw,2.25rem)]'`:

```tsx
                    isActive ? fixed ? 'text-[clamp(0.4rem,0.9cqw,0.65rem)]' : compact ? 'text-sm' : 'text-[clamp(1.875rem,2.5vw,2.25rem)]' : absOffset === 1 ? fixed ? 'text-[clamp(0.35rem,0.65cqw,0.5rem)]' : 'text-[clamp(0.75rem,1vw,0.95rem)]' : fixed ? 'text-[clamp(0.3rem,0.55cqw,0.45rem)]' : 'text-[clamp(0.6rem,0.85vw,0.8rem)]'
```

Since the line is identical in both places, a single find-and-replace-all of the old full ternary string with the new full ternary string is safe and will correctly update both the job-title paragraph (~line 130) and the company paragraph (~line 137).

- [ ] **Step 4: Write the check script**

Create `scripts/check-legibility-sizes.mjs`:

```js
// Guards the active-card TV-mode text sizes from SlideCarousel.tsx
// against silent regression back to the pre-legibility-pass values.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/components/SlideCarousel.tsx', import.meta.url), 'utf8')

assert.ok(src.includes("compact ? 'text-base' : 'text-[clamp(1.5rem,2vw,1.875rem)]'"),
  'degree/year active TV size should be clamp(1.5rem,2vw,1.875rem)')

assert.ok(src.includes("compact ? 'text-xl leading-tight' : 'text-[clamp(3rem,5vw,4.5rem)] leading-tight'"),
  'name active TV size should be clamp(3rem,5vw,4.5rem)')

const jobTitleCompanyCount = (src.match(/compact \? 'text-sm' : 'text-\[clamp\(1\.875rem,2\.5vw,2\.25rem\)\]'/g) ?? []).length
assert.equal(jobTitleCompanyCount, 2,
  `expected the job-title and company paragraphs to both use clamp(1.875rem,2.5vw,2.25rem), found ${jobTitleCompanyCount}`)

console.log('legibility sizes OK')
```

- [ ] **Step 5: Run the check script**

Run: `node scripts/check-legibility-sizes.mjs`
Expected output: `legibility sizes OK`

- [ ] **Step 6: Run the project's existing quality gates**

Run: `npx tsc -b --noEmit`
Expected: no output, exit code 0

Run: `npm run lint`
Expected: no output, exit code 0

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/components/SlideCarousel.tsx scripts/check-legibility-sizes.mjs
git commit -m "feat: increase active-card text sizes for TV legibility"
```

---

### Task 3: Manual verification on a real screen (cannot be automated)

Font-size legibility is a physical-world judgment call — the check scripts above only guard against the *numbers* silently reverting, they cannot tell you whether the numbers are actually right on your display. This task is a human step, not something a subagent should mark complete on its own say-so.

**Files:** none — this is a verification-only task.

- [ ] **Step 1: Start the dev server and open the public presentation page**

Run: `npm run dev`

Open the printed local URL at the path `/{your-username}/{your-presentation-slug}` in a browser.

- [ ] **Step 2: Check for text overflow on long names**

The card has a fixed height (`h-[clamp(22rem,70vh,38.75rem)]`) and `overflow-hidden` — content that doesn't fit gets silently clipped rather than shown. With the name now roughly twice its old size, a long two-line name could push the card's total content height past its budget. Open (or create) a slide with a long name (e.g. "Alexandria Montgomery-Whitfield") and confirm the name, degree/year, position, and company are all still fully visible — nothing clipped at the bottom of the card.

If it clips: this plan intentionally did not touch card height or add `truncate`/line-clamp to the name, since that's a layout decision, not a text-size decision. Flag it back rather than silently patching it in — the right fix (bigger card vs. truncated name vs. smaller cap) is a product call.

- [ ] **Step 3: View from the actual intended distance**

If this presentation will run on a physical wall-mounted TV, view it from the real distance people will actually stand at (or the closest approximation you have — even viewing a laptop screen from across a room at the same visual angle gives a rough signal). Digital-signage guidance target: name/headline text should be comfortably readable, not squinted at.

- [ ] **Step 4: Adjust if needed**

If it's still too small (or now too large) at the real distance, the numbers to tune are the three `clamp()` values from Task 2 — the middle value in each triple (the `vw`-based one) is what scales with screen width; the first and third are the floor and ceiling. `settings.titleSizePx` for the top banner is already admin-configurable from the Global Settings panel, no code change needed for that one.
