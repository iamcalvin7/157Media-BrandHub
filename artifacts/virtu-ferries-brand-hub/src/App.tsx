import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { queryClient } from "@/lib/queryClient";
import { BrandProvider, useBrand } from "@/lib/brand";
import { SidebarLayout } from "@/components/layout/SidebarLayout";

import BrandPicker from "@/pages/brand-picker";
import Home from "@/pages/home";
import BrandIdentity from "@/pages/brand-identity";
import BrandHistory from "@/pages/brand-history";
import UniqueSellingPoints from "@/pages/unique-selling-points";
import Offers from "@/pages/offers";
import MonthlyPlanning from "@/pages/monthly-planning";
import Assets from "@/pages/assets";
import MediaLibraryPage from "@/pages/media-library";
import SocialMedia from "@/pages/social-media";
import SocialMediaExpert from "@/pages/social-media-expert";
import ContentIdeas from "@/pages/content-ideas";
import ContentCalendar from "@/pages/content-calendar";
import CopywriterCombined from "@/pages/copywriter-combined";
import Events from "@/pages/events";
import Resources from "@/pages/resources";
import TravelInfo from "@/pages/travel-info";
import ScheduleFares from "@/pages/schedule-fares";
import OnboardExperience from "@/pages/onboard-experience";
import Excursions from "@/pages/excursions";
import CustomerPromise from "@/pages/customer-promise";
import SavedItems from "@/pages/saved-items";
import Nico from "@/pages/nico";
import SkippedPosts from "@/pages/skipped-posts";
import Settings from "@/pages/settings";
import SettingsPillars from "@/pages/settings-pillars";
import KnowledgeBase from "@/pages/knowledge-base";
import Scraper from "@/pages/scraper";
import Changelog from "@/pages/changelog";
import ShareView from "@/pages/share-view";
import NotFound from "@/pages/not-found";

// Once a user picks a brand, all the existing brand-scoped pages live under /dashboard/*.
// The bare "/" path is reserved for the brand picker so people always land there fresh.
function BrandedRoutes() {
  return (
    <SidebarLayout>
      <Switch>
        <Route path="/dashboard" component={Home} />
        <Route path="/brand-identity" component={BrandIdentity} />
        <Route path="/brand-history" component={BrandHistory} />
        <Route path="/unique-selling-points" component={UniqueSellingPoints} />
        <Route path="/offers" component={Offers} />
        <Route path="/monthly-planning" component={MonthlyPlanning} />
        <Route path="/assets" component={Assets} />
        <Route path="/media-library" component={MediaLibraryPage} />
        <Route path="/social-media" component={SocialMedia} />
        <Route path="/social-media-expert" component={SocialMediaExpert} />
        <Route path="/content-ideas" component={ContentIdeas} />
        <Route path="/content-calendar" component={ContentCalendar} />
        <Route path="/skipped-posts" component={SkippedPosts} />
        <Route path="/copywriter" component={CopywriterCombined} />
        <Route path="/copywriter-library" component={CopywriterCombined} />
        <Route path="/copywriter-rules" component={CopywriterCombined} />
        <Route path="/events" component={Events} />
        <Route path="/resources" component={Resources} />
        <Route path="/travel-info" component={TravelInfo} />
        <Route path="/schedule-fares" component={ScheduleFares} />
        <Route path="/onboard-experience" component={OnboardExperience} />
        <Route path="/excursions" component={Excursions} />
        <Route path="/customer-promise" component={CustomerPromise} />
        <Route path="/saved" component={SavedItems} />
        <Route path="/nico" component={Nico} />
        <Route path="/settings" component={Settings} />
        <Route path="/settings-pillars" component={SettingsPillars} />
        <Route path="/knowledge-base" component={KnowledgeBase} />
        <Route path="/scraper" component={Scraper} />
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
    if (!activeBrandSlug && location !== "/") {
      navigate("/");
    }
  }, [activeBrandSlug, isLoading, location, navigate]);
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      {/* Public share links — no brand selection or auth needed */}
      <Route path="/share/:token" component={ShareView} />
      <Route>
        <BrandGuard>
          <Switch>
            <Route path="/" component={BrandPicker} />
            <Route component={BrandedRoutes} />
          </Switch>
        </BrandGuard>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </BrandProvider>
    </QueryClientProvider>
  );
}

export default App;
