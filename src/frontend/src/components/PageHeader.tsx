import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function PageHeader() {
  const { identity, clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <header className="w-full border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          to="/admin"
          className="flex items-center gap-3"
          data-ocid="nav.link"
        >
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">
              PTM
            </span>
          </div>
          <span className="font-semibold tracking-wider text-foreground text-sm uppercase">
            PTM Architect
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/admin"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            data-ocid="nav.link"
          >
            Students
          </Link>
          <Link
            to="/admin/student/new"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            data-ocid="nav.link"
          >
            Add Student
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {identity ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  Professor
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
                data-ocid="nav.button"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
