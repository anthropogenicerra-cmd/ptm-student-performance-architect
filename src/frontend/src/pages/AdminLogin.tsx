import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import { GraduationCap, Loader2, Lock, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useClaimFirstAdmin,
  useIsAdminAssigned,
  useIsCallerAdmin,
} from "../hooks/useQueries";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, loginStatus, identity } = useInternetIdentity();
  const { isFetching: actorFetching } = useActor();
  const {
    data: isAdmin,
    isLoading: adminLoading,
    refetch: refetchAdmin,
  } = useIsCallerAdmin();
  const { data: isAdminAssigned, isLoading: assignedLoading } =
    useIsAdminAssigned();
  const claimFirstAdmin = useClaimFirstAdmin();

  useEffect(() => {
    if (identity && isAdmin && !actorFetching) {
      navigate({ to: "/admin" });
    }
  }, [identity, isAdmin, actorFetching, navigate]);

  const isLoggingIn = loginStatus === "logging-in";
  const isChecking = adminLoading || assignedLoading || actorFetching;

  const handleClaimAdmin = async () => {
    await claimFirstAdmin.mutateAsync();
    await refetchAdmin();
  };

  // Show first-time setup when: signed in, not admin, and no admin has been assigned yet
  const showFirstTimeSetup =
    identity && !isAdmin && !isAdminAssigned && !isChecking;
  // Show access denied when: signed in, not admin, and an admin IS already assigned
  const showAccessDenied =
    identity && !isAdmin && isAdminAssigned && !isChecking;

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center p-6"
      data-ocid="admin.login.page"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            PTM Architect
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Design College Performance System
          </p>
        </div>

        <Card className="rounded-[24px] shadow-card border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-4 h-4 text-primary" />
              Professor Access
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in with Internet Identity to access the admin panel.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Loading state */}
            {(actorFetching || (identity && isChecking)) && (
              <div
                className="flex items-center justify-center py-4"
                data-ocid="admin.login.loading_state"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {actorFetching ? "Initializing..." : "Verifying access..."}
                </span>
              </div>
            )}

            {/* First-time setup */}
            {showFirstTimeSetup && (
              <div className="space-y-3">
                <div className="bg-primary/10 rounded-xl p-4 text-sm text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 font-medium text-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    First-Time Setup
                  </div>
                  <p className="text-muted-foreground">
                    No professor account exists yet. Click below to register
                    your Internet Identity as the professor account.
                  </p>
                </div>
                <Button
                  onClick={handleClaimAdmin}
                  disabled={claimFirstAdmin.isPending}
                  className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-5"
                >
                  {claimFirstAdmin.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting
                      up...
                    </>
                  ) : (
                    "Register as Professor"
                  )}
                </Button>
                {claimFirstAdmin.isError && (
                  <p className="text-destructive text-sm text-center">
                    {claimFirstAdmin.error?.message}
                  </p>
                )}
              </div>
            )}

            {/* Access denied */}
            {showAccessDenied && (
              <div
                className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm text-center"
                data-ocid="admin.login.error_state"
              >
                Your account doesn't have professor access. Contact the
                administrator.
              </div>
            )}

            {/* Sign in button - show when not yet signed in and actor is ready */}
            {!identity && !actorFetching && (
              <Button
                onClick={() => login()}
                disabled={isLoggingIn}
                className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-5"
                data-ocid="admin.login.primary_button"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Connecting...
                  </>
                ) : (
                  "Sign In as Professor"
                )}
              </Button>
            )}

            {/* Re-login option when access denied */}
            {showAccessDenied && (
              <Button
                onClick={() => login()}
                variant="outline"
                className="w-full rounded-xl font-medium py-5"
              >
                Try a different account
              </Button>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Secure authentication via Internet Identity
        </p>
      </motion.div>

      <footer className="absolute bottom-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
