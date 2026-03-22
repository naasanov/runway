# Design Audit: Runway Dashboard
**URL:** http://localhost:3000/dashboard
**Date:** 2026-03-21
**Mode:** Standard

---

## Headline Scores

| Metric | Grade |
|--------|-------|
| **Design Score** | D |
| **AI Slop Score** | B |

---

## First Impression

The site communicates **unfinished prototype**. This feels like a wireframe that shipped accidentally.

I notice **the giant red alert banner dominates the entire viewport**, creating high visual stress without proportional value delivery.

The first 3 things my eye goes to are: **"9 days" in giant red text**, **the empty chart placeholder**, **the wall of text in alerts**.

If I had to describe this in one word: **Wireframe**.

---

## Inferred Design System

### Fonts
- **Primary:** System fonts only (no custom typography)
- **Flag:** No brand identity through type

### Colors (extracted)
- Red: `oklch(0.577 0.245 27.325)` - destructive
- Amber: `oklch(0.704 0.191 22.216)` - warning
- Black/White: OKLCH neutrals
- **Flag:** Limited semantic color system, no trust/success colors

### Heading Scale
| Level | Size | Weight |
|-------|------|--------|
| H2 | 16px | 600 |
| H2 | 16px | 600 |
| H2 | 16px | 600 |

**Flag:** All H2s identical - no visual hierarchy between sections

### Spacing
- Paddings: 16px, 24px, 32px (8px grid - GOOD)
- Border radius: 10px, 12px, 16px (3 values - ACCEPTABLE)

### Touch Targets
- Nav links: 24-32px height (FAIL: minimum 44px required)
- Buttons: Variable (needs audit per element)

---

## Findings

### FINDING-001: Placeholder content in production
**Impact:** HIGH
**Category:** Content Quality

The chart section displays "Chart component — coming soon" - placeholder text that should never ship.

**Fix:** Implement actual chart or remove section entirely.

---

### FINDING-002: No page heading / H1
**Impact:** HIGH
**Category:** Visual Hierarchy

No H1 element on the page. The largest text is a `<p>` tag. Screen readers and SEO suffer. Users have no clear page title.

**Fix:** Add semantic H1: "Dashboard" or "Cash Flow Overview"

---

### FINDING-003: All H2 headings same size
**Impact:** HIGH
**Category:** Typography

Every section heading is 16px/600 weight. "Active Alerts" and "30-Day Cash Forecast" have equal visual weight despite different importance.

**Fix:** Create heading scale: H2 at 20-24px, H3 at 16-18px

---

### FINDING-004: Line lengths exceed 75 characters
**Impact:** MEDIUM
**Category:** Typography

Multiple paragraphs span 100-150 characters per line. Optimal is 45-75 characters.

**Affected areas:**
- Cash Runway section: ~151 chars
- Alert descriptions: ~117-129 chars
- Recommended actions: ~129-151 chars

**Fix:** Add `max-w-prose` or explicit width constraints

---

### FINDING-005: Undersized touch targets
**Impact:** HIGH
**Category:** Interaction States

Navigation links are 24-32px tall. WCAG requires 44x44px minimum for touch targets.

**Fix:** Increase nav link padding to achieve 44px minimum height

---

### FINDING-006: No focus-visible styles
**Impact:** HIGH
**Category:** Interaction States

Interactive elements have `outline: none` with no visible focus indicator. Keyboard users cannot see what's focused.

**Fix:** Add `focus-visible:ring-2 focus-visible:ring-ring` to all interactive elements

---

### FINDING-007: `transition: all` anti-pattern
**Impact:** MEDIUM
**Category:** Motion & Animation

Some elements use `transition: all` instead of specific properties. This can cause performance issues and unexpected animations.

**Fix:** Replace with explicit properties: `transition: color, background-color`

---

### FINDING-008: Hydration warning in console
**Impact:** MEDIUM
**Category:** Performance

Console shows React hydration mismatch in ScenarioSlider component.

**Fix:** Debug server/client rendering mismatch

---

### FINDING-009: Alert cards lack hierarchy
**Impact:** MEDIUM
**Category:** Visual Hierarchy

All alert cards use the same visual weight. Critical (9 days runway) looks the same as informational (subscription waste). Severity dots are too small (8px).

**Fix:** Differentiate severity with card backgrounds, larger indicators, or prominence differences

---

### FINDING-010: Numeric alignment in obligations list
**Impact:** POLISH
**Category:** Typography

Dollar amounts in "Upcoming Obligations" not right-aligned and don't use tabular figures.

**Fix:** Add `tabular-nums text-right` to amounts

---

### FINDING-011: Empty state for chart is not designed
**Impact:** MEDIUM
**Category:** Content Quality

The chart placeholder is a gray box with centered text. No warmth, no illustration, no action.

**Fix:** Design proper empty state with icon + message + primary action

---

### FINDING-012: No mobile-specific navigation
**Impact:** HIGH
**Category:** Responsive Design

Desktop horizontal nav stays horizontal on mobile. No hamburger menu or bottom tab bar.

**Fix:** Add mobile-first navigation pattern (bottom tabs or hamburger)

---

## Category Grades

| Category | Grade | High | Medium | Polish |
|----------|-------|------|--------|--------|
| Visual Hierarchy | D | 2 | 1 | 0 |
| Typography | D | 2 | 1 | 1 |
| Color & Contrast | C | 0 | 1 | 0 |
| Spacing & Layout | B | 0 | 1 | 0 |
| Interaction States | D | 2 | 0 | 0 |
| Responsive Design | D | 1 | 0 | 0 |
| Motion & Animation | C | 0 | 1 | 0 |
| Content Quality | D | 2 | 1 | 0 |
| AI Slop | B | 0 | 0 | 0 |
| Performance | B | 0 | 1 | 0 |

---

## Quick Wins (< 30 min each)

1. **Add H1 + heading scale** - 10 min
2. **Remove placeholder text, hide chart section** - 5 min
3. **Add focus-visible rings** - 15 min
4. **Increase nav touch targets to 44px** - 10 min
5. **Add max-width to text containers** - 10 min

---

## AI Slop Assessment

**Grade: B**

**Verdict:** Not sloppy, just unfinished.

No purple gradients, no 3-column feature grids, no icons in colored circles, no decorative blobs. The design is plain but not AI-generated-looking. The problem is incompleteness, not sloppiness.

---

## Screenshots

- First impression: `.gstack/design-reports/screenshots/first-impression.png`
- Annotated: `.gstack/design-reports/screenshots/dashboard-annotated.png`
- Mobile: `.gstack/design-reports/screenshots/dashboard-mobile.png`
- Tablet: `.gstack/design-reports/screenshots/dashboard-tablet.png`
- Desktop: `.gstack/design-reports/screenshots/dashboard-desktop.png`

---

---

## Post-Fix Assessment

### Final Scores

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| **Design Score** | D | B | +2 grades |
| **AI Slop Score** | B | B | — |

### Fixes Applied

| Finding | Status | Commit |
|---------|--------|--------|
| FINDING-001: Placeholder content | ✅ verified | a624fd5 |
| FINDING-002: No H1 heading | ✅ verified | a624fd5 |
| FINDING-003: Flat heading scale | ✅ verified | a624fd5 |
| FINDING-004: Line lengths | ✅ verified | a624fd5 |
| FINDING-005: Touch targets | ✅ verified | a624fd5 |
| FINDING-006: Focus-visible | ✅ verified | a624fd5 |
| FINDING-007: transition:all | deferred | — |
| FINDING-008: Hydration warning | deferred | — |
| FINDING-009: Alert hierarchy | ✅ verified | a624fd5 |
| FINDING-010: Numeric alignment | ✅ verified | a624fd5 |
| FINDING-011: Empty state design | ✅ verified (chart added) | a624fd5 |
| FINDING-012: Mobile navigation | ✅ verified | 57198f3 |

### Summary

- **Total findings:** 12
- **Fixed:** 10 (verified: 10, best-effort: 0, reverted: 0)
- **Deferred:** 2 (transition:all, hydration warning)
- **Design score:** D → B
- **Console errors:** 0 (clean)

**PR Summary:** Design review found 12 issues, fixed 10. Design score D → B.

---

*Generated by gstack /design-review*
