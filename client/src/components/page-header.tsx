import { Bell } from "lucide-react";
import appLogo from "@assets/image_1769491650275.png";

interface PageHeaderProps {
  title: string;
  showSearch?: boolean;
}

export function PageHeader({ title, showSearch = false }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <img src={appLogo} alt="Ngumu's Eye" className="w-9 h-9 rounded-md object-cover" />
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">Search</span>
            </div>
          )}
          <button className="relative p-2" data-testid="button-notifications">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
