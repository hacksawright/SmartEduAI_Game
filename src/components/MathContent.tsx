import { InlineMath, BlockMath } from "react-katex";
import { Fragment } from "react";

/**
 * Render plain text với inline KaTeX: $...$ và block KaTeX: $$...$$
 * Hỗ trợ **bold** đơn giản.
 */
export function MathContent({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  // Split by $$ block first
  const blocks = text.split(/(\$\$[^$]+\$\$)/g);
  return (
    <span className={className}>
      {blocks.map((blk, i) => {
        if (blk.startsWith("$$") && blk.endsWith("$$")) {
          return <BlockMath key={i} math={blk.slice(2, -2)} />;
        }
        // inline $...$
        const parts = blk.split(/(\$[^$]+\$)/g);
        return (
          <Fragment key={i}>
            {parts.map((p, j) => {
              if (p.startsWith("$") && p.endsWith("$") && p.length > 2) {
                return <InlineMath key={j} math={p.slice(1, -1)} />;
              }
              // bold **...**
              const bold = p.split(/(\*\*[^*]+\*\*)/g);
              return (
                <Fragment key={j}>
                  {bold.map((b, k) =>
                    b.startsWith("**") && b.endsWith("**") ? (
                      <strong key={k}>{b.slice(2, -2)}</strong>
                    ) : (
                      <Fragment key={k}>{b}</Fragment>
                    )
                  )}
                </Fragment>
              );
            })}
          </Fragment>
        );
      })}
    </span>
  );
}
