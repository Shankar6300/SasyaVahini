# SasyaVahini — Development & Git Workflow Guide

This guide establishes the collaboration protocols for our 6-developer team during the Smart India Hackathon. Adherence to these practices ensures conflict-free merges and high stability.

---

## 1. Branching Model

We follow a structured Gitflow-lite model optimized for high-velocity hackathon collaboration:

```
[ main ] ──────────────● (Stable Release / Demo Ready)
   │                   ▲
   ▼                   │ (Merged after full integration test)
[ develop ] ───────────● (Sprint Integration)
   │        ▲
   │        │ (PR with CI green & 1 approval)
   ├────────┴── [ feat/m1-auth-admin ]
   ├────────┴── [ feat/m2-farmer-fpo ]
   ├────────┴── [ feat/m3-buyer-orders ]
   ├────────┴── [ feat/m4-logistics-tracking ]
   ├────────┴── [ feat/m5-ml-analytics ]
   └────────┴── [ feat/m6-qa-integration ]
```

### Branch Rules
1. **`main`**: Sacred branch. Only clean, tested, demo-ready builds are merged here. Direct pushes are forbidden.
2. **`develop`**: Primary integration branch. All feature branches branch off and merge into `develop`.
3. **`feat/m<N>-<feature>`**: Developer workspace branches (e.g. `feat/m2-farmer-listings`, `feat/m3-cart-checkout`).
4. **`fix/m<N>-<issue>`**: Targeted bug fixes created during QA cycles.

---

## 2. Commit Message Standards

We use the [Conventional Commits](https://www.conventionalcommits.org/) convention. Every commit must follow this format:

```
<type>(<scope>): <short description in present imperative tense>

[optional body explaining rationale]
```

### Allowed Types
- `feat`: A new feature or capability (e.g., `feat(order): implement multi-batch allocation engine`)
- `fix`: A bug fix (e.g., `fix(auth): handle token refresh expiration on stale tab`)
- `docs`: Documentation changes only (e.g., `docs(api): update dispute endpoint status codes`)
- `style`: Formatting, missing semicolons (no code logic change)
- `refactor`: Code restructuring without bug fix or feature addition
- `test`: Adding or correcting unit/integration tests
- `chore`: Build tasks, dependency updates, configuration adjustments

---

## 3. Pull Request Protocol & Checklist

Before submitting a Pull Request into `develop`:

1. **Rebase on Latest Develop**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feat/my-feature
   git rebase develop
   ```
2. **Run Local Checks**:
   ```bash
   # In backend
   npm run lint
   npm test

   # In frontend
   npm run lint
   npm test
   ```
3. **PR Checklist**:
   - [ ] PR title follows Conventional Commits.
   - [ ] Code touches only files within the member's assigned module (see `TEAM_MODULES.md`).
   - [ ] No `.env` or sensitive secrets are committed.
   - [ ] Any schema modifications include corresponding Prisma migration files.
   - [ ] All new endpoints follow the envelope defined in `API_CONTRACT.md`.
   - [ ] At least one peer review approval received.

---

## 4. Database Schema Migration Policy

Database schema conflicts are the #1 blocker in hackathon environments. Follow these rules strictly:

1. **Member 1 Coordinates Schema Changes**: Always notify Member 1 before making changes to `backend/prisma/schema.prisma`.
2. **Creating a Migration**:
   ```bash
   cd backend
   npx prisma migrate dev --name <descriptive_change_name>
   ```
3. **Committing Migrations**:
   Always commit both `prisma/schema.prisma` AND the new folder inside `prisma/migrations/`.
4. **Teammates Pulling Migrations**:
   When pulling changes that contain migrations, run:
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

---

## 5. Local Setup & Daily Workflow

### Morning Setup
```bash
# Pull latest develop
git checkout develop
git pull origin develop

# Update dependencies if package.json changed
npm run install:all

# Update database schema
npm run db:migrate
```

### Starting the Stack
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

---

## 6. Troubleshooting Common Issues

### Issue 1: Port Collision (`EADDRINUSE: 5000` or `5173`)
- **Fix**: Check for existing background Node processes:
  - Windows PowerShell:
    ```powershell
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
    ```
  - Linux/Mac:
    ```bash
    killall node
    ```

### Issue 2: Prisma Client Out of Sync (`Property 'xyz' does not exist on type 'PrismaClient'`)
- **Fix**: Regenerate the Prisma client after schema changes:
  ```bash
  cd backend
  npx prisma generate
  ```

### Issue 3: CORS Rejection in Browser (`Access to XMLHttpRequest has been blocked by CORS policy`)
- **Fix**: Verify `backend/.env` has `CORS_ORIGIN=http://localhost:5173`. If running frontend on another port, add it as a comma-separated value.

### Issue 4: Token Expired Loops
- **Fix**: Clear `sessionStorage` and `localStorage` in DevTools (F12 > Application > Storage > Clear site data) and log in again with seed credentials.
