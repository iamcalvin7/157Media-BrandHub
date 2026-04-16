import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { SidebarLayout } from "@/components/layout/SidebarLayout";
import Home from "@/pages/home";
import BrandIdentity from "@/pages/brand-identity";
import BrandHistory from "@/pages/brand-history";
import Offers from "@/pages/offers";
import MonthlyPlanning from "@/pages/monthly-planning";
import Assets from "@/pages/assets";
import SocialMedia from "@/pages/social-media";
import SocialMediaExpert from "@/pages/social-media-expert";
import ContentIdeas from "@/pages/content-ideas";
import ContentCalendar from "@/pages/content-calendar";
import Copywriter from "@/pages/copywriter";
import CopywriterLibrary from "@/pages/copywriter-library";
import CopywriterRules from "@/pages/copywriter-rules";
import Events from "@/pages/events";
import Resources from "@/pages/resources";
import Settings from "@/pages/settings";
import SettingsPillars from "@/pages/settings-pillars";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <SidebarLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/brand-identity" component={BrandIdentity} />
        <Route path="/brand-history" component={BrandHistory} />
        <Route path="/offers" component={Offers} />
        <Route path="/monthly-planning" component={MonthlyPlanning} />
        <Route path="/assets" component={Assets} />
        <Route path="/social-media" component={SocialMedia} />
        <Route path="/social-media-expert" component={SocialMediaExpert} />
        <Route path="/content-ideas" component={ContentIdeas} />
        <Route path="/content-calendar" component={ContentCalendar} />
        <Route path="/copywriter" component={Copywriter} />
        <Route path="/copywriter-library" component={CopywriterLibrary} />
        <Route path="/copywriter-rules" component={CopywriterRules} />
        <Route path="/events" component={Events} />
        <Route path="/resources" component={Resources} />
        <Route path="/settings" component={Settings} />
        <Route path="/settings-pillars" component={SettingsPillars} />
        <Route component={NotFound} />
      </Switch>
    </SidebarLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
