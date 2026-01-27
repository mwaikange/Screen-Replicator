import { useLocation, Link } from "wouter";
import { Home, MapPin, Plus, FolderClosed, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/feed", label: "Feed", icon: Home },
  { path: "/map", label: "Map", icon: MapPin },
  { path: "/report", label: "Report", icon: Plus, isSpecial: true },
  { path: "/files", label: "Files", icon: FolderClosed, disabled: true },
  { path: "/groups", label: "Groups", icon: Users },
  { path: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          if (item.disabled) {
            return (
              <div
                key={item.path}
                className="flex flex-col items-center justify-center flex-1 py-2 opacity-40 cursor-not-allowed"
                data-testid={`nav-${item.label.toLowerCase()}-disabled`}
              >
                <Icon className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-[10px] mt-1 text-muted-foreground">{item.label}</span>
              </div>
            );
          }

          if (item.isSpecial) {
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className="flex flex-col items-center justify-center flex-1 py-2 cursor-pointer"
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <div className={cn(
                    "rounded-md p-1.5",
                    isActive ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"
                  )}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <span className={cn(
                    "text-[10px] mt-1",
                    isActive ? "font-semibold text-primary" : "text-muted-foreground"
                  )}>{item.label}</span>
                </div>
              </Link>
            );
          }

          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 cursor-pointer transition-colors"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon 
                  className={cn("w-6 h-6", isActive ? "text-primary" : "text-muted-foreground")} 
                  strokeWidth={1.5} 
                />
                <span className={cn(
                  "text-[10px] mt-1",
                  isActive ? "font-semibold text-primary" : "text-muted-foreground"
                )}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
