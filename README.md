# NextFlow — Visual LLM Workflow Builder

A pixel-perfect Krea.ai clone for building visual AI workflows powered by Google Gemini. Drag, connect, and run LLM pipelines with image/video processing — all in a stunning dark UI.

---

## ✨ Features

- **6 Node Types** — Text, Upload Image, Upload Video, Run LLM, Crop Image, Extract Frame
- **Visual Canvas** — React Flow with dot grid, animated purple edges, minimap
- **Parallel Execution** — Independent branches run concurrently via DAG engine
- **Google Gemini** — Vision-capable LLM with multimodal inputs
- **FFmpeg Processing** — Image crop and video frame extraction via Trigger.dev
- **Workflow History** — Full run history with node-level details in right sidebar
- **Authentication** — Clerk auth with protected routes
- **Persistent Storage** — PostgreSQL via Neon + Prisma ORM
- **Undo/Redo** — Full canvas operation history
- **Import/Export** — JSON workflow serialization
- **Demo Workflow** — Pre-built "Product Marketing Kit" sample

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/nextflow
cd nextflow
npm install
```

### 2. Get API Keys

| Service | URL | Purpose |
|---------|-----|---------|
| **Clerk** | https://clerk.com | Authentication |
| **Neon** | https://neon.tech | PostgreSQL database |
| **Google AI Studio** | https://ai.google.dev | Gemini API (free) |
| **Trigger.dev** | https://trigger.dev | Background task execution |
| **Transloadit** | https://transloadit.com | File uploads (optional) |

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Google Gemini
GEMINI_API_KEY=AIzaSy...

# Trigger.dev
TRIGGER_SECRET_KEY=tr_dev_...
NEXT_PUBLIC_TRIGGER_PUBLIC_API_KEY=pk_dev_...

# Transloadit (optional — app works without it using local URLs)
NEXT_PUBLIC_TRANSLOADIT_KEY=...
NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_ID=...
```

### 4. Set Up Database

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to Neon
```

### 5. Run Development Servers

Open **two terminals**:

**Terminal 1 — Next.js:**
```bash
npm run dev
```

**Terminal 2 — Trigger.dev:**
```bash
npm run trigger:dev
```

Visit [http://localhost:3000](http://localhost:3000) — sign in and start building!

---

## 🏗️ Project Structure

```
nextflow/
├── app/
│   ├── (auth)/sign-in|sign-up     # Clerk auth pages
│   ├── (dashboard)/
│   │   ├── dashboard/             # Workflow list
│   │   └── workflow/[id]/         # Canvas editor
│   └── api/
│       ├── workflows/             # CRUD routes
│       ├── runs/                  # Execution history
│       └── execute/               # Trigger execution
├── components/
│   ├── canvas/
│   │   ├── nodes/                 # 6 node components
│   │   ├── edges/                 # Animated edge
│   │   └── WorkflowCanvas.tsx     # React Flow canvas
│   ├── sidebar/
│   │   ├── LeftSidebar.tsx        # Node palette
│   │   └── RightSidebar.tsx       # History panel
│   └── toolbar/CanvasToolbar.tsx  # Top toolbar
├── trigger/
│   ├── llm-task.ts                # Gemini API task
│   ├── crop-image-task.ts         # FFmpeg crop task
│   └── extract-frame-task.ts      # FFmpeg frame task
├── lib/
│   ├── db.ts                      # Prisma client
│   ├── utils.ts                   # Helpers
│   └── executionEngine.ts         # DAG + topological sort
├── store/workflowStore.ts         # Zustand global state
├── types/nodes.ts                 # TypeScript types
└── prisma/schema.prisma           # DB schema
```

---

## 🧩 Node Types

| Node | Input Handles | Output Handle | Execution |
|------|--------------|---------------|-----------|
| Text Node | — | `output` (text) | Instant |
| Upload Image | — | `output` (image) | Transloadit |
| Upload Video | — | `output` (video) | Transloadit |
| Run Any LLM | `system_prompt`, `user_message`, `images` | `output` (text) | Trigger.dev → Gemini |
| Crop Image | `image_url` | `output` (image) | Trigger.dev → FFmpeg |
| Extract Frame | `video_url` | `output` (image) | Trigger.dev → FFmpeg |

---

## 🔗 Connection Rules

Only compatible handle types can be connected:

```
Text output     → system_prompt ✅
Text output     → user_message  ✅
Image output    → images        ✅
Image output    → image_url     ✅
Video output    → video_url     ✅
Image output    → user_message  ❌ (blocked)
Video output    → image_url     ❌ (blocked)
```

Cycles are also blocked (DAG validation).

---

## ⚡ Execution Engine

The DAG execution engine in `lib/executionEngine.ts`:

1. Builds adjacency list from edges
2. Runs Kahn's topological sort → groups nodes into **waves**
3. Each wave executes in **parallel** via `Promise.all()`
4. Outputs flow downstream to connected nodes
5. Results written to PostgreSQL after completion

---

## 🎬 Demo Workflow — Product Marketing Kit

Click **"Load Demo"** in the toolbar to see the pre-built workflow:

```
Branch A:                          Branch B:
Upload Image                       Upload Video
    ↓                                  ↓
Crop Image (80% center)           Extract Frame (50%)
    ↓                    ↘             ↓
Text (system prompt)    LLM #1 ←──────┘
Text (product details) ─┘
                                   ↓ (both branches)
                              LLM #2 → Final tweet/post
```

---

## 🚢 Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

For Trigger.dev in production:
```bash
npx trigger.dev@latest deploy
```

---

## 🔑 Transloadit Setup (Optional)

1. Create account at [transloadit.com](https://transloadit.com)
2. Create a new **Template** with a passthrough robot (`/file/filter`)
3. Copy your **API Key** and **Template ID** to `.env.local`

Without Transloadit keys, uploads use local object URLs (works for development, not persistent).

---

## 📄 License

MIT
