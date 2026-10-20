import { useEffect, useState } from 'react';

export interface ChartColors {
  series: [string, string, string, string];
  grid: string;
  axis: string;
  surface: string;
}

const read = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function readColors(): ChartColors {
  return {
    series: [read('--chart-1'), read('--chart-2'), read('--chart-3'), read('--chart-4')],
    grid: read('--chart-grid'),
    axis: read('--chart-axis'),
    surface: read('--color-surface'),
  };
}

/**
 * SVG presentation attributes cannot use CSS var(), so chart colours are read
 * from the design tokens and re-read whenever the theme changes (explicit
 * toggle or OS preference). Keeps one source of truth: tokens.css.
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState(readColors);

  useEffect(() => {
    const update = () => {
      setColors(readColors());
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
  }, []);

  return colors;
}
