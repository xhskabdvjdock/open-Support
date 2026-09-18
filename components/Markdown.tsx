"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Minimal safe Markdown renderer: escapes HTML, supports the subset AI replies use. */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  let out = escapeHtml(text);
  // Inline code is always LTR and isolated so it never scrambles RTL sentences.
  out = out.replace(/`([^`]+)`/g, "<code class=\"md-code\" dir=\"ltr\">$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, "<a class=\"md-link\" href=\"$2\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>");
  return out;
}

interface Block {
  key: string;
  html?: string;
  code?: { lang: string; text: string };
}

function parse(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let n = 0;
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      // dir="auto": paragraph direction follows its first strong character,
      // so Arabic and English paragraphs each align and order correctly.
      blocks.push({ key: `p${n++}`, html: `<p class="md-p" dir="auto">${inline(para.join(" "))}</p>` });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const tag = list.ordered ? "ol" : "ul";
      const cls = list.ordered ? "md-ol" : "md-ul";
      blocks.push({
        key: `l${n++}`,
        html: `<${tag} class="${cls}">${list.items.map((it) => `<li dir="auto">${inline(it)}</li>`).join("")}</${tag}>`,
      });
      list = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flushPara();
      flushList();
      const lang = fence[1] || "code";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i] ?? "")) {
        buf.push(lines[i] ?? "");
        i++;
      }
      i++; // skip closing fence
      blocks.push({ key: `c${n++}`, code: { lang, text: buf.join("\n") } });
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      const level = heading[1]?.length ?? 2;
      blocks.push({ key: `h${n++}`, html: `<h${level} class="md-h${level}" dir="auto">${inline(heading[2] ?? "")}</h${level}>` });
      i++;
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const ordered = Boolean(ol);
      const item = (ul?.[1] ?? ol?.[1] ?? "").replace(/\[([ xX])\]\s*/, "");
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(item);
      i++;
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1] ?? "")) {
      flushPara();
      flushList();
      const headerCells = line.split("|").map((c) => c.trim()).filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i] ?? "")) {
        rows.push((lines[i] ?? "").split("|").map((c) => c.trim()).filter(Boolean));
        i++;
      }
      const table = `<div class="md-table-wrap"><table class="md-table"><thead><tr>${headerCells.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      blocks.push({ key: `t${n++}`, html: table });
      continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ key: `r${n++}`, html: `<hr class="md-hr" />` });
      i++;
      continue;
    }
    if (/^\s*$/.test(line)) {
      flushPara();
      flushList();
      i++;
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flushPara();
  flushList();
  return blocks;
}

function CodeBlock({ lang, text }: { lang: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };
  return (
    <div className="md-codeblock">
      <div className="md-codeblock-bar">
        <span className="md-codeblock-lang">{lang}</span>
        <button type="button" onClick={copy} className="md-copy-btn" aria-label={`Copy ${lang} code`}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy code"}</span>
        </button>
      </div>
      <pre className="md-pre"><code>{text}</code></pre>
    </div>
  );
}

export default function Markdown({ text }: { text: string }) {
  const blocks = parse(text);
  return (
    <div className="md-root">
      {blocks.map((b) =>
        b.code ? (
          <CodeBlock key={b.key} lang={b.code.lang} text={b.code.text} />
        ) : (
          <div key={b.key} dangerouslySetInnerHTML={{ __html: b.html ?? "" }} />
        ),
      )}
    </div>
  );
}
