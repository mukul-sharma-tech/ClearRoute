# ClearRoute — Secure Video Support Platform

Real-time video conferencing built for enterprise customer support. Agents create sessions; customers join via a session code. All media is relayed through a self-hosted TURN server — no third-party media infrastructure.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER CLIENTS                            │
│                                                                     │
│   ┌──────────────────────┐         ┌──────────────────────┐        │
│   │    AGENT  (React)    │         │   CUSTOMER  (React)  │        │
│   │  /home → /:sessionId │         │  /home → /:sessionId │        │
│   │  /admin (Dashboard)  │         │  (join via code)     │        │
│   └──────────┬───────────┘         └──────────┬───────────┘        │
│              │  WebRTC SDP/ICE (via Socket.IO) │                    │
│              │◄───────────────────────────────►│                    │
│              │  RTP/SRTP Media (via TURN :3478) │                   │
│              │◄═══════════════════════════════►│                    │
└──────────────┼─────────────────────────────────┼────────────────────┘
               │       Socket.IO Signaling        │
               ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│               BACKEND  —  Node.js / Express  (Port 8000)            │
│                                                                     │
│   REST API  /api/v1/users                                           │
│   ├─ POST /login        →  Auth, returns token + role               │
│   ├─ POST /register     →  Create user (Agent | Customer)           │
│   ├─ GET  /sessions     →  All meeting records                      │
│   └─ GET  /metrics      →  Active sessions, totals                  │
│                                                                     │
│   Socket.IO Engine                                                  │
│   ├─ join-call    →  Role-gated room entry, creates DB record       │
│   ├─ signal       →  SDP offer/answer + ICE relay between peers     │
│   ├─ chat-message →  Broadcast to room + persist to MongoDB         │
│   └─ disconnect   →  Remove peer, mark meeting Ended in DB          │
│                                                                     │
│   ┌───────────────────────────────┐                                 │
│   │  TURN Server  (node-turn)     │  Port 3478 — long-term creds    │
│   │  Self-hosted media relay      │  Fallback: STUN (Google)        │
│   └───────────────────────────────┘                                 │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │ Mongoose ODM
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           MongoDB                                   │
│                                                                     │
│  users       →  { name, username, password (bcrypt), role, token }  │
│  meetings    →  { meetingCode, status, startTime, endTime,          │
│                   chatHistory[ { sender, message, timestamp } ] }   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## WebRTC Call Flow

```
Agent                    Backend (Socket.IO)              Customer
──────                   ──────────────────               ────────
  │── join-call ────────►│  [Creates Meeting in DB]          │
  │                      │◄──────────────── join-call ───────│
  │◄─ user-joined ───────│──────────────── user-joined ─────►│
  │                      │                                   │
  │── SDP Offer ────────►│──────────────── signal ──────────►│
  │◄─ SDP Answer ────────│◄───────────────────────────────── │
  │── ICE candidates ───►│──────────────── ICE candidates ──►│
  │◄══════ RTP/SRTP media via TURN (Port 3478) ══════════════│
  │── chat-message ─────►│── broadcast + DB persist ────────►│
  │── disconnect ───────►│  [Meeting → Ended in DB]          │
```

---

## Setup

### Prerequisites

- Node.js ≥ 18
- MongoDB (local or Atlas)
- Ports **8000** (API + Socket.IO) and **3478** (TURN) must be open

### 1. Backend

```bash
cd Backend
npm install
```

Create `Backend/src/.env`:

```env
MONGO_URI=mongodb://localhost:27017/clearroute
PORT=8000
```

```bash
node src/app.js
```

Starts the REST API, Socket.IO signaling server, and TURN server all on a single process.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Opens at `http://localhost:3000`. The app connects to the backend at `http://<hostname>:8000` automatically — no extra config needed for local use.

### 3. First Run

1. Go to `http://localhost:3000/auth` and register two accounts — one as **Agent**, one as **Customer**.
2. Log in as Agent → click **Initialize Support Session** → copy the URL.
3. Log in as Customer in a second browser/tab → enter the session code from the URL → **Join Secure Session**.

> **Judge shortcut:** A role-switcher panel in the bottom-left corner of the video room lets you toggle between Agent and Customer views without re-logging in.

---

## Project Structure

```
├── Backend/
│   └── src/
│       ├── app.js                  # Server entry — Express, MongoDB, TURN init
│       ├── controllers/
│       │   ├── socketManger.js     # WebRTC signaling, chat, room lifecycle
│       │   └── usercontroller.js   # Auth, session queries, metrics
│       ├── models/
│       │   ├── usermodel.js        # User schema
│       │   └── meetingmodel.js     # Meeting + chat history schema
│       └── routes/usersroutes.js   # REST route bindings
│
└── frontend/src/
    ├── App.js                      # Route definitions
    ├── contexts/AuthContext.jsx    # Login/register, token storage
    └── pages/
        ├── landing.jsx             # Public landing page
        ├── authentication.jsx      # Login / register form
        ├── home.jsx                # Role-based home (Agent / Customer)
        ├── VideoMeet.jsx           # Video call — WebRTC, chat, screen share, pin
        └── AdminDashboard.jsx      # Ops dashboard — sessions, metrics, chat logs
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, MUI v7 |
| Real-time | Socket.IO v4 |
| Media | WebRTC — RTCPeerConnection, getUserMedia, getDisplayMedia |
| Media Relay | node-turn (self-hosted TURN server) |
| Backend | Node.js, Express 5 |
| Database | MongoDB, Mongoose 8 |
| Auth | bcrypt, crypto (random hex token) |

---

## Known Limitations

- **TURN server is single-process** — `node-turn` runs embedded inside the Node.js process. Under heavy load or on resource-constrained machines it can bottleneck; a dedicated Coturn instance is preferred for production.
- **No token validation on protected routes** — The auth token is stored in `localStorage` and sent on login, but API endpoints like `/sessions` and `/metrics` do not verify it server-side. Any unauthenticated request can access them.
- **File sharing via base64 chat** — Files are encoded as base64 and sent through the Socket.IO chat channel. Large files will hit the 40 KB Express body limit and the in-memory message store will grow unbounded during a session.
- **In-memory room state** — `connections`, `messages`, and `timeOnline` are plain JavaScript objects in the signaling server. They are lost on process restart, and the setup does not support horizontal scaling or multi-instance deployments.
- **No HTTPS / WSS in development** — The app runs over plain HTTP/WS. Some browsers restrict camera/microphone access on non-`localhost` HTTP origins; accessing from another device on the same LAN may fail without a TLS reverse proxy.
- **Screen share audio on Windows** — `getDisplayMedia` audio capture of a browser tab works in Chrome, but system audio capture is not supported on all platforms.
- **Session recording is local only** — Recording uses `getDisplayMedia` on the recording user's machine and downloads a `.webm` file locally. There is no server-side recording or cloud storage.
- **No reconnection logic** — If a user's network drops mid-call, the WebRTC connection and Socket.IO socket are not automatically re-established. The user must reload the page to rejoin.
