import { memo, useMemo, useRef, useLayoutEffect } from 'react';
import katex from 'katex';
import { toLatex } from '../ast/latex';
import type { Expression } from '../ast/types';
import { interactiveLatex, type InteractiveOptions } from '../ast/interactiveLatex';

export const MathText = memo(function MathText({
  node,
  latex,
  className = '',
  interactive,
}: {
  node?: Expression;
  latex?: string;
  className?: string;
  interactive?: InteractiveOptions;
}) {
  const source =
    latex ??
    (node
      ? interactive
        ? interactiveLatex(node, {
            prefix: interactive.prefix,
            parenthesized: interactive.parenthesized,
          })
        : toLatex(node)
      : '');
  const html = useMemo(
    () =>
      katex.renderToString(source, {
        throwOnError: false,
        strict: false,
        trust: interactive ? (context) => context.command === '\\htmlData' : false,
        output: 'htmlAndMathml',
      }),
    [source, Boolean(interactive)],
  );
  const markup = useMemo(() => ({ __html: html }), [html]);
  const element = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    for (const part of element.current?.querySelectorAll<HTMLElement>('[data-node-path]') ?? []) {
      if (part.dataset.nodePath === interactive?.selected) part.dataset.partSelected = 'true';
      else delete part.dataset.partSelected;
      if (part.dataset.nodePath === interactive?.target) part.dataset.partTarget = 'true';
      else delete part.dataset.partTarget;
    }
  }, [html, interactive?.selected, interactive?.target]);
  return (
    <span
      ref={element}
      key={interactive ? 'interactive' : source}
      className={`math-text ${interactive ? 'interactive-math' : ''} ${className}`}
      dangerouslySetInnerHTML={markup}
    />
  );
});
