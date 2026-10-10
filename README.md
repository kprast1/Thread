# THREAD — Personalized Fashion Search Agent

> **"Find what you actually mean, from brands you'll actually like."**

THREAD is an agentic AI fashion discovery web application. Rather than clicking through dozens of retail filters or searching with brittle keywords, users describe their aesthetic intent in natural language. The agent interprets subjective style, searches favorite brands, discovers similar peer labels via an aesthetic knowledge graph, and conversationally refines recommendations.

---

## 🌟 Key Features

- **Natural-Language Intent Extraction**: Parses category, silhouette, occasions, colors, materials, and price ceilings from natural prose.
- **Brand Onboarding & Preference Profile**: Select preferred fashion houses (COS, Toteme, Reformation, Sézane, Massimo Dutti, Aritzia, Ganni, etc.), sizes, currency, and excluded fabrics (e.g. polyester, synthetic leather).
- **Multi-Brand Affinity Network**: Discovers aesthetic peer brands (e.g. Toteme $\leftrightarrow$ Source Unknown, Reformation $\leftrightarrow$ Dissh, Sézane $\leftrightarrow$ Rouje) based on design language and craftsmanship.
- **Deterministic Constraint Engine**: Zero hallucinated availability or speculative pricing; enforces hard budget ceilings and excluded materials.
- **Weighted Aesthetic Ranking**:
  $$\text{Score} = 0.45 \times \text{query\_match} + 0.25 \times \text{style\_match} + 0.20 \times \text{brand\_affinity} + 0.10 \times \text{discovery\_quality}$$
- **Two-Tier Curated Results**:
  1. *From your favorite brands*
  2. *Brands you might love* (with explicit affinity rationale)
- **Grounded AI Explanations**: Verifiable matching reasons backed by real garment attributes.
- **Conversational Refinements**: Follow-up directions (*"more relaxed"*, *"under $250 only"*, *"more interesting neckline"*) without losing prior constraints.
- **Interactive Feedback & Wishlist**: Rate recommendations to steer active session taste; persist saved pieces to your personal wishlist.

---

## 🛠️ Tech Stack

- **Vector Database**: PostgreSQL 16 with `pgvector` extension (HNSW cosine indexing for 768-dimensional normalized fashion embeddings)
- **AI / LLM Orchestration**: Autonomous multi-turn Agentic RAG powered by `@google/genai` (`gemini-3.8-flash`) with dynamic tool execution
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, TypeScript (`tsx`)
- **Typography**: Playfair Display (editorial serif) & Plus Jakarta Sans

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20+ recommended
- **Docker & Docker Compose**: for running PostgreSQL + `pgvector`
- **Gemini API Key**: from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kprast1/Thread.git
   cd Thread
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vector Database:
   ```bash
   npm run db:up
   ```
   *The PostgreSQL Docker container automatically initializes the schema, `pgvector` extension, 24 contemporary fashion brands, and 1,236 catalog garments with 768-dimensional embeddings from `db/init/01-init-database.sql`.*

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open your browser at `http://localhost:3000`.

---

## 📦 Scripts

- `npm run dev` — Starts the full-stack Express server with Vite middleware on port 3000.
- `npm run build` — Builds the client bundle into `dist/`.
- `npm run start` — Starts the production full-stack server.
- `npm run lint` — Validates TypeScript types across the codebase.
- `npm run db:up` — Launches Dockerized PostgreSQL + pgvector (auto-populates catalog).
- `npm run db:down` — Stops the PostgreSQL container.
- `npm run db:restore` — Manually re-applies the full database backup from `db/init/01-init-database.sql`.
- `npm run db:dump` — Exports the live database to `db/init/01-init-database.sql`.

---

## 🔒 License

Apache-2.0
