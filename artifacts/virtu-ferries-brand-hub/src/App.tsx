import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, useUser, useClerk } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import { queryClient } from "@/lib/queryClient";
import { BrandProvider, useBrand } from "@/lib/brand";
import { SidebarLayout } from "@/components/layout/SidebarLayout";

import BrandPicker from "@/pages/brand-picker";
import Home from "@/pages/home";
import BrandIdentity from "@/pages/brand-identity";
import BrandHistory from "@/pages/brand-history";
import UniqueSellingPoints from "@/pages/unique-selling-points";
import Offers from "@/pages/offers";
import Assets from "@/pages/assets";
import MediaLibraryPage from "@/pages/media-library";
import Templates from "@/pages/templates";
import Prints from "@/pages/prints";
import SocialMedia from "@/pages/social-media";
import ContentCalendar from "@/pages/content-calendar";
import Events from "@/pages/events";
import Resources from "@/pages/resources";
import SicilyTowns from "@/pages/sicily-towns";
import BlueFlagBeaches from "@/pages/blue-flag-beaches";
import SicilyResources from "@/pages/sicily-resources";
import MaltaResources from "@/pages/malta-resources";
import DestinationResources from "@/pages/destination-resources";
import BlueFlagBeachesMalta from "@/pages/blue-flag-beaches-malta";
import TravelInfo from "@/pages/travel-info";
import ScheduleFares from "@/pages/schedule-fares";
import OnboardExperience from "@/pages/onboard-experience";
import HopOnHopOff from "@/pages/hop-on-hop-off";
import Excursions from "@/pages/excursions";
import CustomerPromise from "@/pages/customer-promise";
import SavedItems from "@/pages/saved-items";
import Nico from "@/pages/nico";
import SkippedPosts from "@/pages/skipped-posts";
import Reposts from "@/pages/reposts";
import PerformanceReports from "@/pages/performance-reports";
import Settings from "@/pages/settings";
import SettingsPillars from "@/pages/settings-pillars";
import People from "@/pages/people";
import KnowledgeBase from "@/pages/knowledge-base";
import Scraper from "@/pages/scraper";
import Changelog from "@/pages/changelog";
import AdSpecs from "@/pages/ad-specs";
import DesignBrief from "@/pages/design-brief";
import ShareView from "@/pages/share-view";
import BriefView from "@/pages/brief-view";
import GhsResources from "@/pages/ghs-resources";
import MarketingRequests from "@/pages/marketing-requests";
import AdTracker from "@/pages/ad-tracker";
import EvergreenContent from "@/pages/evergreen-content";
import NotFound from "@/pages/not-found";

// ─── Auth gate ───────────────────────────────────────────────────────────────

interface ProvisionResponse {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const { openSignIn, signOut } = useClerk();

  // Wire the Clerk session JWT as the Bearer token for every API call.
  // setAuthTokenGetter is a module-level setter in @workspace/api-client-react.
  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
    return () => {
      setAuthTokenGetter(null);
    };
  }, [isSignedIn, getToken]);

  // Provision: create/update our internal users + user_identities records.
  // Runs once per sign-in session. Idempotent on the backend.
  const provisionQuery = useQuery<ProvisionResponse, Error & { status?: number }>({
    queryKey: ["auth-provision", clerkUser?.id],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/auth/provision", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: clerkUser?.firstName ?? null,
          lastName: clerkUser?.lastName ?? null,
          profileImageUrl: clerkUser?.imageUrl ?? null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        const err = new Error(
          data.error ?? "Provision failed",
        ) as Error & { status: number };
        err.status = res.status;
        throw err;
      }
      return res.json() as Promise<ProvisionResponse>;
    },
    enabled: isLoaded && !!isSignedIn && !!clerkUser,
    retry: false,
    staleTime: 1000 * 60 * 60, // re-provision at most once per hour (refreshes last_login_at)
    gcTime: 1000 * 60 * 60,
  });

  // Loading: Clerk initialising OR provision in-flight
  if (!isLoaded || (isSignedIn && clerkUser && provisionQuery.isPending)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 text-center px-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Virtu Ferries Brand Hub
            </h1>
            <p className="text-sm text-muted-foreground">
              Internal content management — authorised team only
            </p>
          </div>
          <button
            onClick={() => openSignIn()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  // Provision failed
  if (provisionQuery.isError) {
    const err = provisionQuery.error;
    const isNotAllowed = err.status === 403;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 text-center px-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isNotAllowed ? "Access Denied" : "Sign-in Error"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isNotAllowed
                ? "Your account has not been granted access to this application."
                : "An error occurred during sign-in. Please try again."}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-muted-foreground underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Brand-scoped routes ──────────────────────────────────────────────────────
function BrandedRoutes() {
  const { activeBrandSlug } = useBrand();
  const isGozo = activeBrandSlug === "gozo-highspeed";
  return (
    <SidebarLayout>
      <Switch>
        <Route path="/dashboard" component={Home} />
        <Route path="/brand-identity" component={BrandIdentity} />
        <Route path="/brand-history" component={BrandHistory} />
        <Route path="/unique-selling-points" component={UniqueSellingPoints} />
        <Route path="/offers" component={Offers} />
        <Route path="/assets" component={Assets} />
        <Route path="/media-library" component={MediaLibraryPage} />
        <Route path="/templates" component={Templates} />
        <Route path="/prints" component={Prints} />
        {isGozo && <Route path="/ghs-resources" component={GhsResources} />}
        <Route path="/social-media" component={SocialMedia} />
        <Route path="/content-calendar" component={ContentCalendar} />
        <Route path="/skipped-posts" component={SkippedPosts} />
        <Route path="/reposts" component={Reposts} />
        {activeBrandSlug === "virtu-ferries" && <Route path="/performance-reports" component={PerformanceReports} />}
        {activeBrandSlug === "virtu-ferries" && <Route path="/marketing-requests" component={MarketingRequests} />}
        <Route path="/ad-tracker" component={AdTracker} />
        <Route path="/evergreen-content" component={EvergreenContent} />
        <Route path="/events" component={Events} />
        <Route path="/resources" component={Resources} />
        <Route path="/sicily-towns" component={SicilyTowns} />
        <Route path="/blue-flag-beaches" component={BlueFlagBeaches} />
        <Route path="/destination-resources" component={DestinationResources} />
        <Route path="/sicily-resources" component={SicilyResources} />
        <Route path="/malta-resources" component={MaltaResources} />
        <Route path="/blue-flag-beaches-malta" component={BlueFlagBeachesMalta} />
        <Route path="/travel-info" component={TravelInfo} />
        <Route path="/schedule-fares" component={ScheduleFares} />
        <Route path="/onboard-experience" component={OnboardExperience} />
        <Route path="/excursions" component={Excursions} />
        <Route path="/hop-on-hop-off" component={HopOnHopOff} />
        <Route path="/customer-promise" component={CustomerPromise} />
        <Route path="/saved" component={SavedItems} />
        <Route path="/settings" component={Settings} />
        <Route path="/settings-pillars" component={SettingsPillars} />
        <Route path="/people" component={People} />
        <Route path="/knowledge-base" component={KnowledgeBase} />
        <Route path="/scraper" component={Scraper} />
        <Route path="/ad-specs" component={AdSpecs} />
        <Route path="/design-brief" component={DesignBrief} />
        <Route path="/changelog" component={Changelog} />
        <Route component={NotFound} />
      </Switch>
    </SidebarLayout>
  );
}

// Route guard: if no brand is active and the user is anywhere except the picker,
// bounce them back to "/" so they have to pick one before working.
function BrandGuard({ children }: { children: React.ReactNode }) {
  const { activeBrandSlug, isLoading } = useBrand();
  const [location, navigate] = useLocation();
  useEffect(() => {
    if (isLoading) return;
    if (!activeBrandSlug && location !== "/" && location !== "/nico") {
      navigate("/");
    }
  }, [activeBrandSlug, isLoading, location, navigate]);
  return <>{children}</>;
}

function AuthedAppRoutes() {
  return (
    <BrandProvider>
      <BrandGuard>
        <Switch>
          <Route path="/" component={BrandPicker} />
          {/* Nico's drop-zone — hub-level, lives outside any single brand */}
          <Route path="/nico" component={Nico} />
          <Route component={BrandedRoutes} />
        </Switch>
      </BrandGuard>
    </BrandProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            {/* Public share links — no auth required */}
            <Route path="/share/:token" component={ShareView} />
            <Route path="/brief/:token" component={BriefView} />
            {/* Everything else requires authentication */}
            <Route>
              <AuthGate>
                <AuthedAppRoutes />
              </AuthGate>
            </Route>
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
