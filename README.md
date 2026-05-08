# TaskFlow — Project Management App

TaskFlow is a full-stack project management web app with role-based access control and is built using React (Frontend) + Node.js (Backend) + PostgreSQL (Database).

## Live Demo
> https://taskmanager-production-1246.up.railway.app

## Features

- **Authentication** — JWT-based signup/login
- **Projects** — Create, edit, delete projects with team members
- **Role-Based Access** — Admin (has full control) vs Member (can view and update task status)
- **Task Management** — Create tasks with title, description, priority, due date, assignee
- **Dashboard** — Overview of projects, task status breakdown, overdue alerts, recent activity
- **Team Management** — Invite members by email, promote/demote roles, remove members

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Query, React Router |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (via Prisma ORM) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Deployment | Railway |

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd TaskManager

# 2. Install all dependencies
npm run install:all

# 3. Set up server environment
cp server/.env.example server/.env
# Edit server/.env with your DATABASE_URL and JWT_SECRET

# 4. Push database schema
cd server && npx prisma db push

# 5. Start the server (port 5000)
npm run dev:server

# 6. Start the client (port 5173) — in a new terminal
npm run dev:client
```

Open http://localhost:5173

## Railway Deployment

1. Push code to GitHub
2. Create a new Railway project → **Deploy from GitHub repo**
3. Add a **PostgreSQL** service from Railway's template
4. Set environment variables in Railway dashboard:
   ```
   DATABASE_URL = <Railway provides this automatically after you add a database to railway>
   JWT_SECRET = <generate a secure random string>
   NODE_ENV = production
   CLIENT_URL = <your Railway app URL>
   ```
5. Railway auto-runs `npm run build` (builds React) then `npm start` (serves Express)
6. Run `npx prisma db push` via Railway's shell or set it as a release command

## Role-Based Access Control

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Create project | ✓ | ✓ | ✓ |
| Edit project info | ✓ | ✓ | — |
| Delete project | ✓ | — | — |
| Add/remove members | ✓ | ✓ | — |
| Change member roles | ✓ | ✓ | — |
| Create tasks | ✓ | ✓ | ✓ |
| Edit task (all fields) | ✓ | ✓ | — |
| Update task status | ✓ | ✓ | ✓ |
| Delete task | ✓ | ✓ | — |

## Project Structure

```
TaskManager/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Navbar, StatusBadge
│   │   ├── context/        # AuthContext
│   │   ├── lib/            # axios API client
│   │   └── pages/          # Login, Signup, Dashboard, Projects, ProjectDetail
│   └── vite.config.js
├── server/                 # Express backend
│   ├── prisma/             # Prisma schema
│   └── src/
│       ├── middleware/      # auth.js (JWT + role checks)
│       └── routes/         # auth, projects, tasks, users, dashboard
├── railway.toml
├── package.json
└── README.md
```
