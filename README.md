# MotorVault — Car Dealership Inventory System

Full-stack TDD Kata solution built with React, TypeScript, Tailwind CSS, Express, SQLite, JWT, and automated API tests.

## Features
- Register and sign in with hashed passwords and JWT authentication.
- The first registered account becomes an admin; later accounts are standard users. Register the intended administrator first on a fresh database.
- Protected inventory listing and filtering by make, model, category, and price range.
- Admin vehicle creation, editing, deletion, and restocking.
- Authenticated purchasing with atomic stock decrement and insufficient-stock checks.
- Responsive dashboard, inventory metrics, and transaction history stored in SQLite.
- Server-side validation, authorization, rate-limited authentication, and secure HTTP headers.

## Local setup
Prerequisites: Node.js 20+ and npm. Native SQLite module compilation may require build tools.

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Set a unique strong JWT_SECRET in .env
npm start
```
API runs on http://localhost:3001. The SQLite database is created automatically in `backend/dealership.db`.

### Frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Vite proxies `/api` requests to the backend. For separate hosting, set `VITE_API_URL` to the public backend origin before building and `FRONTEND_ORIGIN` on the backend to the frontend origin.

### Tests
```bash
cd backend
npm test
```
Tests use a separate in-memory SQLite database and exercise registration, authorization, CRUD, search, stock changes, and failure cases. Capture actual output for the required test report.

## API routes
| Method | Endpoint | Access |
|---|---|---|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Authenticated |
| GET | /api/vehicles | Authenticated |
| GET | /api/vehicles/search | Authenticated |
| POST | /api/vehicles | Admin |
| PUT | /api/vehicles/:id | Admin |
| DELETE | /api/vehicles/:id | Admin |
| POST | /api/vehicles/:id/purchase | Authenticated |
| POST | /api/vehicles/:id/restock | Admin |
| GET | /api/transactions | Admin |

Purchasing/restocking expects JSON `{ "quantity": 1 }`. Vehicle creation/update expects `make`, `model`, `category`, `price`, and `quantity`.

## TDD and Git workflow
The automated tests document key behavioral expectations. For a genuine Red–Green–Refactor record, author and commit failing tests first, implement features in small increments, then refactor and commit. Do not misrepresent a bulk-generated commit as proof of historical TDD.

## My AI Usage
ChatGPT (OpenAI) was used to help generate the initial application structure, API implementation, frontend UI, automated test cases, and documentation. All generated code should be reviewed, run, tested, and adjusted by the submitting developer. AI accelerated boilerplate creation and initial design; the developer remains responsible for correctness, originality, and understanding. For each AI-assisted Git commit, disclose AI usage in the message and add an accurate co-author trailer according to the assignment policy. Preserve raw prompts or a public chat link in `PROMPTS.md`.

## Submission checklist
- [ ] Review and understand all code
- [ ] Run backend tests and capture real test output
- [ ] Run the frontend and capture actual screenshots
- [ ] Add raw AI conversation or public chat URL to PROMPTS.md
- [ ] Commit with accurate AI attribution and meaningful history
- [ ] Verify public GitHub repository link
- [ ] Optional: deploy frontend and backend

## Notes
A vehicle with recorded transactions cannot be deleted, preserving transaction history. Vehicle images are intentionally replaced by icon illustrations to avoid external asset dependencies. For production, use HTTPS, a managed database with migrations, and a dedicated admin provisioning process.
