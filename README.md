# ClearRoute — Enterprise Video Conferencing Platform

> Real-time, peer-to-peer video support platform built for enterprise customer service. Agents initialize secure sessions; customers join via a session code. All media is routed through a self-hosted TURN server — no reliance on third-party relay infrastructure.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER CLIENTS                                     │
│                                                                                  │
│   ┌─────────────────────────┐              ┌─────────────────────────┐           │
│   │       AGENT CLIENT      │              │     CUSTOMER CLIENT      │           │
│   │  (React SPA - Port 3000)│              │  (React SPA - Port 3000) │           │
│   │                         │              │                          │           │
│   │  /landing  →  /auth     │              │  /auth  →  /home         │           │
│   │  /home (Agent view)     │              │  /home (Customer view)   │           │
│   │  /admin (Dashboard)     │              │  /:sessionId (VideoMeet) │           │
│   │  /:sessionId (VideoMeet)│              │                          │           │
│   └────────────┬────────────┘              └────────────┬─────────────┘           │
│                │                                        │                          │
│                │   WebRTC (ICE/SDP via Socket.IO)       │                          │
│                │◄──────────────────────────────────────►│                          │
│                │                                        │                          │
│                │   RTP/SRTP Media (via TURN)            │                          │
│                │◄──────────────────────────────────────►│                          │
└────────────────┼────────────────────────────────────────┼──────────────────────────┘
                 │                                        │
                 │         Socket.IO Signaling            │
                 ▼                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVER  (Node.js / Express)                    │
│                                    Port 8000                                     │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        REST API  /api/v1/users                               │ │
│  │                                                                              │ │
│  │   POST /login          →  Authenticate user, return hex token + role        │ │
│  │   POST /register       →  Create user (Agent | Customer), bcrypt password   │ │
│  │   GET  /sessions       →  Fetch all meeting records (Admin Dashboard)       │ │
│  │   GET  /metrics        →  Total sessions, active sessions, total users      │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      Socket.IO Signaling Engine                              │ │
│  │                                                                              │ │
│  │   join-call   →  Role-gated room entry (Agent creates, Customer joins)      │ │
│  │   signal      →  SDP offer/answer + ICE candidate relay                     │ │
│  │   chat-message→  Broadcast to room + persist to MongoDB chatHistory         │ │
│  │   disconnect  →  Remove peer, notify room, mark meeting Ended in DB         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌──────────────────────────┐                                                    │
│  │   TURN Server (node-turn) │  ← Self-hosted, Port 3478                        │
│  │   Credentials: long-term  │    Forces media relay through server              │
│  │   No third-party relay    │    Fallback: STUN stun.l.google.com:19302         │
│  └──────────────────────────┘                                                    │
└──────────────────────────────────────┬───────────────────────────────────────────┘
                                       │
                                       │  Mongoose ODM
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              MongoDB Database                                    │
│                                                                                  │
│   ┌──────────────────────────────┐   ┌───────────────────────────────────────┐  │
│   │         users collection      │   │          meetings collection           │  │
│   │                               │   │                                        │  │
│   │  name        : String         │   │  meetingCode  : String (required)      │  │
│   │  username    : String (unique)│   │  status       : 'Active' | 'Ended'     │  │
│   │  password    : String (bcrypt)│   │  startTime    : Date                   │  │
│   │  token       : String (hex)   │   │  endTime      : Date                   │  │
│   │  role        : Agent|Customer │   │  chatHistory  : [{sender, message,     │  │
│   └──────────────────────────────┘   │                   timestamp}]           │  │
│                                       │  agent_id     : String                 │  │
│                                       │  customer_id  : String                 │  │
│                                       └───────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## WebRTC Call Flow

```
Agent Browser                  Backend (Socket.IO)              Customer Browser
─────────────                  ──────────────────               ────────────────
     │                                 │                               │
     │──── join-call (Agent) ─────────►│                               │
     │     [Creates Meeting in DB]     │                               │
     │                                 │◄──── join-call (Customer) ────│
     │◄─── user-joined ────────────────│──── user-joined ─────────────►│
     │                                 │                               │
     │──── createOffer (SDP) ─────────►│──── signal ──────────────────►│
     │                                 │                               │
     │◄─── signal (SDP answer) ────────│◄──── createAnswer ────────────│
     │                                 │                               │
     │──── ICE candidates ────────────►│──── ICE candidates ──────────►│
     │◄─── ICE candidates ─────────────│◄──── ICE candidates ───────────│
     │                                 │                               │
     │◄═══════════ RTP/SRTP Media via TURN Server (Port 3478) ════════►│
     │                                 │                               │
     │──── chat-message ──────────────►│──── chat-message ────────────►│
     │                                 │   [Saved to DB chatHistory]   │
     │                                 │                               │
     │──── disconnect ────────────────►│                               │
     │                                 │  [Meeting status → Ended]     │
```

---

## Project Structure

```
video-conferencing/
├── Backend/
│   ├── src/
│   │   ├── app.js                  # Express server, MongoDB connect, TURN server init
│   │   ├── controllers/
│   │   │   ├── socketManger.js     # Socket.IO signaling, chat, room lifecycle
│   │   │   └── usercontroller.js   # Auth (login/register), sessions, metrics
│   │   ├── models/
│   │   │   ├── usermodel.js        # User schema (name, username, password, role)
│   │   │   └── meetingmodel.js     # Meeting schema (code, status, chatHistory)
│   │   ├── routes/
│   │   │   └── usersroutes.js      # REST route definitions
│   │   └── .env                    # Environment variables (MONGO_URI, PORT)
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js                  # React Router — all route definitions
        ├── contexts/
        │   └── AuthContext.jsx     # Auth state, login/register API calls
        ├── pages/
        │   ├── landing.jsx         # Public landing page
        │   ├── authentication.jsx  # Login / Register form
        │   ├── home.jsx            # Role-based dashboard (Agent / Customer)
        │   ├── VideoMeet.jsx       # Core video call UI (WebRTC, chat, screen share)
        │   └── AdminDashboard.jsx  # Session telemetry, metrics, chat logs
        ├── styles/
        │   └── videoComponent.module.css
        └── environment.js
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, MUI v7 |
| State / Auth | React Context API, localStorage |
| Real-time | Socket.IO v4 (client + server) |
| Media | WebRTC (RTCPeerConnection, getUserMedia, getDisplayMedia) |
| Media Relay | node-turn (self-hosted TURN, port 3478) |
| Backend | Node.js, Express 5 |
| Database | MongoDB, Mongoose 8 |
| Auth | bcrypt (password hashing), crypto (token generation) |

---

## Features

- **Role-based access** — Agents create sessions; Customers join via session code. Invalid codes are rejected at the socket level before any connection is made.
- **WebRTC peer-to-peer video** — Full SDP offer/answer negotiation with ICE candidate exchange relayed through the signaling server.
- **Self-hosted TURN server** — All media is routed through `node-turn` on port 3478, eliminating dependency on external TURN providers.
- **Screen sharing** — Agent or customer can share their screen mid-session as an additional stream alongside their camera.
- **Video pin/unpin** — Any stream can be pinned to a large main view with the remaining participants shown in a sidebar.
- **In-call chat** — Real-time chat broadcast to all participants via Socket.IO. Chat history is persisted to MongoDB per session.
- **File sharing** — Files are base64 encoded and sent through the chat channel as downloadable links.
- **Session recording** — Agents can record the session (screen + audio) and download it as a `.webm` file.
- **Admin Operations Dashboard** — Live metrics (active sessions, total sessions, registered users) with a full session telemetry table, auto-refreshed every 5 seconds.
- **Lobby pre-check** — Camera and microphone can be toggled before joining a session, with a live preview.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB running locally or a MongoDB Atlas URI

### Backend

```bash
cd Backend
npm install
```

Create `src/.env`:

```env
MONGO_URI=mongodb://localhost:27017/clearroute
PORT=8000
```

Start the server:

```bash
node src/app.js
```

The backend starts:
- REST API on `http://localhost:8000`
- Socket.IO signaling on `ws://localhost:8000`
- TURN server on `localhost:3478`

### Frontend

```bash
cd frontend
npm install
npm start
```

App runs on `http://localhost:3000`.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/users/register` | Register a new user with name, username, password, role |
| `POST` | `/api/v1/users/login` | Authenticate, returns `{ token, role, name }` |
| `GET` | `/api/v1/users/sessions` | List all meetings sorted by start time (Admin) |
| `GET` | `/api/v1/users/metrics` | Returns `{ totalSessions, activeSessions, totalUsers }` |

---

## Socket Events

| Event | Direction | Description |
|---|---|---|
| `join-call` | Client → Server | Join a room by URL path. Agent creates the meeting; Customer validates it exists. |
| `user-joined` | Server → Client | Broadcast to all room members when a new peer joins, includes full client list. |
| `signal` | Bidirectional | Relay SDP offers/answers and ICE candidates between peers. |
| `chat-message` | Bidirectional | Send a message to the room. Server persists it to MongoDB. |
| `user-left` | Server → Client | Notify peers when a participant disconnects. |
| `call-error` | Server → Client | Sent to Customer if the session code is invalid or the meeting has ended. |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `PORT` | `8000` | Backend HTTP server port |

---

## User Roles

| Role | Capabilities |
|---|---|
| **Agent** | Create sessions, screen share, record sessions, access Operations Dashboard |
| **Customer** | Join sessions via code, video/audio/chat only |

> A Judge Utility Panel is available in the bottom-left corner of the video room to switch between roles without re-logging in — intended for demo/hackathon evaluation.
