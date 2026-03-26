import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminStudentForm from "./pages/AdminStudentForm";
import PresentationAnalytics from "./pages/PresentationAnalytics";
import PresentationHome from "./pages/PresentationHome";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster richColors />
    </>
  ),
});

const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/login",
  component: AdminLogin,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminDashboard,
});

const adminStudentNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/student/new",
  component: AdminStudentForm,
});

const adminStudentEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/student/$id",
  component: AdminStudentForm,
});

const studentHomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/student/$id",
  component: PresentationHome,
});

const studentAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics/$id",
  component: PresentationAnalytics,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: AdminDashboard,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  adminLoginRoute,
  adminRoute,
  adminStudentNewRoute,
  adminStudentEditRoute,
  studentHomeRoute,
  studentAnalyticsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
