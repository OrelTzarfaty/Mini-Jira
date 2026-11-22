import { describe, expect, it } from 'vitest';

import stylesheet from './index.css?raw';

// Guards the contrast decisions in DESIGN.md: if someone changes a color token, the pairs that
// must stay readable are checked again (WCAG 2.2 AA, docs/engineering-standards.md §9).
const TEXT_MINIMUM = 4.5;
const CONTROL_MINIMUM = 3;

type Rgb = readonly [number, number, number];

function readRootTokens(css: string): Map<string, string> {
  const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const tokens = new Map<string, string>();

  for (const [, name, value] of rootBlock.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    if (name && value) {
      tokens.set(name, value.trim());
    }
  }

  return tokens;
}

// Follows var(--x) references until it reaches a color value.
function resolveToken(tokens: Map<string, string>, name: string): string {
  const value = tokens.get(name);

  if (value === undefined) {
    throw new Error(`index.css :root has no ${name}`);
  }

  const reference = /^var\((--[\w-]+)\)$/.exec(value)?.[1];

  return reference ? resolveToken(tokens, reference) : value;
}

// oklch() → sRGB (0–1), using the OKLab matrices from the CSS Color 4 specification.
function oklchToRgb(value: string): Rgb {
  const parts = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value);

  if (!parts) {
    throw new Error(`Expected an opaque oklch() color, got "${value}"`);
  }

  const [lightness, chroma, hue] = parts.slice(1).map(Number) as [number, number, number];
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const [red, green, blue] = linear.map((channel) => {
    const clamped = Math.min(Math.max(channel, 0), 1);

    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  }) as [number, number, number];

  return [red, green, blue];
}

function relativeLuminance([red, green, blue]: Rgb): number {
  const toLinear = (channel: number): number =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (x, y) => y - x,
  ) as [number, number];

  return (lighter + 0.05) / (darker + 0.05);
}

const tokens = readRootTokens(stylesheet);

function colorOf(token: string): Rgb {
  return oklchToRgb(resolveToken(tokens, token));
}

describe('design tokens', () => {
  it.each([
    ['--foreground', '--background', TEXT_MINIMUM],
    ['--foreground', '--muted', TEXT_MINIMUM],
    ['--muted-foreground', '--background', TEXT_MINIMUM],
    ['--muted-foreground', '--muted', TEXT_MINIMUM],
    ['--primary-foreground', '--primary', TEXT_MINIMUM],
    ['--primary', '--background', TEXT_MINIMUM],
    ['--destructive-foreground', '--destructive', TEXT_MINIMUM],
    ['--destructive', '--background', TEXT_MINIMUM],
    ['--ring', '--background', CONTROL_MINIMUM],
    ['--ring', '--muted', CONTROL_MINIMUM],
    ['--input', '--background', CONTROL_MINIMUM],
    ['--input', '--muted', CONTROL_MINIMUM],
  ])('SETUP-6: %s on %s has a contrast of at least %s:1', (foreground, background, minimum) => {
    const ratio = contrastRatio(colorOf(foreground), colorOf(background));

    expect(ratio).toBeGreaterThanOrEqual(minimum);
  });
});
