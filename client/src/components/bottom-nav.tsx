import { useLocation, Link } from "wouter";
import { Home, Map, Plus, FolderOpen, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/feed", label: "Feed", icon: Home },
  { path: "/map", label: "Map", icon: Map },
  { path: "/report", label: "Report", icon: Plus },
  { path: "/files", label: "Files", icon: FolderOpen, disabled: true },
  { path: "/groups", label: "Groups", icon: Users },
  { path: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          if (item.disabled) {
            return (
              <div
                key={item.path}
                className="flex flex-col items-center justify-center flex-1 h-full opacity-40 cursor-not-allowed"
                data-testid={`nav-${item.label.toLowerCase()}-disabled`}
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs mt-1 text-muted-foreground">{item.label}</span>
              </div>
            );
          }

          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {item.path === "/report" ? (
                  <div className="bg-primary text-primary-foreground rounded-md p-2">
                    <Icon className="w-5 h-5" />
                  </div>
                ) : (
                  <>
                    <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                    <span className={cn("text-xs mt-1", isActive ? "font-semibold text-primary" : "")}>{item.label}</span>
                  </>
                )}
                {item.path === "/report" && (
                  <span className={cn("text-xs mt-1", isActive ? "font-semibold text-primary" : "")}>Report</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
