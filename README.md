# Pure Scenario

Create a new project named purerandomness. Build ONLY the approved shell. React + Vite + TypeScript + Tailwind + shadcn/ui, no additional libraries except the explicitly required test packages and required routing/Supabase packages as needed. Before coding, the user resolved: three bands use tomato → mustard → forest; literal placeholder copy is “Scenario 1”, “scenario slot”, “Start”; Stats table columns Scenario / Attempts / Wins / Losses; Leaderboard columns Rank / Player / Total Points; sound is a plain labeled nonfunctional button “Sound: On”; mobile header uses a toggle menu that opens/closes links to Stats and Leaderboard. Use react-router and exactly three routes: / game, /stats empty table shell, /leaderboard empty table shell. No homepage/landing page.

Follow all design constraints exactly: fixed light theme only, base #FAF6EF, bands flat tomato #E2553D / mustard #E8A33D / forest #2F6B4F (other defined tokens slate #3D5A80 and clay #B0552F also must exist), near-black #1A1614 on light bands, #FAF6EF on dark bands. Define them in CSS custom props index.css and Tailwind theme tokens tailwind.config.ts. No hardcoded hex in components. Google Fonts Instrument Serif display and Public Sans UI/body; no Inter/Roboto. Clear dramatic type scale. No gradients, glows, dark mode, animations, emoji icons, extra content/components/routes/packages, state management, game/random logic, auth UI/flows. Inline SVG only for any icon. Global CSS must respect prefers-reduced-motion despite no animation. Persistent header all routes: wordmark left, text Stats/Leaderboard center on desktop, Sign in button and nonfunctional Sound: On right. On mobile use a toggle menu for Stats and Leaderboard. Avoid horizontal scroll.

Game page: vertical stack of exactly 3 full-bleed bands, each roughly 70–85vh, same desktop/mobile layout and scaling. In each: large centered headline, large centered EMPTY square div labeled scenario slot, centered button. This is placeholder only.

Testing exactly as requested: install Vitest @testing-library/react @testing-library/jest-dom jsdom; configure vite test environment jsdom/globals/setupFiles './src/test/setup.ts'; setup imports jest-dom; scripts test and test:run; add one real smoke test rendering header and asserting Stats + Leaderboard links. Run npm run test:run and ensure passing. Load preview desktop and mobile before completion, report exactly what checked.

Supabase: user says prep rest when project is connected. Do NOT create database tables/RLS/functions/auth UI. If a Supabase project connection is unavailable, leave Supabase untouched and clearly report it as pending rather than guessing credentials. Do not ask further questions; all current implementation decisions have been resolved.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c6f10ad9-276c-47d7-803b-1e3efb78b4be).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
