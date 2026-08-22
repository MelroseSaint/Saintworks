# SaintWorks

**A professional no-code website builder, brand development platform, and visual web IDE.**

SaintWorks is a place where people come to do actual work. It combines a brand builder, a website builder, and a visual development environment into one connected workspace — so the brand, the design system, the components, and the published site all stay in sync without writing code by hand.

The product is the workspace. AI is an optional assistant inside it, never the identity.

---

## Why SaintWorks

Most website builders flatten everything into a single visual surface. SaintWorks keeps the real structure of a professional project intact:

```
Brand  →  Design System  →  Components  →  Pages  →  Website  →  Published Site
```

- **The brand is the source of truth** — colors, typography, voice, and imagery.
- **The design system implements the brand** — centralized tokens for color, type, spacing, radius, shadows, and borders.
- **Components implement the design system** — reusable masters with variants and instance overrides.
- **Pages compose components** — layouts, sections, and content bound to structured data.
- **The IDE gives you control over the whole system** — layers, assets, routes, interactions, versions, problems, and builds.

Change one accent token and every button across every page updates. That is the point.

---

## Features

### Brand builder
- Brand identity, mission, vision, values, personality, and voice
- Color system, typography, imagery direction, and brand guidelines
- Logo and asset management

### Website builder
- Pages, sections, layouts, navigation, and responsive designs
- A section template library (Hero, About, Services, Features, Testimonials, Pricing, FAQ, Gallery, Contact, Newsletter, CTA, Footer)
- Content separated from design via **collections** (products, services, blog posts, projects, testimonials, team members)
- Connect collection fields to components with `{{field}}` bindings

### Visual IDE
- Project structure, layers, components, assets, design tokens, data, routes, interactions, versions, problems, and builds
- **Visual canvas** — click-to-select, drag-to-reorder, drag-to-reparent, resize, absolute repositioning, inline text editing, and desktop/tablet/mobile viewports
- **Inspector** — Content, Typography, Color, Spacing, Layout, Responsive, and Advanced panels with token-aware controls
- **Layer tree** — select, rename, reorder, hide, lock, duplicate, and delete
- **Component system** — reusable masters, variants (Primary, Secondary, Outline, Ghost), and per-instance overrides
- **Timeline animation editor** — draggable keyframes with duration, delay, easing, trigger, and presets
- **Interaction builder** — click, hover, scroll, and page-load triggers mapped to visual actions
- **Command palette** (`Ctrl/Cmd + K`) — New Page, New Component, Add Section, Preview, Publish, Undo, Redo, and more
- **Version history** — IndexedDB snapshots with view, compare, and restore
- **Code view** — read-only, structured code generation for inspection
- **Export** — one-click ZIP of the generated project

### AI assistant (optional)
- Inspects the live project before proposing changes
- Respects brand colors, tokens, components, and existing content
- Proposes a reviewable plan with **Apply / Review / Cancel**
- Built-in deterministic rules engine works with no API key
- Optional LLM mode (OpenAI-compatible) maps natural language to the same structured change operations

### Publishing
- Real pipeline: **Validate → Build → Preview → Publish**
- Validates broken links, missing assets, accessibility, responsive issues, SEO, required content, and brand consistency
- Generates a structured, deployable artifact and stores it in IndexedDB
- Refuses to claim success when validation or the build fails

### Problems panel
Detects broken links, missing assets, missing alt text, mobile overflow, invalid routes, missing content, brand inconsistencies, accessibility issues, and missing SEO metadata — and jumps straight to the offending element.

---

## Architecture

SaintWorks is a client-side React application. There is no backend; all persistence lives in the browser.

### Three-layer model

The core data model is a structured `Project`:

| Layer | Lives in | Responsibility |
| --- | --- | --- |
| **Brand** | `src/model` (`types.ts`, `defaultProject.ts`) | Name, voice, values, imagery, guidelines |
| **Design tokens** | `project.tokens` | Colors, typography, spacing, radius, shadows, borders, breakpoints |
| **Components** | `project.components` | Reusable masters with props schema, variants, and bindings |
| **Pages** | `project.pages` | Layouts + sections + content, bound to collections |
| **Website** | `resolve.ts` | Re-resolves the tree whenever a token changes |

The engine re-resolves the entire tree from the token layer on every change, so a token edit propagates everywhere automatically — nothing is flattened or duplicated.

### Stores (Zustand)

- `src/store/projectStore.ts` — the single source of truth for the `Project`, wrapped in `temporal` (undo/redo) and `persist` (localStorage)
- `src/store/editorStore.ts` — UI state: active page, panels, modals, console, changes, dirty state
- `src/store/aiStore.ts` — AI conversation, pending plans, and LLM configuration
- `src/store/db.ts` — Dexie (IndexedDB) for version snapshots, asset blobs, and deployment artifacts

### Engine (pure, testable logic)

- `src/engine/lint.ts` — deterministic project validation
- `src/engine/codegen.ts` — structured code generation
- `src/engine/build.ts` — build orchestration and publishing
- `src/engine/ai.ts` — deterministic rules engine (parses intent into structured ops)
- `src/engine/llm.ts` — optional LLM-backed mode with the same op schema

### UI

- `src/components/shell/` — toolbar, left sidebar, right sidebar
- `src/components/canvas/` — canvas, drag manager, section library
- `src/components/inspector/` — inspector panels, brand editor, data builder, settings
- `src/components/panels/` — bottom panel (Console, Problems, Changes, Assets, Build, Timeline, Preview)
- `src/components/explorer/` — project explorer and layer tree
- `src/components/modals/` — publish, version history, project switcher
- `src/components/ai/` — AI assistant panel
- `src/components/preview/` — chrome-free live preview

---

## Tech stack

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 6](https://vitejs.dev/) for the dev server and build
- [Tailwind CSS 4](https://tailwindcss.com/) + custom design tokens
- [Zustand](https://github.com/pmndrs/zustand) with [zundo](https://github.com/charkour/zundo) (undo/redo) and `immer`
- [Dexie](https://dexie.org/) for IndexedDB persistence
- [dnd-kit](https://dndkit.com/) primitives
- [JSZip](https://stuk.github.io/jszip/) + [FileSaver](https://github.com/eligrey/FileSaver.js) for export
- [Prism](https://prismjs.com/) for code highlighting
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for tests

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm (or your preferred package manager)

### Install

```bash
git clone https://github.com/MelroseSaint/Saintworks.git
cd Saintworks
npm install
```

### Run the dev server

```bash
npm run dev
```

Open the URL printed in the terminal (default `http://localhost:5173/`).

### Build for production

```bash
npm run build
```

Output is written to `dist/`. The build uses a relative base path, so it can be served from any subpath (including GitHub Pages).

### Preview the production build

```bash
npm run preview
```

### Typecheck

```bash
npm run typecheck
```

### Run tests

```bash
npm test
# or, in watch mode:
npm run test:watch
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck and produce a production build in `dist/` |
| `npm run typecheck` | Run `tsc` without emitting |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |

---

## CI / CD

Two GitHub Actions workflows are included:

- **`.github/workflows/ci.yml`** — runs typecheck, tests, and a production build on every push and pull request to `main`.
- **`.github/workflows/deploy.yml`** — builds and deploys the site to GitHub Pages on every push to `main`.

To enable deployment, go to **Settings → Pages** in the repository and set the source to **GitHub Actions**. Once the workflow succeeds, the IDE is live at:

```
https://melrosesaint.github.io/Saintworks/
```

---

## Project structure

```
src/
├── components/
│   ├── ai/            # AI assistant panel
│   ├── canvas/        # Canvas, drag manager, section library
│   ├── code/          # Read-only code view
│   ├── command/       # Command palette and search
│   ├── explorer/      # Project explorer and layer tree
│   ├── inspector/     # Inspector, brand editor, data builder, settings
│   ├── modals/        # Publish, versions, project switcher
│   ├── panels/        # Bottom panel + timeline editor
│   ├── preview/       # Chrome-free preview
│   └── shell/         # Toolbar and sidebars
├── engine/            # lint, codegen, build, AI, LLM (pure logic)
├── hooks/             # shortcuts, selection, asset URLs
├── model/             # types, factories, tree, resolve, default project, sections
├── store/             # Zustand stores + IndexedDB
└── test/              # test setup
```

---

## Screenshots

> Screenshots are hosted in `docs/screenshots/`. Drop captured PNGs there and they will appear in the README.

![SaintWorks IDE](docs/screenshots/editor.png)
*The full IDE: toolbar, explorer, visual canvas, and inspector.*

---

## Notes & honest limitations

- **Code view is read-only.** SaintWorks does not fake a two-way sync between the visual model and generated code; the structured model is the single source of truth.
- **Publishing is client-side.** The artifact is validated, generated, and stored in the browser. There is no external hosting infrastructure.
- **Persistence is per-browser** (localStorage + IndexedDB).
- **AI is optional** — the built-in rules engine works offline, and the LLM mode is a clean extension point that maps to the same structured operations.

---

Built with [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), and [Vite](https://vitejs.dev/).
