import { useState, useEffect } from "react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface Pillar {
  id: number;
  name: string;
  market: string; // 'english' | 'italian' | 'both'
  sort_order: number;
  active: boolean;
}

export function usePillars() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/content/pillars`)
      .then(r => r.json())
      .then(data => { setPillars(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activePillars = pillars.filter(p => p.active);
  const englishPillars = activePillars.filter(p => p.market === "english" || p.market === "both").map(p => p.name);
  const italianPillars = activePillars.filter(p => p.market === "italian" || p.market === "both").map(p => p.name);
  const allPillars = [...new Set(activePillars.map(p => p.name))];

  return { pillars, activePillars, englishPillars, italianPillars, allPillars, loading };
}
