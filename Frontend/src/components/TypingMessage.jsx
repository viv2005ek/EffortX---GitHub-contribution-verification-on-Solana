import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Global set to track which messages have already been typed
const typedMessages = new Set();

/**
 * TypingMessage
 * -------------
 * Progressively reveals `text` character-by-character at `speed` ms/char.
 * Uses a local `displayed` state that grows until it equals the full text.
 * Shows a blinking cursor while typing is in progress.
 * If the message has already been typed (tracked via global set), it displays instantly.
 */
const markdownComponents = {
  p:          ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  h1:         ({ node, ...props }) => <h1 className="text-xl font-bold mb-2" {...props} />,
  h2:         ({ node, ...props }) => <h2 className="text-lg font-bold mb-2" {...props} />,
  h3:         ({ node, ...props }) => <h3 className="text-md font-bold mb-1" {...props} />,
  ul:         ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
  ol:         ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
  li:         ({ node, ...props }) => <li className="mb-1" {...props} />,
  strong:     ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
  em:         ({ node, ...props }) => <em className="italic text-white/90" {...props} />,
  code:       ({ node, inline, ...props }) =>
    inline
      ? <code className="bg-white/10 px-1.5 py-0.5 rounded text-accent-green font-mono text-[10px]" {...props} />
      : <pre className="bg-black/40 p-4 rounded-xl my-3 overflow-x-auto border border-white/5"><code className="text-xs font-mono text-accent-green" {...props} /></pre>,
  table:      ({ node, ...props }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border border-white/10 rounded-lg overflow-hidden" {...props} />
    </div>
  ),
  thead:      ({ node, ...props }) => <thead className="bg-white/5" {...props} />,
  th:         ({ node, ...props }) => <th className="px-4 py-2 border-b border-white/10 text-left text-xs font-bold uppercase tracking-wider" {...props} />,
  td:         ({ node, ...props }) => <td className="px-4 py-2 border-b border-white/5 text-sm" {...props} />,
  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-accent-green/30 pl-4 italic my-2 text-white/70" {...props} />,
  a:          ({ node, ...props }) => <a className="text-accent-green hover:underline" {...props} target="_blank" rel="noopener noreferrer" />,
};

export default function TypingMessage({ text, speed = 25 }) {
  // Memoize the initial check so it doesn't flip to true on re-renders while typing
  const isAlreadyTyped = React.useMemo(() => typedMessages.has(text), [text]);
  
  const [displayed, setDisplayed] = useState(isAlreadyTyped ? text : '');
  const [done, setDone]           = useState(isAlreadyTyped);
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isAlreadyTyped) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    // Immediately mark as typed so it doesn't re-type if interrupted
    typedMessages.add(text);

    // Reset whenever text changes (new message key)
    indexRef.current = 0;
    setDisplayed('');
    setDone(false);

    // For very long texts, use a faster tick so it never feels laggy
    const charSpeed = text.length > 600 ? Math.min(speed, 12) : speed;

    const tick = () => {
      if (indexRef.current < text.length) {
        indexRef.current += 1;
        setDisplayed(text.slice(0, indexRef.current));
        timerRef.current = setTimeout(tick, charSpeed);
      } else {
        setDone(true);
      }
    };

    timerRef.current = setTimeout(tick, charSpeed);

    return () => clearTimeout(timerRef.current);
  }, [text, speed, isAlreadyTyped]);

  return (
    <span className="leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {displayed}
      </ReactMarkdown>

      {/* Blinking cursor shown while typing */}
      {!done && (
        <span
          aria-hidden="true"
          className="inline-block w-[2px] h-[1em] bg-accent-green ml-0.5 align-middle animate-[blink_0.85s_step-end_infinite]"
        />
      )}
    </span>
  );
}
