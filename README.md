# CampusFind — Campus Lost & Found Platform

A hackathon-ready MERN application starter with:
- Student registration/login (JWT + bcrypt)
- Lost/found item listings with photo upload
- Search, category, location and status filters
- Private verification questions and secure claim requests
- Owner review of claims (approve/reject)
- Admin role and moderation endpoints
- Smart matching suggestions using category + keyword overlap
- Responsive React UI

## Stack
- React + Vite (frontend)
- Node.js + Express (API)
- MongoDB + Mongoose
- JWT + bcryptjs authentication
- Multer local uploads (easy local demo; swap for Cloudinary for deployment)

## Requirements
- Node.js 18+
- MongoDB Community or MongoDB Atlas

## Run locally

### 1. Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
Set `MONGO_URI` in `server/.env`. The API runs at `http://localhost:5000`.

### 2. Frontend
In another terminal:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL (usually `http://localhost:5173`).

### Demo flow
1. Register two accounts (e.g. owner and claimant).
2. Owner posts a found item and adds a private verification question + answer.
3. Claimant opens the listing and submits an answer with a short explanation.
4. Owner opens **My claims** on their dashboard and approves/rejects.
5. The item status updates to `claimed` after approval.

## Important security notes
- Verification answers are hashed and never returned by the API.
- A claim answer is checked on the server; the claimant cannot see the expected answer.
- Approval is performed only by the listing owner (or admin).
- In production, add email verification, rate limiting, CAPTCHA, audit logs, image scanning, HTTPS, secure cookie-based refresh tokens, and campus email-domain restrictions.
- Local uploads are for development/demo only. Use Cloudinary or S3 in production.
- Never store sensitive personal data in public listing descriptions.

## API overview
| Method | Endpoint | Auth | Purpose |
|---|---|---:|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/items` | No | Search/filter listings |
| POST | `/api/items` | Yes | Create listing |
| GET | `/api/items/:id` | No | Listing details |\n| GET | `/api/items/:id/private-question` | Yes | Fetch private claim question (not its answer) |
| GET | `/api/items/:id/matches` | Yes | Suggested matches |
| POST | `/api/items/:id/claims` | Yes | Submit claim |
| GET | `/api/claims/mine` | Yes | My submitted claims |
| GET | `/api/claims/received` | Yes | Claims on my listings |
| PATCH | `/api/claims/:id` | Yes | Owner/admin decision |
| PATCH | `/api/items/:id/status` | Yes | Owner/admin status update |
| GET | `/api/admin/stats` | Admin | Platform stats |
| GET | `/api/health` | No | Health check |

## Deployment
- API: Render / Railway / Fly.io
- Frontend: Vercel / Netlify
- Database: MongoDB Atlas
- Images: Cloudinary
Set frontend `VITE_API_URL` to the deployed API URL and configure backend `CLIENT_URL`, `MONGO_URI`, `JWT_SECRET`, and Cloudinary or object-storage settings.
