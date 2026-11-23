import { createElement, forwardRef } from 'react';

/**
 * Honour Dynamic Type but cap it. The layouts use fixed line heights and fixed-size controls, so
 * uncapped accessibility sizes clip and overflow text. `Text.defaultProps` is ignored by React 19,
 * so swap the `Text` / `TextInput` exports for thin wrappers that default `maxFontSizeMultiplier`.
 * Import this once, first, from the root layout.
 */
const MAX_FONT_SCALE = 1.4;

function withCap<P extends { maxFontSizeMultiplier?: number }>(Original: React.ComponentType<P>, name: string) {
  const Capped = forwardRef<unknown, P>((props, ref) =>
    createElement(Original as React.ComponentType<unknown>, {
      maxFontSizeMultiplier: MAX_FONT_SCALE,
      ...props,
      ref,
    } as never),
  );
  Capped.displayName = name;
  return Capped;
}

// `require` (not `import * as`) so we patch the real module object, not an interop copy.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native') as Record<string, unknown>;
const OriginalText = RN.Text as React.ComponentType<never>;
const OriginalTextInput = RN.TextInput as React.ComponentType<never>;
const CappedText = withCap(OriginalText as never, 'Text');
const CappedTextInput = withCap(OriginalTextInput as never, 'TextInput');

try {
  Object.defineProperty(RN, 'Text', { configurable: true, enumerable: true, get: () => CappedText });
  Object.defineProperty(RN, 'TextInput', { configurable: true, enumerable: true, get: () => CappedTextInput });
} catch {
  // If the export can't be redefined, fall back to uncapped Dynamic Type.
}
