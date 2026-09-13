import React from "react";

interface RichTextViewProps {
  content?: string | null;
  className?: string;
}

/**
 * Parses inline formatting: bold (**text**), italic (*text* or _text_),
 * and links [label](url).
 * Uses React elements exclusively (never dangerouslySetInnerHTML) to ensure
 * absolute safety against XSS attacks.
 */
export function renderInlineContent(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  // Regex to match:
  // 1. Links: \[([^\]]+)\]\(([^)]+)\)
  // 2. Bold: \*\*([^*]+)\*\*
  // 3. Italic: \*([^*]+)\* or _([^_]+)_
  const inlineRegex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Link [text](url)
      const linkText = match[2];
      const rawUrl = match[3]?.trim();
      const isSafeUrl =
        rawUrl &&
        (rawUrl.startsWith("http://") ||
          rawUrl.startsWith("https://") ||
          rawUrl.startsWith("/") ||
          rawUrl.startsWith("mailto:"));

      if (isSafeUrl) {
        elements.push(
          <a
            key={`link-${match.index}`}
            href={rawUrl}
            target={rawUrl.startsWith("/") ? undefined : "_blank"}
            rel={rawUrl.startsWith("/") ? undefined : "noopener noreferrer"}
            className="text-ccf-gold underline underline-offset-2 hover:text-ccf-gold-light transition-colors"
          >
            {linkText}
          </a>
        );
      } else {
        // Unsafe protocol (e.g. javascript:) rendered as safe literal text
        elements.push(linkText);
      }
    } else if (match[4]) {
      // Bold **text**
      elements.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-ccf-offwhite">
          {match[5]}
        </strong>
      );
    } else if (match[6]) {
      // Italic *text*
      elements.push(
        <em key={`italic-${match.index}`} className="italic">
          {match[7]}
        </em>
      );
    } else if (match[8]) {
      // Italic _text_
      elements.push(
        <em key={`italic-u-${match.index}`} className="italic">
          {match[9]}
        </em>
      );
    }

    lastIndex = inlineRegex.lastIndex;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
}

/**
 * RichTextView safely parses structured markdown (headings, bullet/ordered lists,
 * links, bold, italic, paragraphs) into React elements with zero dangerouslySetInnerHTML.
 *
 * Compatible with legacy plain text (e.g. single-letter lines "S\nA\nM\nP\nLE").
 */
export function RichTextView({ content, className = "" }: RichTextViewProps) {
  if (!content || !content.trim()) {
    return null;
  }

  const rawBlocks = content.split(/\n{2,}/);
  const renderedBlocks: React.ReactNode[] = [];

  rawBlocks.forEach((block, blockIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const lines = trimmed.split("\n");

    // Case 1: Headings (e.g. ### Heading, ## Heading, # Heading)
    if (lines.length === 1 && /^#{1,6}\s/.test(trimmed)) {
      const level = trimmed.match(/^(#{1,6})\s/)?.[1].length || 3;
      const headingText = trimmed.replace(/^#{1,6}\s+/, "");

      if (level === 1) {
        renderedBlocks.push(
          <h1
            key={`h1-${blockIdx}`}
            className="text-xl md:text-2xl font-bold text-ccf-offwhite tracking-tight mt-3 mb-2"
          >
            {renderInlineContent(headingText)}
          </h1>
        );
      } else if (level === 2) {
        renderedBlocks.push(
          <h2
            key={`h2-${blockIdx}`}
            className="text-lg md:text-xl font-bold text-ccf-offwhite tracking-tight mt-3 mb-2"
          >
            {renderInlineContent(headingText)}
          </h2>
        );
      } else {
        renderedBlocks.push(
          <h3
            key={`h3-${blockIdx}`}
            className="text-base md:text-lg font-semibold text-ccf-offwhite mt-2 mb-1"
          >
            {renderInlineContent(headingText)}
          </h3>
        );
      }
      return;
    }

    // Case 2: Bullet list (- item or * item)
    const isBulletList = lines.every((l) => /^\s*[-*]\s+/.test(l));
    if (isBulletList) {
      renderedBlocks.push(
        <ul key={`ul-${blockIdx}`} className="list-disc list-inside space-y-1.5 text-ccf-muted my-2 pl-1">
          {lines.map((l, lIdx) => (
            <li key={`li-${lIdx}`} className="leading-relaxed">
              {renderInlineContent(l.replace(/^\s*[-*]\s+/, ""))}
            </li>
          ))}
        </ul>
      );
      return;
    }

    // Case 3: Numbered list (1. item, 2. item)
    const isNumberedList = lines.every((l) => /^\s*\d+\.\s+/.test(l));
    if (isNumberedList) {
      renderedBlocks.push(
        <ol key={`ol-${blockIdx}`} className="list-decimal list-inside space-y-1.5 text-ccf-muted my-2 pl-1">
          {lines.map((l, lIdx) => (
            <li key={`oli-${lIdx}`} className="leading-relaxed">
              {renderInlineContent(l.replace(/^\s*\d+\.\s+/, ""))}
            </li>
          ))}
        </ol>
      );
      return;
    }

    // Case 4: Standard Paragraph with preserved linebreaks
    renderedBlocks.push(
      <p key={`p-${blockIdx}`} className="leading-relaxed text-ccf-muted whitespace-pre-line my-1.5">
        {lines.map((line, lineIdx) => (
          <React.Fragment key={`l-${lineIdx}`}>
            {renderInlineContent(line)}
            {lineIdx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });

  if (renderedBlocks.length === 0) {
    return null;
  }

  return <div className={`space-y-2.5 text-sm md:text-base ${className}`}>{renderedBlocks}</div>;
}
