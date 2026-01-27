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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
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
                <Icon className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <span className="text-[11px] mt-1 text-gray-400">{item.label}</span>
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
                  <Icon 
                    className={cn(
                      "w-6 h-6",
                      isActive ? "text-primary" : "text-primary"
                    )} 
                    strokeWidth={2} 
                  />
                  <span className={cn(
                    "text-[11px] mt-1",
                    isActive ? "font-medium text-primary" : "text-primary"
                  )}>{item.label}</span>
                </div>
              </Link>
            );
          }

          return (
            <Link key={item.path} href={item.path}>
              <div
                className="flex flex-col items-center justify-center flex-1 py-2 cursor-pointer transition-colors"
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon 
                  className={cn(
                    "w-6 h-6", 
                    isActive ? "text-primary" : "text-gray-500"
                  )} 
                  strokeWidth={1.5} 
                />
                <span className={cn(
                  "text-[11px] mt-1",
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
