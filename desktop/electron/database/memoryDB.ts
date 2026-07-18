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