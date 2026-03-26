import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "@tanstack/react-router";
import {
  Award,
  BarChart2,
  BookOpen,
  GraduationCap,
  Home,
  LayoutDashboard,
} from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import BackgroundAnimation from "../components/BackgroundAnimation";
import { useGetStudent } from "../hooks/useQueries";

function TiltCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), {
    stiffness: 200,
    damping: 20,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay }}
      style={{
        rotateX,
        rotateY,
        perspective: 1000,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function PresentationHome() {
  const { id } = useParams({ from: "/student/$id" });
  const { data: student, isLoading, isError } = useGetStudent(id);

  const latestSem =
    student && student.semesters.length > 0
      ? student.semesters.reduce((a, b) =>
          Number(a.semesterNumber) > Number(b.semesterNumber) ? a : b,
        )
      : null;

  const semNumbers = student
    ? [...student.semesters]
        .sort((a, b) => Number(a.semesterNumber) - Number(b.semesterNumber))
        .map((s) => Number(s.semesterNumber))
    : [];

  const avgScore =
    latestSem && latestSem.subjects.length > 0
      ? Math.round(
          latestSem.subjects.reduce((acc, s) => acc + Number(s.marks), 0) /
            latestSem.subjects.length,
        )
      : null;

  return (
    <div
      className="min-h-screen bg-background"
      data-ocid="presentation.home.page"
    >
      <BackgroundAnimation />

      {/* Nav */}
      <header className="w-full border-b border-border bg-card/90 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">
                PTM
              </span>
            </div>
            <span className="text-sm font-semibold tracking-wider uppercase">
              PTM Architect
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link to="/student/$id" params={{ id }}>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl gap-1.5 bg-primary/10 text-primary font-medium"
                data-ocid="presentation.home.tab"
              >
                <Home className="w-4 h-4" /> Profile
              </Button>
            </Link>
            <Link to="/analytics/$id" params={{ id }}>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl gap-1.5 text-muted-foreground hover:text-foreground"
                data-ocid="presentation.analytics.tab"
              >
                <BarChart2 className="w-4 h-4" /> Analytics
              </Button>
            </Link>
            <Link to="/admin">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl gap-1.5 text-muted-foreground hover:text-foreground ml-2"
                data-ocid="presentation.admin.link"
              >
                <LayoutDashboard className="w-4 h-4" /> Admin
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {isLoading ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            data-ocid="presentation.home.loading_state"
          >
            <Skeleton className="h-64 rounded-[24px]" />
            <Skeleton className="h-64 rounded-[24px]" />
            <Skeleton className="h-48 rounded-[24px] md:col-span-2" />
          </div>
        ) : isError ? (
          <div
            className="text-center py-20"
            data-ocid="presentation.home.error_state"
          >
            <p className="text-muted-foreground">Student record not found.</p>
          </div>
        ) : student ? (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-2"
            >
              <p className="text-xs uppercase tracking-widest text-primary font-semibold">
                Student Profile
              </p>
              <h1 className="text-4xl font-bold text-foreground mt-1">
                {student.base.name}
              </h1>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Card */}
              <TiltCard className="md:col-span-1" delay={0.1}>
                <div className="rounded-[24px] border border-border bg-card shadow-card p-6 flex flex-col items-center text-center h-full backdrop-blur-sm">
                  <div className="w-28 h-28 rounded-full overflow-hidden bg-muted border-4 border-border mb-4 flex-shrink-0">
                    {student.base.photoUrl ? (
                      <img
                        src={student.base.photoUrl}
                        alt={student.base.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <GraduationCap className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    {student.base.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.base.className}
                  </p>

                  {semNumbers.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                      {semNumbers.map((num) => (
                        <Badge
                          key={num}
                          className="rounded-full px-2.5 py-0.5 text-xs"
                          style={{
                            backgroundColor: "oklch(0.67 0.095 72 / 0.12)",
                            color: "oklch(0.52 0.10 72)",
                            border: "1px solid oklch(0.67 0.095 72 / 0.3)",
                          }}
                        >
                          Sem {num}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TiltCard>

              {/* Performance Card */}
              <TiltCard className="md:col-span-2" delay={0.2}>
                <div className="rounded-[24px] border border-border bg-card shadow-card p-6 h-full backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-4 h-4 text-primary" />
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                      Latest Performance
                    </p>
                  </div>

                  {latestSem ? (
                    <>
                      <div
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl mb-5"
                        style={{
                          backgroundColor: "oklch(0.67 0.095 72 / 0.12)",
                          border: "1px solid oklch(0.67 0.095 72 / 0.3)",
                        }}
                      >
                        <Award
                          className="w-5 h-5"
                          style={{ color: "oklch(0.52 0.10 72)" }}
                        />
                        <span
                          className="text-xl font-bold"
                          style={{ color: "oklch(0.45 0.10 72)" }}
                        >
                          {latestSem.overallPerformance || "—"}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          Sem {latestSem.semesterNumber.toString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-border p-4 bg-background">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                            Class
                          </p>
                          <p className="font-semibold text-foreground text-sm">
                            {student.base.className || "—"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border p-4 bg-background">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                            Semesters
                          </p>
                          <p className="font-semibold text-foreground text-sm">
                            {student.semesters.length} completed
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border p-4 bg-background">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                            Subjects
                          </p>
                          <p className="font-semibold text-foreground text-sm">
                            {latestSem.subjects.length} subjects
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border p-4 bg-background">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                            Avg Score
                          </p>
                          <p className="font-semibold text-foreground text-sm">
                            {avgScore !== null ? `${avgScore}/100` : "—"}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No semester data available yet.
                    </p>
                  )}
                </div>
              </TiltCard>
            </div>

            {/* Psychological Context */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              <div className="rounded-[24px] border border-border bg-card shadow-card p-8 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    Psychological &amp; Performance Context
                  </p>
                </div>
                <div
                  className="text-foreground leading-[1.8] text-base"
                  style={{ fontFamily: "serif" }}
                >
                  {student.base.psychologicalContext ? (
                    student.base.psychologicalContext
                      .split("\n\n")
                      .map((para) => (
                        <p key={para.slice(0, 32)} className="mt-5 first:mt-0">
                          {para}
                        </p>
                      ))
                  ) : (
                    <p className="text-muted-foreground italic">
                      No context provided.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="flex justify-end"
            >
              <Link to="/analytics/$id" params={{ id }}>
                <Button
                  className="rounded-xl bg-primary text-primary-foreground gap-2 hover:bg-primary/90"
                  data-ocid="presentation.home.primary_button"
                >
                  <BarChart2 className="w-4 h-4" /> View Analytics
                </Button>
              </Link>
            </motion.div>
          </div>
        ) : null}
      </main>

      <footer className="relative z-10 max-w-5xl mx-auto px-6 py-6 mt-4 border-t border-border">
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
