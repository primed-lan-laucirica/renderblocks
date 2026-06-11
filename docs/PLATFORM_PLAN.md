# RenderBlocks platform plan

Unify the three `render*` kids' apps into a single **renderblocks** parent app
with a home screen of game tiles and a kernel/plugin architecture that lets new
games be developed independently.

## Decisions (confirmed 2026-06-11)

- **Repo:** this repo (`PrimeDeviation/renderblocks`) evolves into the monorepo,
  keeping its name and history. The current number game moves into
  `packages/games/blocks`.
- **Plugin model:** pnpm **workspace packages in one monorepo** with a
  build-time plugin registry and lazy-loaded games — *not* runtime/dynamic
  loading. The `GameModule` contract is designed so dynamic loading could be
  added later without rewriting games.
- **Distribution:** **Android via Capacitor only** (one Android project in the
  `app` package). PWA/iOS are not prioritized now, but the `app` package stays
  the only place with platform config so they can be added later.

## Source apps

All three share an identical stack (Vite + React 19 + TS + Tailwind 4 +
framer-motion + Capacitor 8) and ~30% copy-pasted shared code — that copied
layer becomes the kernel.

| App | Role in monorepo | Latest real commit (master) |
|-----|------------------|------------------------------|
| `renderblocks` (this repo) | parent + `packages/games/blocks` | 2026-01-04 |
| `rendershapes` | `packages/games/shapes` | 2026-02-03 |
| `rendercombos` | `packages/games/combos` (ported) | 2026-02-22 |

Note (updated 2026-06-11): `rendercombos` is **not** an empty copy of
rendershapes — it has ~40 commits of real game development (pushed to origin
2026-06-11): memory matching with progressive difficulty (6/10/20 cards) and a
face-up beginner mode, plus a "Combo Spin" slot-machine game, through Android
v0.4.7. It gets ported like the others. `master` is the real latest code in
each repo; the remaining remote branches are Dependabot-only.

The shared layer to lift into the kernel: `AppShell`, `ResponsiveContainer`,
`useDarkMode`, `utils/sounds.ts`, `utils/throttle.ts`, the Tailwind preset, and
the Capacitor/PWA config. `rendershapes`' `useProgressionPersistence` is the
model for the kernel's namespaced per-game storage. `renderblocks`' voice/LLM
hooks (`useVoiceInput`, `useLLM`, `lib/api.ts`) become an **optional** kernel
capability, since shapes/combos don't use them.

## Target structure

```
renderblocks/
├── packages/
│   ├── kernel/          # home screen, plugin registry, router, shared services
│   ├── games/
│   │   ├── blocks/      # current renderblocks game, ported
│   │   ├── shapes/      # current rendershapes, ported
│   │   └── combos/      # current rendercombos, ported
│   └── app/             # the one Capacitor Android project + entry point
├── package.json         # workspaces root
└── docs/PLATFORM_PLAN.md
```

### Plugin contract (sketch)

Each game package exports a typed manifest the kernel reads at build time:

```ts
export interface GameModule {
  id: string;                 // 'shapes'
  title: string;              // 'Shapes'
  tile: { color: string; icon?: ReactNode; preview?: ReactNode };
  load: () => Promise<{ default: ComponentType<GameProps> }>; // lazy import
  capabilities?: Array<'audio' | 'speech' | 'llm' | 'storage'>;
}

export interface GameServices {       // injected by the kernel into each game
  audio: AudioService;
  storage: NamespacedStorage;         // scoped to the game id
  theme: ThemeApi;
  speech?: SpeechService;             // present only if capability requested
  llm?: LlmService;
}
```

The kernel renders the tile grid from the registry, handles the
home↔game router (incl. Android hardware back → home), and injects
`GameServices`. Games never import each other.

## Phased roadmap

Each phase ends with a **working Android build** so work can stop or
course-correct at any boundary.

1. **Scaffold.** Branch, convert to workspaces, move existing game code untouched
   into `packages/games/blocks`, get a trivial kernel + app shell compiling with
   an empty home screen. Android still builds.
2. **Kernel extraction.** Lift the shared layer into `packages/kernel`. Define
   `GameModule` / `GameServices`. Build the tile-grid home screen (framer-motion
   transitions) and the router with Android back → home.
3. **Port shapes.** Cleanest codebase; its progression persistence becomes the
   storage service model. Two working tiles.
4. **Port blocks.** Wire voice/LLM hooks as the optional kernel capability — this
   phase proves the services design.
5. **Port combos.** Memory matching + Combo Spin, same treatment as shapes and
   blocks. It shares shapes' ancestry, so most of its kernel seams are already
   known from phase 3.
6. **Finish.** Single Android config + icons, per-game dev harness scripts, an
   "add a game" guide, then archive the `rendershapes` and `rendercombos` repos.
   (Their open Dependabot alerts die with the archive — the monorepo's fresh
   dependency tree supersedes them, so don't spend time merging those branches.)

Once the kernel exists (after phase 2), games can be developed in parallel
without touching each other.

## How to add a game (target dev experience)

1. `packages/games/<id>/` — new workspace package.
2. Export a `GameModule` from its entry; declare any `capabilities`.
3. Register it in the kernel's registry (one line).
4. `pnpm --filter <id> dev` for an isolated dev harness; it also appears as a
   tile in the full app build.
