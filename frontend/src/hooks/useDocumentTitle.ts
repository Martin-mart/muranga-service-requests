import { useEffect } from 'react';

const SUFFIX = "Murang'a County Service Requests";

/** Unique page titles: the first thing screen readers announce on navigation. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} | ${SUFFIX}` : SUFFIX;
  }, [title]);
}
