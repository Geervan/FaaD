import React from 'react';

interface FormattedTextProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function FormattedText({ content, className = '', style }: FormattedTextProps) {
  if (!content) return null;

  const lines = content.split('\n');

  // Helper to parse inline elements (links, bold, italic)
  const parseInline = (text: string): React.ReactNode[] => {
    // Combined regex for links [text](url), raw URLs, bold **text**, and italic *text*
    const tokenRegex = /(\[[^\]]+\]\((?:https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<]+|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, idx) => {
      // 1. Markdown link [text](url)
      const mdLinkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (mdLinkMatch) {
        const [, linkText, linkUrl] = mdLinkMatch;
        return (
          <a
            key={idx}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0055cc', textDecoration: 'underline', fontWeight: '600' }}
          >
            {linkText}
          </a>
        );
      }

      // 2. Raw URL
      if (/^https?:\/\/[^\s<]+$/.test(part)) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0055cc', textDecoration: 'underline' }}
          >
            {part}
          </a>
        );
      }

      // 3. Bold **text**
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }

      // 4. Italic *text*
      if (/^\*[^*]+\*$/.test(part)) {
        return <em key={idx}>{part.slice(1, -1)}</em>;
      }

      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  return (
    <div className={className} style={{ wordBreak: 'break-word', ...style }}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Header 1: #
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={lineIdx} style={{ fontSize: '18px', fontWeight: '700', margin: '10px 0 6px 0', color: '#0f172a' }}>
              {parseInline(trimmed.substring(2))}
            </h1>
          );
        }

        // Header 2: ##
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={lineIdx} style={{ fontSize: '16px', fontWeight: '700', margin: '10px 0 4px 0', color: '#0f172a' }}>
              {parseInline(trimmed.substring(3))}
            </h2>
          );
        }

        // Header 3: ###
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={lineIdx} style={{ fontSize: '14px', fontWeight: '700', margin: '8px 0 4px 0', color: '#0f172a' }}>
              {parseInline(trimmed.substring(4))}
            </h3>
          );
        }

        // Bullet points: - or *
        if (/^[-*]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={lineIdx} style={{ display: 'flex', gap: '6px', marginLeft: '12px', margin: '2px 0', lineHeight: '1.5' }}>
              <span style={{ color: '#0055cc', fontWeight: 'bold' }}>&bull;</span>
              <div>{parseInline(bulletText)}</div>
            </div>
          );
        }

        // Empty line
        if (!trimmed) {
          return <div key={lineIdx} style={{ height: '8px' }} />;
        }

        // Normal paragraph text
        return (
          <div key={lineIdx} style={{ lineHeight: '1.5', margin: '2px 0' }}>
            {parseInline(line)}
          </div>
        );
      })}
    </div>
  );
}
