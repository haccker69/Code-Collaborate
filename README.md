# CollabDev — Collaborative Development Platform

Real-time collaborative workspace: code editor, drawing board, file tree, voice chat, code execution via Judge0.

---

## Prerequisites

- Node.js ≥ 18
- MongoDB running locally (`mongod`)
- A [RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce) key for Judge0 (only needed for code execution)

---

## Local Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd collabdev

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Configure the server `.env`

The file `server/.env` is already created with local defaults. The only thing you **must** change is the `JUDGE0_API_KEY` if you want code execution to work.

```bash
# Open server/.env and set your Judge0 key:
JUDGE0_API_KEY=your_rapidapi_key_here
```

Everything else works out of the box for local development.

### 3. Start MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or just run directly:
mongod
```

### 4. Run the backend

```bash
cd server
npm run dev
# → Server running on http://localhost:5000
```

### 5. Run the frontend

```bash
cd client
npm run dev
# → Client running on http://localhost:5173
```

### 6. Open the app

Navigate to `http://localhost:5173`

> **Note:** The Vite dev server proxies all `/api` and `/socket.io` requests to the backend automatically. You do not need to set any frontend environment variables for local development.

---

## How to use

1. Register an account at `/register`
2. Create a new project from the dashboard
3. Click the project to enter the room
4. Select a file from the file tree to open it in the editor
5. Share the invite code (shown in project settings) so collaborators can join
6. Switch to the Drawing Board tab to draw together in real time

---

## Project Structure

```
collabdev/
├── client/                    # React + Vite frontend
│   └── src/
│       ├── api/               # REST API callers (axios)
│       ├── components/        # UI components (editor, drawing, files, voice)
│       ├── contexts/          # AuthContext, SocketContext, RoomContext
│       ├── hooks/             # useFileTree, useWebRTC
│       ├── pages/             # LoginPage, RegisterPage, DashboardPage, RoomPage
│       └── utils/             # tokenStorage, languageMap
└── server/                    # Node.js + Express backend
    └── src/
        ├── config/            # db.js, redis.js, env.js
        ├── controllers/       # Thin HTTP handlers
        ├── middleware/        # auth, error, rateLimiter
        ├── models/            # User, Project, File (Mongoose)
        ├── routes/            # auth, projects, files, execute
        ├── services/          # Business logic + Judge0 abstraction
        ├── socket/            # room, code, draw, voice handlers
        └── utils/             # ApiError, asyncHandler
```

---

## API Endpoints

| Method | Path                                   | Auth     | Description                      |
|--------|----------------------------------------|----------|----------------------------------|
| GET    | /health                                | None     | Server health check              |
| POST   | /api/auth/register                     | None     | Create account                   |
| POST   | /api/auth/login                        | None     | Login, returns JWT               |
| GET    | /api/auth/me                           | Required | Current user profile             |
| POST   | /api/projects                          | Required | Create project                   |
| GET    | /api/projects                          | Required | List my projects                 |
| POST   | /api/projects/join                     | Required | Join via invite code             |
| GET    | /api/projects/:id                      | Required | Get single project               |
| PATCH  | /api/projects/:id                      | Required | Update project                   |
| DELETE | /api/projects/:id                      | Required | Delete project + all files       |
| POST   | /api/projects/:id/invite/regenerate    | Required | Regenerate invite code           |
| GET    | /api/projects/:projectId/files         | Required | Get flat file tree               |
| POST   | /api/projects/:projectId/files         | Required | Create file or folder            |
| GET    | /api/files/:id                         | Required | Get file with content            |
| PATCH  | /api/files/:id/rename                  | Required | Rename file or folder            |
| PATCH  | /api/files/:id/content                 | Required | Save file content                |
| DELETE | /api/files/:id                         | Required | Delete file/folder + children    |
| POST   | /api/execute                           | Required | Run code via Judge0              |

---

## Socket Events

| Event                | Direction       | Payload                                          |
|----------------------|-----------------|--------------------------------------------------|
| room:join            | Client → Server | `{ roomId }`                                     |
| room:leave           | Client → Server | `{ roomId }`                                     |
| room:presence        | Server → Client | `[{ socketId, userId, email }]`                  |
| room:user_joined     | Server → Client | `{ socketId, userId, email }`                    |
| room:user_left       | Server → Client | `{ socketId }`                                   |
| code:change          | Client ↔ Server | `{ roomId?, fileId, content }`                   |
| code:cursor          | Client ↔ Server | `{ roomId?, fileId, cursor, socketId?, email? }` |
| draw:stroke          | Client ↔ Server | `{ roomId?, points, color, width }`              |
| draw:preview         | Client ↔ Server | `{ roomId?, point, color, width }`               |
| draw:clear           | Client ↔ Server | `{ roomId? }`                                    |
| draw:request_history | Client → Server | `{ roomId }`                                     |
| draw:history         | Server → Client | `stroke[]`                                       |
| voice:join           | Client → Server | `{ roomId }`                                     |
| voice:leave          | Client → Server | `{ roomId }`                                     |
| voice:peers          | Server → Client | `{ peers: socketId[] }`                          |
| voice:peer_joined    | Server → Client | `{ socketId, email }`                            |
| voice:peer_left      | Server → Client | `{ socketId }`                                   |
| voice:offer          | Client ↔ Server | `{ to/from, offer }`                             |
| voice:answer         | Client ↔ Server | `{ to/from, answer }`                            |
| voice:ice_candidate  | Client ↔ Server | `{ to/from, candidate }`                         |
| voice:mute_state     | Client ↔ Server | `{ roomId?, socketId?, muted }`                  |

---

## Scaling Notes

- **Horizontal scaling:** Install `@socket.io/redis-adapter`, set `REDIS_URL` in server `.env`, add 3 lines to `socket/index.js` — architecture already designed for this.
- **Docker:** Drop the `docker-compose.yml` back in the root — it's already written and works as-is.
- **Judge0:** Swap `judge0.service.js` to use a self-hosted Judge0 instance — nothing else changes.
