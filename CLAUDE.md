# RenderBlocks - Claude Code Context

## Project Overview
RenderBlocks is an interactive children's educational game inspired by the **Numberblocks** animated series. Children can drag number blocks from a mirror palette, combine them (addition), and split them apart (subtraction).

## Tech Stack
- **React 18** + **TypeScript** + **Vite 7**
- **Tailwind CSS v4** (uses `@tailwindcss/vite` plugin, CSS-based config with `@theme`)
- **Framer Motion** for animations and drag handling
- **vite-plugin-pwa** for offline/PWA support
- **Node.js v22** (required for Vite 7)

## Current Features (MVP Complete)

### Core Mechanics
- **Mirror Palette**: Drag blocks 1-10 from the mirror to spawn them on the canvas
- **Addition**: Drag two blocks together to combine them (shows + sign on overlap)
- **Subtraction**: Right-click a block to show a grid of 1 to n-1, select to split into two blocks

### Block Visuals
- **Official Numberblocks colors**: 1=Red, 2=Orange, 3=Yellow, 4=Green, 5=Cyan, 6=Indigo, 7=Violet, 8=Magenta, 9=Gray gradient, 10=White
- **Faces**: Eyes (vertically oblong, black outline) and asymmetric curved mouth
- **Number 1**: Has only one eye (all others have two)
- **Number labels**: Displayed above each block

### Special Layouts
- **1-5**: Vertical stack (single column)
- **4**: 2x2 square
- **6, 8**: 2 columns
- **7**: Vertical rainbow tower (each cube different color 1-7)
- **9**: 3x3 square with gray gradient (light at bottom, dark at top)
- **10**: 2x5 grid, white blocks with red outline
- **11-29**: 2 columns, remainder at top (odd cubes on left)
- **30-39**: 3 columns, **40-49**: 4 columns, etc.
- **Numbers > 10**: First N×10 cubes are white with red outline, remainder colored

### UI Features
- **Dark mode**: Toggle in header, persists to localStorage, respects system preference
- **PWA**: Installable, works offline
- **Responsive**: Touch and mouse support

## Key Files

### Types & Constants
- `src/types/index.ts` - Color palette, block dimensions, collision detection

### Components
- `src/components/blocks/NumberBlock.tsx` - Main block component with cube layout, face, drag handling
- `src/components/ui/Mirror.tsx` - Spawn palette (1-10 in two rows)
- `src/components/ui/SubtractMenu.tsx` - Right-click subtract grid
- `src/components/layout/AppShell.tsx` - Main layout wrapper

### Hooks
- `src/hooks/useNumberBlocks.ts` - Block state management, add/remove/combine/split logic
- `src/hooks/useDarkMode.ts` - Dark mode state with localStorage persistence
- `src/hooks/useVoiceInput.ts` - Voice input (Web Speech API, not fully integrated yet)

### Styling
- `src/index.css` - Tailwind theme, cube/face/eye/mouth styles, dark mode overrides

## Implementation Notes

### Drag & Combine
- Uses Framer Motion's `drag` with `dragMomentum={false}` and `dragElastic={0}`
- Position tracked via ref (`dragStartPos`) to handle offset correctly
- `checkOverlap()` called during drag to show + sign
- `finalizeCombine()` called on drag end to merge overlapping blocks

### Cube Positioning
- `getCubePositions(value)` returns array of {x, y} for each cube
- Fill order varies by number to achieve desired layouts
- For values ≥12, fills right-to-left so remainder ends up in upper left

### Color Logic
- `getCubeColor(blockValue, cubeIndex)` handles:
  - Rainbow for 7 (each cube gets color 1-7)
  - Gray gradient for 9
  - White for tens portion of values >10
  - Remainder color for values >10

## Potential Next Features
- [ ] Alphablocks (letter blocks)
- [ ] Voice commands ("show me five", "add three and four")
- [ ] Sound effects and character voices
- [ ] Multiplication/division interactions
- [ ] Save/load playground state
- [ ] Guided learning modes
- [ ] Animations when blocks combine/split

## Running the Project
```bash
# Ensure Node.js v22+
nvm use 22

# Install dependencies
npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173/

# Build for production
npm run build
```

## Git Remotes
- Origin: `primed-lan-laucirica/renderblocks`
- Fork: `PrimeDeviation/renderblocks`
