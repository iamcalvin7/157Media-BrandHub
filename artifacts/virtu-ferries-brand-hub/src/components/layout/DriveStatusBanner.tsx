import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type DriveStatus = {
  healthy: boolean;
  configuration: {
    configured: boolean;
    missing: string[];
  };
  access: "verified" | "unavailable";
  unresolved_posts: number;
};

export function DriveStatusBanner() {
  const { activeBrand } = useBrand();
  const [expanded, setExpanded] = useState(false);
  const query = useQuery<DriveStatus>({
    queryKey: ["drive-status", activeBrand?.slug],
    enabled: Boolean(activeBrand?.slug),
    queryFn: async () => {
      const response = await fetch(`${API}/api/drive-status`);
      if (!response.ok) throw new Error("Drive status could not be checked");
      return response.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    const refresh = () => void query.refetch();
    window.addEventListener("drive-status-changed", refresh);
    return () => window.removeEventListener("drive-status-changed", refresh);
  }, [query.refetch]);

  useEffect(() => {
    setExpanded(false);
  }, [activeBrand?.slug]);

  if (!query.isError && (!query.data || query.data.healthy)) return null;

  const message = query.isError
    ? "Google Drive status could not be verified. Calendar folders may not be created."
    : !query.data.configuration.configured
      ? "Google Drive folder settings are incomplete. New calendar folders cannot be created."
      : query.data.access !== "verified"
        ? "Google Drive is unavailable or no longer writable. New calendar folders may fail."
        : `${query.data.unresolved_posts} calendar ${
            query.data.unresolved_posts === 1 ? "post does" : "posts do"
          } not have a Google Drive folder.`;

  const summary = query.isError
    ? "Drive status unavailable"
    : query.data.unresolved_posts > 0
      ? `${query.data.unresolved_posts} posts missing Drive folders`
      : "Google Drive needs attention";

  return (
    <div
      role="alert"
      className="sticky top-16 md:top-0 z-40 border-b border-amber-200 bg-amber-50/95 text-amber-950 shadow-sm backdrop-blur"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex h-10 items-center gap-2 px-3 sm:px-4">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            <span className="truncate text-xs font-semibold sm:text-sm">{summary}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-amber-700 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
          <button
          type="button"
          aria-label="Check Google Drive again"
          title="Check again"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}
          />
          </button>
        </div>
        {expanded && (
          <div className="border-t border-amber-200/70 px-9 pb-2.5 pt-2 text-xs leading-relaxed text-amber-900 sm:px-10 sm:text-sm">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}