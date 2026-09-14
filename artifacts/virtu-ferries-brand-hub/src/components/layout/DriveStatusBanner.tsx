import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <div
      role="alert"
      className="sticky top-16 md:top-0 z-40 border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Google Drive needs attention</p>
          <p className="mt-0.5 text-sm text-amber-900">{message}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="shrink-0 border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
        >
          <RefreshCw
            className={`mr-1.5 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}
          />
          Check again
        </Button>
      </div>
    </div>
  );
}