import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart2,
  Eye,
  FileText,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { toast } from "sonner";
import BackgroundAnimation from "../components/BackgroundAnimation";
import PageHeader from "../components/PageHeader";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteStudent,
  useGetAllStudents,
  useIsCallerAdmin,
} from "../hooks/useQueries";

const PASTEL_COLORS = [
  { bg: "#FFF0F0", border: "#FFD6D6" },
  { bg: "#F0F8FF", border: "#C8E6FF" },
  { bg: "#F0FFF4", border: "#C6F6D5" },
  { bg: "#FFFBF0", border: "#FFE8A0" },
  { bg: "#F5F0FF", border: "#DDD6FE" },
  { bg: "#FFF5F0", border: "#FECBA1" },
  { bg: "#F0FFFF", border: "#A0EDF0" },
  { bg: "#FFF0F8", border: "#F9C0E0" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { isFetching: actorFetching } = useActor();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: students, isLoading: studentsLoading } = useGetAllStudents();
  const deleteStudent = useDeleteStudent();

  useEffect(() => {
    if (actorFetching || adminLoading) return;
    if (!identity) {
      navigate({ to: "/admin/login" });
    } else if (!isAdmin) {
      navigate({ to: "/admin/login" });
    }
  }, [identity, isAdmin, adminLoading, actorFetching, navigate]);

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteStudent.mutateAsync(id);
      toast.success(`${name}'s record deleted`);
    } catch {
      toast.error("Failed to delete student");
    }
  };

  const isLoading = adminLoading || studentsLoading || actorFetching;

  return (
    <div
      className="min-h-screen bg-background"
      data-ocid="admin.dashboard.page"
    >
      <BackgroundAnimation />
      <PageHeader />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">
              Admin Panel
            </p>
            <h1 className="text-3xl font-bold text-foreground">
              Student Records
            </h1>
            <p className="text-muted-foreground mt-1">
              {students
                ? `${students.length} student${students.length !== 1 ? "s" : ""} enrolled`
                : "Loading records..."}
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/ptm-portfolio-casestudy.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                className="rounded-xl border-border gap-2 text-sm"
                data-ocid="admin.dashboard.secondary_button"
              >
                <FileText className="w-4 h-4" /> Case Study
              </Button>
            </a>
            <Link to="/admin/student/new">
              <Button
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                data-ocid="admin.dashboard.primary_button"
              >
                <Plus className="w-4 h-4" />
                Add Student
              </Button>
            </Link>
          </div>
        </motion.div>

        {isLoading ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            data-ocid="admin.dashboard.loading_state"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-[24px]" />
            ))}
          </div>
        ) : students && students.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
            data-ocid="admin.dashboard.empty_state"
          >
            <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Users className="w-9 h-9 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No students yet
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Add your first student record to get started.
            </p>
            <Link to="/admin/student/new">
              <Button
                className="rounded-xl bg-primary text-primary-foreground"
                data-ocid="admin.dashboard.secondary_button"
              >
                <Plus className="w-4 h-4 mr-2" /> Add First Student
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students?.map((student, idx) => {
              const semCount = student.semesters.length;
              const latestSem =
                student.semesters.length > 0
                  ? student.semesters.reduce((a, b) =>
                      Number(a.semesterNumber) > Number(b.semesterNumber)
                        ? a
                        : b,
                    )
                  : null;
              const pastel = PASTEL_COLORS[idx % PASTEL_COLORS.length];
              return (
                <motion.div
                  key={student.base.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.35 }}
                  data-ocid={`admin.dashboard.item.${idx + 1}`}
                >
                  <Card
                    className="rounded-[24px] shadow-card border-border bg-card hover:shadow-card-hover transition-shadow"
                    style={{
                      backgroundColor: pastel.bg,
                      borderColor: pastel.border,
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                            {student.base.photoUrl ? (
                              <img
                                src={student.base.photoUrl}
                                alt={student.base.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {student.base.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {student.base.className}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className="text-xs rounded-full"
                          style={{
                            backgroundColor: "oklch(0.67 0.095 72 / 0.15)",
                            color: "oklch(0.52 0.10 72)",
                            border: "1px solid oklch(0.67 0.095 72 / 0.3)",
                          }}
                        >
                          {semCount} Semester{semCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      {latestSem && (
                        <div className="mb-4">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                            Latest Performance
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {latestSem.overallPerformance || "—"}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Link
                          to="/student/$id"
                          params={{ id: student.base.id }}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full rounded-lg border-border gap-1.5 text-xs"
                            data-ocid={`admin.dashboard.secondary_button.${idx + 1}`}
                          >
                            <Eye className="w-3.5 h-3.5" /> Profile
                          </Button>
                        </Link>
                        <Link
                          to="/analytics/$id"
                          params={{ id: student.base.id }}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full rounded-lg border-border gap-1.5 text-xs"
                            data-ocid={`admin.dashboard.secondary_button.${idx + 1}`}
                          >
                            <BarChart2 className="w-3.5 h-3.5" /> Analytics
                          </Button>
                        </Link>
                        <Link
                          to="/admin/student/$id"
                          params={{ id: student.base.id }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-border gap-1.5 text-xs"
                            data-ocid={`admin.dashboard.edit_button.${idx + 1}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5 text-xs px-3"
                              data-ocid={`admin.dashboard.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent
                            className="rounded-[24px]"
                            data-ocid="admin.dashboard.dialog"
                          >
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete student record?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {student.base.name}
                                's record and all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                className="rounded-xl"
                                data-ocid="admin.dashboard.cancel_button"
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-xl bg-destructive text-destructive-foreground"
                                onClick={() =>
                                  handleDelete(
                                    student.base.id,
                                    student.base.name,
                                  )
                                }
                                data-ocid="admin.dashboard.confirm_button"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-6 mt-8 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © Copyright{" "}
          <a
            href="https://anthropocene.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#B79B57] hover:underline"
          >
            anthropocene.in
          </a>
        </p>
      </footer>
    </div>
  );
}
