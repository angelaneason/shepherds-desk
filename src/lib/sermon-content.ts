/**
 * Normalizes sermon content for TipTap editor.
 * Handles:
 * 1. Clean TipTap JSON documents
 * 2. Stringified JSON documents from API or mobile
 * 3. Accidentally corrupted / embedded JSON strings in text nodes (e.g., 'ROO{"type":"doc"...')
 * 4. Plain text / HTML strings
 */
export function normalizeSermonContent(rawContent: any): any {
  if (!rawContent) return "";

  // 1. If it's a string
  if (typeof rawContent === "string") {
    const trimmed = rawContent.trim();
    if (!trimmed) return "";

    // Check if it's direct stringified JSON
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeSermonContent(parsed);
      } catch {
        // Continue to check for embedded JSON
      }
    }

    // Check if it contains embedded TipTap JSON (e.g., 'ROO{"type":"doc"...')
    const jsonMatch = trimmed.match(/\{.*"type"\s*:\s*"doc".*\}/s);
    if (jsonMatch) {
      try {
        let jsonStr = jsonMatch[0]
          .replace(/"paragrs":\{"textAlign":null\}:/g, '"paragraph","attrs":{"textAlign":null},"content":')
          .replace(/"type":"paragrs"/g, '"type":"paragraph"')
          .replace(/"type":"doc":/g, '"type":"doc","content":');
        const parsed = JSON.parse(jsonStr);
        return normalizeSermonContent(parsed);
      } catch {
        // Fallback: extract all readable text values from the JSON string
        const regex = /"text":"([^"]+)"/g;
        const textMatches = [];
        let m;
        while ((m = regex.exec(trimmed)) !== null) {
          textMatches.push(m[1]);
        }
        if (textMatches.length > 0) {
          return {
            type: "doc",
            content: textMatches.map(text => ({
              type: "paragraph",
              content: [{ type: "text", text }]
            }))
          };
        }
      }
    }

    // If it's plain text without HTML tags, split by newlines into paragraphs
    if (!trimmed.includes("<") && !trimmed.includes(">")) {
      const lines = trimmed.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        return {
          type: "doc",
          content: lines.map(line => ({
            type: "paragraph",
            content: [{ type: "text", text: line }]
          }))
        };
      }
    }

    return rawContent;
  }

  // 2. If it's a TipTap document object
  if (typeof rawContent === "object" && rawContent.type === "doc" && Array.isArray(rawContent.content)) {
    // Check if content is corrupted with text nodes containing JSON
    let isCorrupted = false;
    for (const block of rawContent.content) {
      if (block.content && Array.isArray(block.content)) {
        for (const inline of block.content) {
          if (
            inline.text &&
            (inline.text.includes('{"type":"doc"') ||
             inline.text.includes('"type":"paragraph"') ||
             inline.text.startsWith('ROO{'))
          ) {
            isCorrupted = true;
            break;
          }
        }
      }
      if (isCorrupted) break;
    }

    if (isCorrupted) {
      // Find the corrupted text and re-normalize it
      for (const block of rawContent.content) {
        if (block.content && Array.isArray(block.content)) {
          for (const inline of block.content) {
            if (inline.text && (inline.text.includes('{"type":"doc"') || inline.text.includes('ROO{'))) {
              return normalizeSermonContent(inline.text);
            }
          }
        }
      }
    }

    return rawContent;
  }

  return rawContent;
}

/**
 * Creates a valid TipTap JSON doc from plain text lines.
 */
export function plainTextToTipTap(text: string) {
  if (!text) {
    return { type: "doc", content: [{ type: "paragraph", content: [] }] };
  }
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  return {
    type: "doc",
    content: lines.length > 0
      ? lines.map(line => ({ type: "paragraph", content: [{ type: "text", text: line }] }))
      : [{ type: "paragraph", content: [{ type: "text", text }] }]
  };
}

/**
 * Converts sermon content (TipTap JSON or plain text) into clean printable HTML.
 */
export function sermonContentToHtml(rawContent: any): string {
  if (!rawContent) return "";

  const normalized = normalizeSermonContent(rawContent);

  if (typeof normalized === "string") {
    if (normalized.includes("<p>") || normalized.includes("<h1>") || normalized.includes("<div>")) {
      return normalized;
    }
    return normalized
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => `<p style="margin-bottom: 1em;">${line}</p>`)
      .join("");
  }

  if (typeof normalized === "object" && normalized.type === "doc" && Array.isArray(normalized.content)) {
    return renderNodes(normalized.content);
  }

  return "";
}

function renderNodes(nodes: any[]): string {
  if (!Array.isArray(nodes)) return "";

  return nodes.map(node => {
    const textContent = renderInlineContent(node.content);

    switch (node.type) {
      case "paragraph":
        return `<p style="margin-bottom: 1em; line-height: 1.6;">${textContent || "&nbsp;"}</p>`;
      case "heading": {
        const level = node.attrs?.level || 2;
        const size = level === 1 ? "1.8em" : level === 2 ? "1.4em" : "1.2em";
        const margin = level === 1 ? "1.2em 0 0.4em 0" : "1em 0 0.3em 0";
        return `<h${level} style="font-size: ${size}; margin: ${margin}; font-weight: bold; color: #022d5c;">${textContent}</h${level}>`;
      }
      case "blockquote":
        return `<blockquote style="border-left: 3px solid #D0A348; padding-left: 14px; margin: 1em 0; font-style: italic; color: #374151;">${renderNodes(node.content)}</blockquote>`;
      case "bulletList":
        return `<ul style="list-style-type: disc; margin: 0.8em 0; padding-left: 24px;">${renderNodes(node.content)}</ul>`;
      case "orderedList":
        return `<ol style="list-style-type: decimal; margin: 0.8em 0; padding-left: 24px;">${renderNodes(node.content)}</ol>`;
      case "listItem":
        return `<li style="margin-bottom: 0.4em;">${renderNodes(node.content)}</li>`;
      default:
        return textContent ? `<p style="margin-bottom: 1em;">${textContent}</p>` : "";
    }
  }).join("");
}

function renderInlineContent(inlines: any[]): string {
  if (!Array.isArray(inlines)) return "";

  return inlines.map(inline => {
    let text = inline.text || "";
    if (!text) return "";

    if (Array.isArray(inline.marks)) {
      inline.marks.forEach((mark: any) => {
        if (mark.type === "bold") text = `<strong>${text}</strong>`;
        if (mark.type === "italic") text = `<em>${text}</em>`;
        if (mark.type === "underline") text = `<u>${text}</u>`;
        if (mark.type === "highlight") text = `<mark style="background: #fef08a; padding: 0 2px;">${text}</mark>`;
      });
    }
    return text;
  }).join("");
}

/**
 * Extracts a concise Pulpit Outline from sermon content.
 * Returns an array of outline items (headings, key points, scriptures).
 */
export function extractSermonOutline(rawContent: any): { level: number; text: string }[] {
  if (!rawContent) return [];

  const normalized = normalizeSermonContent(rawContent);
  const items: { level: number; text: string }[] = [];

  if (typeof normalized === "string") {
    const lines = normalized.split("\n").map(l => l.trim()).filter(Boolean);
    lines.forEach(line => {
      if (line.startsWith("# ")) {
        items.push({ level: 1, text: line.replace(/^#\s*/, "") });
      } else if (line.startsWith("## ")) {
        items.push({ level: 2, text: line.replace(/^##\s*/, "") });
      } else if (line.startsWith("### ")) {
        items.push({ level: 3, text: line.replace(/^###\s*/, "") });
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        items.push({ level: 4, text: line.replace(/^[-*]\s*/, "") });
      } else if (/^(Point|I\.|II\.|III\.|IV\.|V\.|1\.|2\.|3\.|4\.|5\.)/i.test(line)) {
        items.push({ level: 2, text: line });
      }
    });
    return items;
  }

  if (typeof normalized === "object" && normalized.type === "doc" && Array.isArray(normalized.content)) {
    normalized.content.forEach((block: any) => {
      const text = (block.content || []).map((c: any) => c.text || "").join("").trim();
      if (!text) return;

      if (block.type === "heading") {
        items.push({ level: block.attrs?.level || 2, text });
      } else if (block.type === "blockquote") {
        items.push({ level: 3, text: `"${text}"` });
      } else if (block.type === "bulletList" || block.type === "orderedList") {
        (block.content || []).forEach((li: any) => {
          const liText = (li.content || []).flatMap((c: any) => (c.content || []).map((t: any) => t.text || "")).join("").trim();
          if (liText) items.push({ level: 4, text: liText });
        });
      } else if (block.type === "paragraph") {
        // Check if paragraph is bold or marked as a point
        const isBoldOnly = block.content?.length === 1 && block.content[0]?.marks?.some((m: any) => m.type === "bold");
        if (isBoldOnly || /^(Point|I\.|II\.|III\.|IV\.|V\.|1\.|2\.|3\.|4\.|5\.)/i.test(text)) {
          items.push({ level: 2, text });
        }
      }
    });
  }

  return items;
}

