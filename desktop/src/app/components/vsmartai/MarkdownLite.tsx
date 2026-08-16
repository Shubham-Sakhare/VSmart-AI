import type { ReactNode } from "react";

// Small, dependency-free markdown renderer — keeps bundle size and load
// time down (no remark/react-markdown). Supports the formatting AI
// replies actually use: **bold**, `inline code`, ```fenced code```,
// and - / * / 1. lists. Renders to React elements directly (no
// dangerouslySetInnerHTML), so there's no XSS surface either.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let idx = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-b-${idx++}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(
        <code key={`${keyPrefix}-c-${idx++}`} className="vsai-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function renderLiteMarkdown(text: string): ReactNode[] {
  const parts = text.split(/```([\s\S]*?)```/g);
  const blocks: ReactNode[] = [];

  parts.forEach((part, partIdx) => {
    const isCode = partIdx % 2 === 1;

    if (isCode) {
      const lines = part.split("\n");
      let lang = "";
      let code = part;
      if (lines.length > 1 && /^[a-zA-Z0-9_+-]{1,20}$/.test(lines[0].trim())) {
        lang = lines[0].trim();
        code = lines.slice(1).join("\n");
      }
      blocks.push(
        <pre key={`code-${partIdx}`} className="vsai-code-block">
          {lang && <span className="vsai-code-lang">{lang}</span>}
          <code>{code.replace(/\n$/, "")}</code>
        </pre>
      );
      return;
    }

    const lines = part.split("\n");
    let listBuffer: string[] = [];
    let listType: "ul" | "ol" | null = null;
    let paraBuffer: string[] = [];
    let key = 0;

    const flushPara = () => {
      if (paraBuffer.length) {
        const joined = paraBuffer.join("\n");
        if (joined.trim()) {
          blocks.push(
            <p key={`p-${partIdx}-${key++}`}>{renderInline(joined, `p-${partIdx}-${key}`)}</p>
          );
        }
        paraBuffer = [];
      }
    };

    const flushList = () => {
      if (listBuffer.length && listType) {
        const Tag = listType;
        blocks.push(
          <Tag key={`list-${partIdx}-${key++}`} className="vsai-md-list">
            {listBuffer.map((item, li) => (
              <li key={li}>{renderInline(item, `li-${partIdx}-${key}-${li}`)}</li>
            ))}
          </Tag>
        );
        listBuffer = [];
        listType = null;
      }
    };

    lines.forEach((line) => {
      const bulletMatch = /^\s*[-*]\s+(.*)/.exec(line);
      const numberMatch = /^\s*\d+\.\s+(.*)/.exec(line);

      if (bulletMatch) {
        flushPara();
        if (listType !== "ul") flushList();
        listType = "ul";
        listBuffer.push(bulletMatch[1]);
      } else if (numberMatch) {
        flushPara();
        if (listType !== "ol") flushList();
        listType = "ol";
        listBuffer.push(numberMatch[1]);
      } else {
        flushList();
        if (line.trim() === "") flushPara();
        else paraBuffer.push(line);
      }
    });

    flushList();
    flushPara();
  });

  return blocks;
}