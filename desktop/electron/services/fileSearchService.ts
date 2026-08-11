import { exec } from "child_process";

export interface FileSearchResult {
  name: string;
  path: string;
  modified: string | null;
}

function runPS(script: string, timeoutMs = 12000): Promise<string | null> {
  return new Promise((resolve) => {
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    exec(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
      { maxBuffer: 1024 * 1024 * 10, timeout: timeoutMs },
      (error, stdout) => {
        if (error || !stdout) {
          resolve(null);
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

/* ================= natural-language query parsing ================= */

const EXTENSION_GROUPS: Record<string, string[]> = {
  pdf: [".pdf"],
  word: [".doc", ".docx"],
  document: [".doc", ".docx", ".pdf", ".txt"],
  documents: [".doc", ".docx", ".pdf", ".txt"],
  excel: [".xls", ".xlsx"],
  spreadsheet: [".xls", ".xlsx"],
  ppt: [".ppt", ".pptx"],
  presentation: [".ppt", ".pptx"],
  photo: [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
  photos: [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
  image: [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
  images: [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
  picture: [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
  pictures: [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
  video: [".mp4", ".mkv", ".avi", ".mov", ".wmv"],
  videos: [".mp4", ".mkv", ".avi", ".mov", ".wmv"],
  text: [".txt"],
  zip: [".zip", ".rar", ".7z"],
  resume: [".pdf", ".doc", ".docx"],
  cv: [".pdf", ".doc", ".docx"],
};

const SEARCH_VERBS = [
  "find", "search", "locate", "dhundo", "dhundho", "dhoondo", "khojo",
  "kahan hai", "kaha hai", "where is", "show me", "mujhe dikhao", "mujhe do",
];

const STOPWORDS = /\b(my|mera|meri|mere|file|files|a|the|please|kripya|for me|ke liye)\b/g;

function startOfDay(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

interface ParsedQuery {
  extensions: string[];
  dateClause: string | null;
  keyword: string;
}

function parseQuery(raw: string): ParsedQuery {
  const lower = raw.toLowerCase();

  let extensions: string[] = [];
  for (const [word, exts] of Object.entries(EXTENSION_GROUPS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) {
      extensions = [...new Set([...extensions, ...exts])];
    }
  }

  const literalExt = lower.match(/\.[a-z0-9]{2,4}\b/g);
  if (literalExt) extensions = [...new Set([...extensions, ...literalExt])];

  const now = new Date();
  let dateClause: string | null = null;

  if (/\b(today|aaj)\b/.test(lower)) {
    dateClause = `System.DateModified >= '${startOfDay(now)}'`;
  } else if (/\b(yesterday|kal)\b/.test(lower)) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    dateClause = `System.DateModified >= '${startOfDay(y)}' AND System.DateModified < '${startOfDay(now)}'`;
  } else if (/\b(this week|is hafte|last 7 days)\b/.test(lower)) {
    const w = new Date(now);
    w.setDate(w.getDate() - 7);
    dateClause = `System.DateModified >= '${w.toISOString()}'`;
  } else if (/\b(last month|pichle mahine|this month|is mahine)\b/.test(lower)) {
    const m = new Date(now);
    m.setDate(m.getDate() - 30);
    dateClause = `System.DateModified >= '${m.toISOString()}'`;
  }

  let keyword = lower;
  for (const v of SEARCH_VERBS) keyword = keyword.replace(new RegExp(v, "g"), " ");
  for (const word of Object.keys(EXTENSION_GROUPS)) keyword = keyword.replace(new RegExp(`\\b${word}\\b`, "g"), " ");
  keyword = keyword.replace(/\.[a-z0-9]{2,4}\b/g, " ");
  keyword = keyword.replace(/\b(today|aaj|yesterday|kal|this week|is hafte|last 7 days|last month|pichle mahine|this month|is mahine)\b/g, " ");
  keyword = keyword.replace(STOPWORDS, " ").replace(/\s+/g, " ").trim();

  return { extensions, dateClause, keyword };
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function buildWhereClause(parsed: ParsedQuery): string | null {
  const clauses: string[] = [];

  if (parsed.extensions.length > 0) {
    const extClause = parsed.extensions
      .map(ext => `System.FileExtension = '${escapeSql(ext)}'`)
      .join(" OR ");
    clauses.push(`(${extClause})`);
  }

  if (parsed.keyword.length > 0) {
    clauses.push(`CONTAINS(System.FileName,'"${escapeSql(parsed.keyword)}*"')`);
  }

  if (parsed.dateClause) {
    clauses.push(parsed.dateClause);
  }

  if (clauses.length === 0) return null;

  return clauses.join(" AND ");
}

/* ================= public API ================= */

export async function searchFiles(query: string): Promise<FileSearchResult[]> {

  const parsed = parseQuery(query);
  const where = buildWhereClause(parsed);

  if (!where) return [];

  const sql =
    `SELECT TOP 15 System.ItemPathDisplay, System.ItemNameDisplay, System.DateModified ` +
    `FROM SystemIndex WHERE ${where} AND SCOPE='file:%USERPROFILE%\\' ` +
    `ORDER BY System.DateModified DESC`;

  const raw = await runPS(`
try {
  $sql = "${sql.replace(/%USERPROFILE%/g, "$env:USERPROFILE").replace(/"/g, '`"')}"
  $conn = New-Object -ComObject ADODB.Connection
  $conn.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows';")
  $rs = New-Object -ComObject ADODB.Recordset
  $rs.Open($sql, $conn)

  $results = New-Object System.Collections.ArrayList
  while (-not $rs.EOF) {
    [void]$results.Add([PSCustomObject]@{
      name = $rs.Fields.Item("System.ItemNameDisplay").Value
      path = $rs.Fields.Item("System.ItemPathDisplay").Value
      modified = $rs.Fields.Item("System.DateModified").Value
    })
    $rs.MoveNext()
  }
  $rs.Close()
  $conn.Close()
  $results | ConvertTo-Json -Compress
} catch {
  "[]"
}
`, 15000);

  if (!raw) return [];

  try {
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : [data];
    return list
      .filter((r: any) => r && r.name && r.path)
      .map((r: any) => ({
        name: String(r.name),
        path: String(r.path),
        modified: r.modified ? String(r.modified) : null,
      }));
  } catch {
    return [];
  }

}

export function openFileLocation(filePath: string): void {
  const safePath = filePath.replace(/"/g, "");
  exec(`explorer /select,"${safePath}"`);
}

export function openFile(filePath: string): void {
  const safePath = filePath.replace(/"/g, "");
  exec(`start "" "${safePath}"`);
}