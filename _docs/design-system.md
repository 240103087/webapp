# Design system

The screens were drawn first in **Claude Design**, on the canvas
"MoveEasy Memory Tags - UI design":
https://claude.ai/artifact/7SDweX6HxNbuz5ZXNf5zuN

Artboards on the canvas, and the route that implements each:

| Artboard | Route |
|----------|-------|
| Main (owner dashboard) | `/` |
| TagEditor | `/tags/new`, `/tags/:id/edit` |
| PublicGift (phone) | `/t/:code` open gift or keepsake |
| PublicLocked (phone) | `/t/:code` time-locked |
| PublicPin (phone) | `/t/:code` PIN required |
| PublicBox (phone) | `/t/:code` open moving box |
| Move | `/moves/:id` |
| PrintLabels | `/print` |

Read this file before touching any screen. When the canvas and this file
disagree, this file wins (it is what the code follows) and the canvas gets
updated.

## The look in one sentence

Warm scrapbook (#67): cream notebook paper with a faint dot grid, cards
pasted on with washi tape like photos, a terracotta color for actions and
FRAGILE, olive for links and success, kraft for boxes, serif titles and a
handwritten line for the personal touch ("For Dana"). Personal, not
corporate SaaS.

The first version (until #67) was "paper labels": off-white ground,
tomato-red and deep teal. The tokens below replace it.

References: scrapbooks and photo albums, kraft moving boxes, washi tape,
Things 3 for calm spacing, Linear for crisp form controls.

## Tokens

Defined once in `frontend/src/styles/tokens.css` as CSS variables. The
scrapbook dressing (tape, polaroids, sticky-note counters, marker
highlight on page titles) lives in `frontend/src/styles/scrapbook.css`,
loaded last.

| Token | Value | Use |
|-------|-------|-----|
| `--ground` | `#F6EFE3` | page background (cream paper) |
| `--surface` | `#FFFCF6` | cards, inputs |
| `--ink` | `#2B211A` | text |
| `--ink-muted` | `#6A5B4D` | secondary text (5.7:1 on ground) |
| `--line` | `#E6D9C3` | borders, dividers |
| `--accent` | `#A9452A` | terracotta: primary buttons, FRAGILE, destructive confirm (white text 5.9:1) |
| `--accent-ink` | `#9A3E25` | accent text on light backgrounds, the handwritten "For" line |
| `--kraft` | `#C9A774` | box labels, box number backgrounds |
| `--kraft-tint` | `#F1E6D2` | box badges, highlights |
| `--teal` | `#4E5D24` | olive (name kept for history): links, success, keepsake (6.3:1) |
| `--teal-tint` | `#ECEFD9` | success background |
| `--danger-tint` | `#F8E1D7` | error background, gift badge |
| `--tape` | translucent kraft | washi tape strips |

Kind badges: gift = `--danger-tint` with `#A8321E` text; box =
`--kraft-tint` with `#6B5428`; keepsake = `--teal-tint` with `--teal`.

Six public-page themes, each a pair (background, ink): `paper`
(#F6EFE3/#2B211A), `kraft` (#F3EBDD/#3B2F1C), `rose` (#FBE7E4/#5A1E14),
`sage` (#E6EFE6/#1F3B26), `night` (#1D2230/#F4F1EA), `sky`
(#E3EEF8/#163452).

## Type

- Display: **Fraunces** 600-700 (serif), for page titles and the
  title on the public page
- Hand: **Caveat** 700, only for short personal lines: the recipient
  ("For Aigerim") and the log-in tagline. Never for body text or labels
- Body: **Atkinson Hyperlegible** 400/700, 16px base, line height 1.5.
  Chosen for legibility for older relatives scanning a gift
- Mono: **JetBrains Mono**, for tag codes (`7KQ4 M2XP`, always split 4+4)
  and box numbers (`BOX 07`, two digits)
- Scale: 13 / 14 / 16 / 20 / 24 / 32 / 44 px

## Shape and space

- 8px spacing grid. Page padding 24px desktop, 16px phone
- Radius 6px cards (4px for pasted tag cards and notes), 8px inputs and buttons, 999px badges
- Borders 1px `--line`. Only raised cards (tag cards on hover, dialogs)
  get the paper shadow `--shadow`; tag cards and counters always have it
- Max content width 1200px; forms 720px; public page 560px

## Components

- **Button**: primary (accent fill, white text), secondary (surface,
  line border), ghost (text only), danger (accent outline). Height 44px,
  min touch target 44x44. Disabled at 50% opacity with `cursor:
  not-allowed`. A busy button shows "Saving..." and is disabled
- **Input**: 44px, label above (always visible, never placeholder-only),
  help text below in `--ink-muted`, error below in `--accent-ink` with an
  icon, linked by `aria-describedby`
- **Badge**: pill, 13px, kind or privacy, with a small icon
- **Card**: surface, line border, 6px radius, 16px padding
- **Tag card**: thumbnail (first photo, or a kind illustration on the
  kind tint), title, kind + privacy badges, time-lock chip, code in mono,
  scans and replies counts
- **Toast**: bottom center on phone, bottom right on desktop,
  `aria-live="polite"`
- **Dialog**: for destructive confirms only. Names the thing being
  deleted
- **Empty state**: one sentence and one button, never a blank page

Icons: inline stroke SVG, 1.75px stroke, 20px, `currentColor`. No emoji
in the interface.

Illustrations (#65): flat inline SVG in `frontend/src/ui/illustrations.tsx`,
2.5px ink outlines with kraft, tomato and teal fills, a soft ground shadow
and small "+" sparkles. Always decorative (`aria-hidden`, no text inside).

| Illustration | Where |
|--------------|-------|
| `KindArt` (gift, box, keepsake) | tag card thumbnail without a photo, empty move |
| `EmptyTagsArt` | dashboard with no tags |
| `TruckArt` | Moves with no moves |
| `LostArt` | 404 page, public page for an unknown code |
| `SealedArt`, `ArchivedArt` | public page for a private or archived tag |
| `ScanArt` | log-in and sign-up hero (beside the card from 960px) |

Empty states sit on a dashed card with a kraft glow at the top. Dashboard
counters carry a small icon in a tinted circle (hidden on phones).

## Screens

- **Top bar**: logo "MoveEasy" left, nav (Tags, Moves, Print labels),
  user menu right. On a phone the nav collapses into a menu button
- **Public page**: no app chrome, only a small "Made with MoveEasy"
  footer. Uses the tag's theme. The title is large display type, the
  recipient line above it ("For Aigerim"). Photos in a 2-column grid that
  opens full screen
- **Box public page**: the box number is the hero: `BOX 07` in mono on a
  kraft block, room under it, a full-width FRAGILE banner in accent when
  fragile, then the contents as a list
- **Labels**: black on white only (printers), QR at least 30 mm, mono
  code under the QR

## Rules

- Every input has a visible label
- Color is never the only signal (badges have text, errors have icons)
- Text contrast at least 4.5:1, check the themes too
- Phone first: every screen must work at 375px wide without horizontal
  scrolling
- Times shown as "14 Feb 2027, 09:00" in the viewer's local time
