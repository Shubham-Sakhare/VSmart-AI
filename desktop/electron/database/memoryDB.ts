import Database from "better-sqlite3";
import path from "path";


const dbPath = path.join(
  process.cwd(),
  "vsmart-memory.db"
);


const db = new Database(dbPath);


// Create memory table

db.prepare(`
CREATE TABLE IF NOT EXISTS memories (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    key TEXT UNIQUE,

    value TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP

)
`).run();

// Separate table for genuine "facts about the user" (long-term AI memory),
// kept apart from `memories` above (which is a generic app-settings KV
// store used by the UI - sidebar prefs, launcher state, conversations,
// etc.). Keeping facts separate means semantic search only ever runs over
// real user facts, not JSON blobs of app state.
db.prepare(`
CREATE TABLE IF NOT EXISTS memory_facts (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    fact_key TEXT UNIQUE,

    fact_value TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

)
`).run();



export function saveMemory(
    key:string,
    value:string
){

    const stmt = db.prepare(`
        INSERT INTO memories(key,value)
        VALUES(?,?)
        ON CONFLICT(key)
        DO UPDATE SET value=excluded.value
    `);


    stmt.run(
        key,
        value
    );

}



export function getMemory(
    key:string
){

    const stmt = db.prepare(`
        SELECT value 
        FROM memories
        WHERE key=?
    `);


    const result = stmt.get(key) as
    {value:string} | undefined;


    return result?.value || null;

}



export function getAllMemory(){

    return db.prepare(`
        SELECT * FROM memories
    `).all();

}

/* ================= long-term "facts about the user" memory ================= */

export interface MemoryFact {
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export function saveFact(key: string, value: string): void {
  const normalizedKey = key.trim().toLowerCase();

  db.prepare(`
    INSERT INTO memory_facts(fact_key, fact_value)
    VALUES(?, ?)
    ON CONFLICT(fact_key)
    DO UPDATE SET fact_value = excluded.fact_value, updated_at = CURRENT_TIMESTAMP
  `).run(normalizedKey, value);
}

export function getFact(key: string): string | null {
  const normalizedKey = key.trim().toLowerCase();

  const result = db.prepare(`
    SELECT fact_value FROM memory_facts WHERE fact_key = ?
  `).get(normalizedKey) as { fact_value: string } | undefined;

  return result?.fact_value ?? null;
}

export function getAllFacts(): MemoryFact[] {
  return db.prepare(`
    SELECT fact_key as key, fact_value as value, created_at, updated_at
    FROM memory_facts
    ORDER BY updated_at DESC
  `).all() as MemoryFact[];
}

export function deleteFact(key: string): boolean {
  const normalizedKey = key.trim().toLowerCase();
  const result = db.prepare(`DELETE FROM memory_facts WHERE fact_key = ?`).run(normalizedKey);
  return result.changes > 0;
}

/* ---------- lightweight TF-IDF vector search (offline, zero dependencies) ---------- */
// Not a neural embedding model (no Silero/OpenAI-style embeddings) — this
// builds classic TF-IDF vectors over the stored facts and ranks them by
// cosine similarity to the query. Genuinely a vector search, just a
// lexical one rather than a semantic/neural one. Good enough for a
// personal fact store of a few hundred entries, entirely offline.

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1);
}

export interface FactMatch {
  key: string;
  value: string;
  score: number;
}

export function searchFacts(query: string, topK = 5, minScore = 0.05): FactMatch[] {

  const facts = getAllFacts();
  if (facts.length === 0) return [];

  const docs = facts.map(f => tokenize(`${f.key} ${f.value}`));
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const N = docs.length;

  // document frequency per term
  const df = new Map<string, number>();
  for (const doc of docs) {
    const seen = new Set(doc);
    for (const term of seen) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const idf = (term: string) => Math.log((N + 1) / ((df.get(term) ?? 0) + 1)) + 1;

  function tfVector(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const vec = new Map<string, number>();
    for (const [term, count] of tf) {
      vec.set(term, (count / tokens.length) * idf(term));
    }
    return vec;
  }

  function cosineSim(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0, normA = 0, normB = 0;
    for (const v of a.values()) normA += v * v;
    for (const v of b.values()) normB += v * v;
    for (const [term, va] of a) {
      const vb = b.get(term);
      if (vb) dot += va * vb;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  const queryVec = tfVector(queryTokens);

  const scored = facts.map((f, i) => ({
    key: f.key,
    value: f.value,
    score: cosineSim(queryVec, tfVector(docs[i]))
  }));

  return scored
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}