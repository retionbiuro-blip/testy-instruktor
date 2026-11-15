import { Fragment, ReactNode } from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  // Obsługa pogrubień (**tekst**), kursywy (*tekst*) i kodu (`tekst`)
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`${keyPrefix}-t-${idx++}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>
      );
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong
          key={`${keyPrefix}-b-${idx++}`}
          className="font-semibold text-slate-900 dark:text-white"
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`${keyPrefix}-c-${idx++}`}
          className="font-mono rounded bg-slate-100 px-1.5 py-0.5 text-[0.875em] text-slate-800 dark:bg-slate-800 dark:text-slate-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`${keyPrefix}-i-${idx++}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Fragment key={`${keyPrefix}-t-${idx++}`}>
        {text.slice(lastIndex)}
      </Fragment>
    );
  }

  return parts.length > 0 ? parts : [text];
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push(
        <hr
          key={`hr-${blockKey++}`}
          className="my-5 border-t border-slate-200 dark:border-slate-800"
        />
      );
      i++;
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const key = `h-${blockKey++}`;
      if (level === 1) {
        blocks.push(
          <h2
            key={key}
            className="font-display mt-6 mb-2.5 text-xl font-bold tracking-tight text-slate-900 first:mt-0 dark:text-white"
          >
            {renderInlineMarkdown(headingText, key)}
          </h2>
        );
      } else if (level === 2) {
        blocks.push(
          <h3
            key={key}
            className="font-display mt-5 mb-2 text-lg font-bold tracking-tight text-slate-900 first:mt-0 dark:text-white"
          >
            {renderInlineMarkdown(headingText, key)}
          </h3>
        );
      } else {
        blocks.push(
          <h4
            key={key}
            className="font-display mt-4 mb-1.5 text-base font-semibold text-slate-900 first:mt-0 dark:text-slate-100"
          >
            {renderInlineMarkdown(headingText, key)}
          </h4>
        );
      }
      i++;
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      const key = `ul-${blockKey++}`;
      blocks.push(
        <ul
          key={key}
          className="my-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300"
        >
          {listItems.map((item, idx) => (
            <li key={`${key}-li-${idx}`}>
              {renderInlineMarkdown(item, `${key}-li-${idx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      const key = `ol-${blockKey++}`;
      blocks.push(
        <ol
          key={key}
          className="my-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300"
        >
          {listItems.map((item, idx) => (
            <li key={`${key}-li-${idx}`}>
              {renderInlineMarkdown(item, `${key}-li-${idx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Zwykły akapit (łączymy sąsiadujące linie, które nie rozpoczynają nowego bloku)
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const nextTrimmed = lines[i].trim();
      if (
        !nextTrimmed ||
        /^(#{1,4})\s+/.test(nextTrimmed) ||
        /^[-*•]\s+/.test(nextTrimmed) ||
        /^\d+\.\s+/.test(nextTrimmed) ||
        /^(-{3,}|\*{3,})$/.test(nextTrimmed)
      ) {
        break;
      }
      paragraphLines.push(nextTrimmed);
      i++;
    }

    const key = `p-${blockKey++}`;
    blocks.push(
      <p
        key={key}
        className="my-3 text-[15px] leading-[1.7] text-slate-700 first:mt-0 last:mb-0 dark:text-slate-300"
      >
        {renderInlineMarkdown(paragraphLines.join(' '), key)}
      </p>
    );
  }

  return <div className={`max-w-[72ch] ${className}`}>{blocks}</div>;
}
