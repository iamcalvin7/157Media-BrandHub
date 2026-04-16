import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

export interface TeamMember {
  id: number;
  name: string;
  role: string | null;
}

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/team-members`);
      if (res.ok) setMembers(await res.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function addMember(name: string): Promise<TeamMember | null> {
    try {
      const res = await fetch(`${API}/api/team-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      const member: TeamMember = await res.json();
      setMembers(prev => {
        if (prev.some(m => m.id === member.id)) return prev;
        return [...prev, member].sort((a, b) => a.name.localeCompare(b.name));
      });
      return member;
    } catch { return null; }
  }

  async function removeMember(id: number) {
    await fetch(`${API}/api/team-members/${id}`, { method: "DELETE" });
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  return { members, loading, addMember, removeMember, refetch: fetchMembers };
}
