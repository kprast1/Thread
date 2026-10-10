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

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, TypeScript (`tsx`)
- **AI / LLM Orchestration**: `@google/genai` TypeScript SDK (`gemini-3.8-flash`) with server-side proxy
- **Typography**: Playfair Display (editorial serif) & Plus Jakarta Sans

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ installed
- A Gemini API key (optional, can be obtained from [Google AI Studio](https://aistudio.google.com/))

### Installation

1. Clone or download the repository:
   ```bash
   git clone https://github.com/<your-username>/thread-fashion-agent.git
   cd thread-fashion-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser at `http://localhost:3000`.

---

## 📦 Scripts

- `npm run dev` — Starts the full-stack Express server with Vite middleware on port 3000.
- `npm run build` — Builds the client bundle into `dist/`.
- `npm run start` — Starts the production full-stack server.
- `npm run lint` — Validates TypeScript types across the codebase.

---

## 🔒 License

Apache-2.0
