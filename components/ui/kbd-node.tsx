'use client';

import * as React from 'react';

import type { PlateLeafProps } from 'platejs/react';

import { PlateLeaf } from 'platejs/react';

export function KbdLeaf(props: PlateLeafProps) {
  return (
    <PlateLeaf
      {...props}
      as="kbd"
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
    >
      {props.children}
    </PlateLeaf>
  );
}
