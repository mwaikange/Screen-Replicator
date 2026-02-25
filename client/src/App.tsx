import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import FeedPage from "@/pages/feed";
import MapPage from "@/pages/map";
import ReportPage from "@/pages/report";
import GroupsPage from "@/pages/groups";
import GroupChatPage from "@/pages/group-chat";
import ProfilePage from "@/pages/profile";
import SubscribePage from "@/pages/subscribe";
import PostDetailPage from "@/pages/post-detail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/post/:id" component={PostDetailPage} />
      <Route path="/map" component={MapPage} />
      <Route path="/report" component={ReportPage} />
      <Route path="/groups" component={GroupsPage} />
      <Route path="/groups/:id" component={GroupChatPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/subscribe" component={SubscribePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
