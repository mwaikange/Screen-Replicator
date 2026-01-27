import { useLocation, Link } from "wouter";
import { Home, Map, Plus, Briefcase, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/feed", label: "Feed", icon: Home },
  { path: "/map", label: "Map", icon: Map },
  { path: "/report", label: "Report", icon: Plus, isSpecial: true },
  { path: "/files", label: "Files", icon: Briefcase, disabled: true },
  { path: "/groups", label: "Groups", icon: Users },
  { path: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="grid grid-cols-6 h-16 w-full">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          if (item.disabled) {
            return (
              <div
                key={item.path}
                className="flex flex-col items-center justify-center py-2 opacity-40 cursor-not-allowed min-h-[64px]"
                data-testid={`nav-${item.label.toLowerCase()}-disabled`}
                aria-disabled="true"
                role="button"
              >
                <Icon className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                <span className="text-[10px] mt-1 text-gray-400">{item.label}</span>
              </div>
            );
          }

          if (item.isSpecial) {
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className="flex flex-col items-center justify-center py-2 cursor-pointer min-h-[64px] active:bg-gray-50"
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon 
                    className="w-5 h-5 text-primary" 
                    strokeWidth={2} 
                  />
                  <span className={cn(
                    "text-[10px] mt-1 text-primary",
                    isActive && "font-medium"
                  )}>{item.label}</span>
                </div>
              </Link>
            );
          }

          return (
            <Link key={item.path} href={item.path}>
              <div
                className="flex flex-col items-center justify-center py-2 cursor-pointer transition-colors min-h-[64px] active:bg-gray-50"
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon 
                  className={cn(
                    "w-5 h-5", 
                    isActive ? "text-primary" : "text-gray-500"
                  )} 
                  strokeWidth={1.5} 
                />
                <span className={cn(
                  "text-[10px] mt-1",
                  isActive ? "font-medium text-primary" : "text-gray-500"
                )}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
