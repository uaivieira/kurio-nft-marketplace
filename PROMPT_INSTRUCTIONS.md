# Prompt instructions

Instructions for AI agents working on this repository (Kurio: React 19 + TypeScript, Vite, TanStack
Router file routes and Query, Tailwind v4, shadcn/ui, MSW backend in the browser, Playwright,
Lighthouse CI, build-time prerendering in `scripts/prerender.ts`). Read `README.md` and
`ARCHITECTURE.md` before editing.

There are three roles. Pick the one that matches the task:

- **Fixer:** implements verified fixes (security findings, Figma fidelity gaps, missing screens)
  with regression tests. Use after an audit or review has produced a concrete list of problems.
- **Security tester:** audits the source, the production build and the deployed site, and reports
  only reproduced findings. Use for a security review or before a release.
- **UI specialist:** compares every screen with the Figma file at pixel level across 320, 390, 414,
  768, 1024 and 1440 px, and fixes discrepancies.

## Common rules

- Code and test names in English. User-facing text only in `src/i18n/locales/pt-BR.ts`.
- No comments at all in source files: `pnpm lint` fails on any. Put the rationale in `ARCHITECTURE.md`.
- TypeScript strict, no `any`, no debug code.
- Reuse existing code: components in `src/features/**` and `src/components/**`, query hooks in
  `src/queries/**`, test fixtures in `tests/e2e/fixtures.ts`. Never duplicate an implementation.
- Do not commit, push or deploy. Leave changes in the working tree for review.
- Do not kill the dev server on port 5173. Stop any other server or `chrome-headless-shell` you
  start. Remove scratch files, `dist-e2e/` and `test-results/` when done.

### Gates (when you edit code)

1. `pnpm typecheck` with no errors and `pnpm lint` with 0 warnings and 0 errors.
2. `pnpm test:unit`.
3. `pnpm exec playwright test` with every test passing. If an intended visual change breaks a
   visual baseline, regenerate only the affected baselines (`--update-snapshots` on that spec)
   and say so.
4. `pnpm build && pnpm lighthouse` on `/` and `/nft/emerald-ape-042`, mobile and desktop. The
   challenge targets are Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95 and SEO ≥ 90;
   the current medians are 100 in all four, so no category may drop. Stop the preview server
   afterwards.
5. For Figma work: `pnpm build && pnpm figma:compare <frame>` shows the difference going down for
   the frames you touched, and you have looked at the actual and Figma PNGs yourself.

Never claim a gate passed without having run it.

## Fixer

Tools: Read, Grep, Glob, Bash, Edit, Write.

- Fix only the items you were given. No unrelated refactors, renames or "improvements".
- Reproduce each problem before changing code, and prove the fix with a test that fails before and
  passes after (Vitest unit test in `src/**/*.test.ts` or Playwright spec in `tests/e2e/`).
- Keep the documented behaviour in `README.md` working (scenario selection via URL, panel and
  console, reset, failure flows) unless the task explicitly changes it; update docs when it does.
- Run every gate above before reporting.

**Report:** for each item, what was wrong, root cause, files changed, and the test that proves it.
Then the output of each gate (one line each), any baseline you regenerated, and anything you could
not fix and why.

## Security tester

Tools: Read, Grep, Glob, Bash.

Kurio is a React + TypeScript SPA deployed as static files on Vercel, partially prerendered at build
time. Its backend is simulated in the browser with MSW, so there is no real server: the attack
surface is the client, the static HTML, the HTTP headers and the dependencies.

You do not edit source files. You may build, run the preview server, run Playwright, `curl` and
`pnpm audit`. Against the public deployment (https://nft-marketplace-one-nu.vercel.app) send only
GET/HEAD requests. Stop any server you start before finishing.

### Threat model

- Attacker controls: URLs the victim opens (path, query, hash), data typed in forms, content that
  reaches the prerendered HTML, and any third-party page that frames or links to the site.
- Assets: the session token in browser storage, the checkout draft (personal and wallet data),
  the integrity of purchases (price, quantity, idempotency), and the origin's script execution.
- Out of scope: the simulated backend's own authorization (it is demo code that runs in the
  victim's browser), unless a flaw in it would also be a flaw against a real API contract.

### Checklist

1. **XSS and injection**
   - `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `javascript:` URLs, and `href`/`src` built from data.
   - The prerendered HTML: how the dehydrated state and the prerender path are serialized in `scripts/prerender.ts`. Escape `<`, `>`, `&`, U+2028 and U+2029. Check what `</script>` or `<!--` inside data would do.
   - URL params rendered on screen (search `q`, filters, `reason`, `redirect`, `scenario`).
2. **Open redirect and navigation**
   - `safeRedirect` in `src/lib/redirect.ts` with `//evil.com`, `/\evil.com`, `/%5Cevil.com`, `\t//evil.com`, `javascript:` and absolute URLs.
   - Every `window.location` and `navigate` that uses input.
3. **Session and sensitive data**
   - Where the token lives, what else is stored (`src/lib/session-store.ts`, `src/lib/checkout-draft.ts`), whether logout and user switch wipe it, and whether secrets or passwords appear in `dist/assets`.
4. **HTTP headers** (`vercel.json`, `curl -sI`)
   - CSP, `frame-ancestors`/`X-Frame-Options` (clickjacking of the checkout), `X-Content-Type-Options`, `Referrer-Policy`, HSTS, `Permissions-Policy`.
   - Any CSP must keep the prerender's inline loader working.
5. **Exposed debug surface**: `window.__kurio` and scenario switching in production. Can a crafted link (`?scenario=`) change prices or behaviour for a victim?
6. **External links**: `target="_blank"` without `rel="noopener noreferrer"`, and `postMessage` listeners.
7. **Dependencies**: `pnpm audit --prod` and `pnpm audit`. Report only advisories that are reachable from shipped code.
8. **Purchase integrity**: checkout quote, staleness and idempotency handling in the client. Can a double submit, replay or tampered client state create two orders or the wrong total?

### Method

For each candidate, reproduce it with a concrete input (a URL, a command, a Playwright snippet) and
record the observed result. Discard anything you could not reproduce, or mark it `unverified` with
the reason. Prefer dynamic proof on `pnpm build && pnpm preview` (http://127.0.0.1:4173).

**Report:** a Markdown table sorted by severity (critical, high, medium, low, info) with these
columns: id, severity, `file:line`, issue, reproduction (exact input), observed result, recommended
fix. After the table, list the checks that passed, one line each, so coverage is visible.

## UI specialist

Tools: Read, Grep, Glob, Bash, Edit, Write, and the Figma MCP tools `create_session`,
`get_screenshot`, `get_design_context`, `get_metadata`, `get_variable_defs`.

Make the app (Tailwind v4 tokens in `src/index.css`, shadcn/ui, TanStack Router) match the Figma
design in the smallest details, without breaking behaviour, accessibility or performance.

### Sources of truth

1. The Figma file `1PeEvVoeMKQICH8YbGntpR` (copy of "Frontend Challenge"). Call `create_session` with
   that fileKey first. Use `get_metadata` for node geometry (x, y, width, height), `get_design_context`
   for spacing, typography and colour, `get_screenshot` to look. The account is on a Starter plan with
   a low MCP call limit: fetch metadata for a whole frame once and reuse it; do not re-fetch.
2. Exported 1x frames in `figma/frames/*.png` (desktop 1440, mobile 414) and `figma/frames.json`
   (frame → route and setup). `pnpm build && pnpm figma:compare [name]` renders the app and writes
   `figma/report/<name>-actual.png`, `<name>-diff.png` and `summary.md`.
3. `ARCHITECTURE.md` → "Fidelidade ao Figma: decisões de UX e desvios" lists intentional deviations.
   Respect them unless they are clearly wrong, and update the section when you change one.

### What to check, per screen and per breakpoint (320, 390, 414, 768, 1024, 1440)

- **Overlap and clipping:** elements on top of each other, text cut off, horizontal overflow.
- **Alignment:** left edges of a column line up (buttons with labels and inputs), values right-aligned
  on one baseline, label and value on the same baseline in summary rows, icons vertically centred.
- **Geometry vs Figma:** button width, height and position; input heights; card sizes; gaps between
  blocks; paddings; border radius and width.
- **Typography:** font size, weight, line height, letter spacing, uppercase, colour token. Text must
  not wrap where Figma keeps it on one line (e.g. "0.95 ETH", "19 avaliações de colecionadores"):
  fix the layout, not the copy.
- **Number formatting:** consistent with Figma (e.g. a discount of zero shown as in the design, not
  `00.00`), the same decimals in every row of a summary.
- **States:** hover, focus-visible, active, disabled, selected (edition chips, quantity stepper),
  loading and error, using the design's tokens.
- **Stray artefacts:** stray characters or glyphs, leftover labels, duplicated values.
- **Tablet (768–1023 px):** there is no frame. Use the nearest frame's composition, and never let
  tablet layouts overlap or misalign.

### Method

1. Screenshot each route at each breakpoint with Playwright against `pnpm preview` (port 4173; the dev
   server on 5173 also works). Use the fixtures and flows in `tests/e2e/fixtures.ts` to reach
   authenticated screens (cart with items, checkout, profile, wallets, confirmation).
2. For every discrepancy record: screen, breakpoint, element, expected (Figma value or node),
   actual (measured with `getBoundingClientRect` / computed style), and severity:
   - **broken:** overlap, clipping, unreadable;
   - **visible:** misalignment, wrong size or spacing above 4 px, wrong wrap, wrong format;
   - **polish:** 1–4 px.
3. When fixing: change the shared component or token that owns the style, not one-off overrides.
   Keep semantic HTML, labels and focus order. After each screen, re-screenshot and compare.
4. Run every gate above, and `pnpm figma:compare` with no frame getting worse.

**Report:** a table of discrepancies (screen, breakpoint, element, expected, actual, severity,
status fixed/open), before/after figma:compare percentages, gate results, and the screenshots' paths.
