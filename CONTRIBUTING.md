# Contributing

Thanks for considering a contribution to the Smart Inventory & Supply Chain Management System.

## Getting set up

See the [README](./README.md) "Quick Start" section for the fastest path (Docker Compose)
or "Local development without Docker" for running each service directly.

## Project structure

```
backend/       Node.js + Express + TypeScript + Prisma REST API
frontend/      React 19 + Vite + TypeScript + Tailwind dashboard
ai-service/    Python + FastAPI AI/ML microservice
nginx/         Reverse proxy config for the full stack
docs/          Architecture, ER diagram, API, and setup documentation
.github/       CI workflow
```

## Workflow

1. Fork the repo and create a feature branch: `git checkout -b feature/my-change`
2. Make your changes with clear, focused commits.
3. Run the relevant checks before opening a PR:
   - Backend: `cd backend && npm run build && npm test`
   - Frontend: `cd frontend && npx tsc -b && npm run build`
   - AI service: `cd ai-service && python app/train_model.py` (should complete without error)
4. Open a pull request describing what changed and why. Link any related issue.

## Code style

- TypeScript: strict mode is on for both backend and frontend — avoid `any` where a real type is available.
- Keep controllers thin; put business logic in `services/`.
- New DB fields go through a Prisma migration (`npx prisma migrate dev --name your_change`), not manual SQL edits, in local development. The initial migration in this repo was hand-authored because the sandbox used to build it had no network access to Prisma's binary CDN — from here on, always generate migrations with the Prisma CLI.
- New AI endpoints should have a graceful fallback (see `ai-service/app/inference.py`) so the app doesn't hard-fail if a trained model file is missing.

## Reporting issues

Please include: what you expected, what happened instead, and steps to reproduce (including whether you're running via Docker Compose or local dev).
