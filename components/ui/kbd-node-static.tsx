import * as React from 'react';

import type { SlateLeafProps } from 'platejs/static';

import { SlateLeaf } from 'platejs/static';

export function KbdLeafStatic(props: SlateLeafProps) {
  return (
    <SlateLeaf
      {...props}
      as="kbd"
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
    >
      {props.children}
    </SlateLeaf>
  );
}
