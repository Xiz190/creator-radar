"use client";

import { usePrefs } from "@/contexts/prefs-context";
import { sourceNameFor } from "@/lib/source-names";

export { sourceNameFor };

export function SourceName({ name }: { name: string | null | undefined }) {
  const { language } = usePrefs();
  return <>{sourceNameFor(name, language)}</>;
}
