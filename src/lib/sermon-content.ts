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
