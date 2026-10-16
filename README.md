# Quantum Toaster

A toaster simulated with quantum mechanics. Bread is modelled as a wavefunction,
heating elements as potentials, and "doneness" as an expectation value that only
becomes definite when you look at it. The physics engine runs entirely in
TypeScript, and a React + Tailwind dashboard lets you set the dial, watch the
state evolve, and collapse your toast into one golden-brown eigenstate (or not).

**Live demo:** https://mgrugan.github.io/quantum_toaster/

## Quick start

Requires Node 22+.

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm test         # run the Vitest suite
npm run toast    # guided CLI tour of the quantum engine
```

Other scripts:

| Script                | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run build`       | Type-check and build to `dist/`                |
| `npm run build:pages` | Build with the `/quantum_toaster/` base path   |
| `npm run preview`     | Serve the built `dist/` locally                |
| `npm run lint`        | Run ESLint                                     |

## Project structure

```
src/
  quantum/      Physics engine (plus the `npm run toast` CLI)
  components/   React + Tailwind dashboard UI
docs/
  QUANTUM_CONCEPTS.md   The quantum concepts the toaster demonstrates
.github/workflows/
  deploy.yml    CI (lint, test, build) and GitHub Pages deployment
```

For the list of quantum mechanics concepts modelled and where each one lives,
see [docs/QUANTUM_CONCEPTS.md](docs/QUANTUM_CONCEPTS.md).

## Deploying

The site is deployed to GitHub Pages by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Every push and
pull request is linted, tested and built; only pushes to `main` (or a manual
run) are deployed.

One-time setup:

1. In the GitHub repo, open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push or merge to `main`. The workflow publishes to
   https://mgrugan.github.io/quantum_toaster/.

You can also trigger a deploy manually from the **Actions** tab
("Build and deploy to GitHub Pages" → **Run workflow**).
