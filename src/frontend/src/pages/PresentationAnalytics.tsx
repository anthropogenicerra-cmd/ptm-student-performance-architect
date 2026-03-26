import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Canvas, useFrame } from "@react-three/fiber";
import { Link, useParams } from "@tanstack/react-router";
import {
  BarChart2,
  FileText,
  Home,
  PieChart as PieIcon,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { Suspense, useRef, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type * as THREE from "three";
import BackgroundAnimation from "../components/BackgroundAnimation";
import { useGetStudent } from "../hooks/useQueries";

const GOLD_SHADES = [
  "oklch(0.67 0.095 72)",
  "oklch(0.55 0.080 72)",
  "oklch(0.78 0.070 72)",
  "oklch(0.45 0.065 72)",
  "oklch(0.83 0.050 82)",
  "oklch(0.38 0.045 65)",
  "oklch(0.72 0.060 78)",
  "oklch(0.60 0.040 68)",
];

// Hex for Three.js WebGL (can't use oklch)
const GOLD_HEX_DARK = "#8B6914";
const GOLD_HEX_MAIN = "#B79B57";
const GOLD_HEX_LIGHT = "#D4B878";

// Line chart hex equivalents for Recharts (stroke needs valid CSS)
const LINE_COLORS = ["#B79B57", "#7A6235", "#D4B878", "#5C4A28", "#E8D5A3"];

function FloatingOrbMesh() {
  const orbRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!orbRef.current) return;
    orbRef.current.rotation.y = state.clock.elapsedTime * 0.6;
    orbRef.current.rotation.x = state.clock.elapsedTime * 0.25;
    orbRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.18;
    if (glowRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.06;
      glowRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshStandardMaterial
          color={GOLD_HEX_LIGHT}
          transparent
          opacity={0.08}
          roughness={1}
        />
      </mesh>
      <mesh ref={orbRef}>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial
          color={GOLD_HEX_MAIN}
          emissive={GOLD_HEX_DARK}
          emissiveIntensity={0.45}
          roughness={0.25}
          metalness={0.85}
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.73, 1]} />
        <meshBasicMaterial
          color={GOLD_HEX_LIGHT}
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

function FloatingOrb() {
  return (
    <div className="relative" style={{ width: 90, height: 90, flexShrink: 0 }}>
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 3], fov: 45 }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.4} />
          <pointLight
            position={[3, 3, 3]}
            intensity={1.2}
            color={GOLD_HEX_LIGHT}
          />
          <pointLight
            position={[-3, -2, 2]}
            intensity={0.6}
            color={GOLD_HEX_MAIN}
          />
          <FloatingOrbMesh />
        </Canvas>
      </Suspense>
    </div>
  );
}

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function decodeDetailedNote(detailedNote: string): {
  internalMarks: number;
  externalMarks: number;
  note: string;
} {
  const match = detailedNote.match(/^\[INT:(\d+)\|EXT:(\d+)\](.*)/s);
  if (match) {
    return {
      internalMarks: Number(match[1]),
      externalMarks: Number(match[2]),
      note: match[3],
    };
  }
  return { internalMarks: 0, externalMarks: 0, note: detailedNote };
}

export default function PresentationAnalytics() {
  const { id } = useParams({ from: "/analytics/$id" });
  const { data: student, isLoading, isError } = useGetStudent(id);
  const [selectedSemNum, setSelectedSemNum] = useState<number | null>(null);

  const sortedSems = student
    ? [...student.semesters].sort(
        (a, b) => Number(a.semesterNumber) - Number(b.semesterNumber),
      )
    : [];

  const activeSemNum =
    selectedSemNum ??
    (sortedSems.length > 0
      ? Number(sortedSems[sortedSems.length - 1].semesterNumber)
      : null);

  const activeSem =
    sortedSems.find((s) => Number(s.semesterNumber) === activeSemNum) ?? null;

  const radarData =
    activeSem?.subjects.map((s) => ({
      subject: s.name,
      marks: Number(s.marks),
    })) ?? [];

  const pieData =
    activeSem?.subjects.map((s) => ({
      name: s.name,
      value: Number(s.marks),
    })) ?? [];

  // Growth chart: X = semester, one line per subject
  const allSubjectNames = Array.from(
    new Set(sortedSems.flatMap((s) => s.subjects.map((sub) => sub.name))),
  );

  const growthData = sortedSems.map((sem) => {
    const point: Record<string, number | string> = {
      sem: `Sem ${sem.semesterNumber}`,
    };
    for (const subName of allSubjectNames) {
      const sub = sem.subjects.find((s) => s.name === subName);
      if (sub) point[subName] = Number(sub.marks);
    }
    return point;
  });

  const showGrowthChart = sortedSems.length >= 2;

  return (
    <div
      className="min-h-screen bg-background"
      data-ocid="presentation.analytics.page"
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
                className="rounded-xl gap-1.5 text-muted-foreground hover:text-foreground"
                data-ocid="presentation.analytics.tab"
              >
                <Home className="w-4 h-4" /> Profile
              </Button>
            </Link>
            <Link to="/analytics/$id" params={{ id }}>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl gap-1.5 bg-primary/10 text-primary font-medium"
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
                Admin
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {isLoading ? (
          <div
            className="space-y-6"
            data-ocid="presentation.analytics.loading_state"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-80 rounded-[24px]" />
              <Skeleton className="h-80 rounded-[24px]" />
            </div>
            <Skeleton className="h-56 rounded-[24px]" />
          </div>
        ) : isError ? (
          <div
            className="text-center py-20"
            data-ocid="presentation.analytics.error_state"
          >
            <p className="text-muted-foreground">Student record not found.</p>
          </div>
        ) : student ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="mb-2 flex items-center gap-5">
              <FloatingOrb />
              <div>
                <p className="text-xs uppercase tracking-widest text-primary font-semibold">
                  Performance Analytics
                </p>
                <h1 className="text-4xl font-bold text-foreground mt-1">
                  {student.base.name}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {student.base.className}
                </p>
              </div>
            </div>

            {/* Semester selector */}
            {sortedSems.length > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Viewing:
                </span>
                <Tabs
                  value={activeSemNum?.toString() ?? ""}
                  onValueChange={(v) => setSelectedSemNum(Number(v))}
                >
                  <TabsList className="h-auto gap-1 bg-muted/50 rounded-2xl p-1">
                    {sortedSems.map((sem) => (
                      <TabsTrigger
                        key={sem.semesterNumber.toString()}
                        value={sem.semesterNumber.toString()}
                        className="rounded-xl text-xs px-4 py-1.5"
                        data-ocid="presentation.analytics.tab"
                      >
                        Sem {sem.semesterNumber.toString()}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Radar */}
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: 0.05 }}
              >
                <div
                  className="rounded-[24px] border border-border bg-card shadow-card p-6 backdrop-blur-sm"
                  data-ocid="presentation.analytics.card"
                >
                  <div className="flex items-center gap-2 mb-5">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                      Skill Balance
                    </p>
                  </div>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart
                        data={radarData}
                        cx="50%"
                        cy="50%"
                        outerRadius="75%"
                      >
                        <PolarGrid
                          stroke="oklch(0.90 0.020 82)"
                          strokeDasharray="3 3"
                        />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{
                            fontSize: 11,
                            fill: "oklch(0.47 0.022 65)",
                            fontWeight: 500,
                          }}
                        />
                        <Radar
                          name="Marks"
                          dataKey="marks"
                          stroke="oklch(0.67 0.095 72)"
                          fill="oklch(0.67 0.095 72)"
                          fillOpacity={0.2}
                          strokeWidth={2}
                          isAnimationActive
                          animationBegin={300}
                          animationDuration={1400}
                          animationEasing="ease-out"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.985 0.005 85)",
                            border: "1px solid oklch(0.90 0.020 82)",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                          formatter={(val: number) => [`${val}/100`, "Marks"]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-10">
                      No data.
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Pie */}
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: 0.15 }}
              >
                <div
                  className="rounded-[24px] border border-border bg-card shadow-card p-6 backdrop-blur-sm"
                  data-ocid="presentation.analytics.card"
                >
                  <div className="flex items-center gap-2 mb-5">
                    <PieIcon className="w-4 h-4 text-primary" />
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                      Subject Weightage
                    </p>
                  </div>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          isAnimationActive
                          animationBegin={200}
                          animationDuration={1200}
                          animationEasing="ease-out"
                        >
                          {pieData.map((entry, i) => (
                            <Cell
                              key={entry.name}
                              fill={GOLD_SHADES[i % GOLD_SHADES.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.985 0.005 85)",
                            border: "1px solid oklch(0.90 0.020 82)",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                          formatter={(val: number) => [`${val}/100`, "Marks"]}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: "11px",
                            color: "oklch(0.47 0.022 65)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-10">
                      No data.
                    </p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Growth Chart */}
            {showGrowthChart && (
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: 0.1 }}
              >
                <div
                  className="rounded-[24px] border border-border bg-card shadow-card p-6 backdrop-blur-sm"
                  data-ocid="presentation.analytics.card"
                >
                  <div className="flex items-center gap-2 mb-5">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                      Subject-wise Growth
                    </p>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Across {sortedSems.length} semesters
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={growthData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.92 0.015 82)"
                      />
                      <XAxis
                        dataKey="sem"
                        tick={{ fontSize: 11, fill: "oklch(0.47 0.022 65)" }}
                        axisLine={{ stroke: "oklch(0.88 0.018 82)" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "oklch(0.47 0.022 65)" }}
                        axisLine={{ stroke: "oklch(0.88 0.018 82)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "oklch(0.985 0.005 85)",
                          border: "1px solid oklch(0.90 0.020 82)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(val: number, name: string) => [
                          `${val}/100`,
                          name,
                        ]}
                      />
                      <Legend
                        wrapperStyle={{
                          fontSize: "11px",
                          color: "oklch(0.47 0.022 65)",
                        }}
                      />
                      {allSubjectNames.map((name, i) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={LINE_COLORS[i % LINE_COLORS.length]}
                          strokeWidth={2}
                          dot={{
                            fill: LINE_COLORS[i % LINE_COLORS.length],
                            r: 4,
                          }}
                          activeDot={{ r: 6 }}
                          isAnimationActive
                          animationDuration={1200}
                          animationEasing="ease-out"
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Subject Notes Table */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="rounded-[24px] border border-border bg-card shadow-card p-6 backdrop-blur-sm"
                data-ocid="presentation.analytics.table"
              >
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="w-4 h-4 text-primary" />
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    Subject Notes
                    {activeSem && (
                      <span className="ml-2 font-normal normal-case">
                        — Sem {activeSem.semesterNumber.toString()}
                      </span>
                    )}
                  </p>
                </div>
                {activeSem && activeSem.subjects.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4 pb-3 border-b border-border">
                      <div className="col-span-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Subject
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Score
                        </p>
                      </div>
                      <div className="col-span-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Detailed Note
                        </p>
                      </div>
                    </div>
                    {activeSem.subjects.map((subject, idx) => (
                      <motion.div
                        key={subject.name}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-30px" }}
                        transition={{
                          duration: 0.45,
                          delay: idx * 0.07,
                          ease: "easeOut",
                        }}
                        className="grid grid-cols-12 gap-4 py-4 border-b border-border last:border-0"
                        data-ocid={`presentation.analytics.row.${idx + 1}`}
                      >
                        <div className="col-span-4 flex items-start gap-2.5">
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{
                              backgroundColor:
                                GOLD_SHADES[idx % GOLD_SHADES.length],
                            }}
                          />
                          <p className="font-medium text-foreground text-sm">
                            {subject.name}
                          </p>
                        </div>
                        <div className="col-span-2">
                          {(() => {
                            const decoded = decodeDetailedNote(
                              subject.detailedNote,
                            );
                            return (
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-foreground">
                                  {subject.marks.toString()}/100
                                </span>
                                <AnimatedBar
                                  pct={Number(subject.marks)}
                                  color={GOLD_SHADES[idx % GOLD_SHADES.length]}
                                />
                                {decoded.internalMarks > 0 && (
                                  <span className="text-xs text-muted-foreground block">
                                    Int: {decoded.internalMarks}/60 · Ext:{" "}
                                    {decoded.externalMarks}/40
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="col-span-6">
                          {(() => {
                            const decoded = decodeDetailedNote(
                              subject.detailedNote,
                            );
                            return (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {decoded.note || (
                                  <em className="text-muted-foreground/60">
                                    No notes provided.
                                  </em>
                                )}
                              </p>
                            );
                          })()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p
                    className="text-muted-foreground text-sm text-center py-8"
                    data-ocid="presentation.analytics.empty_state"
                  >
                    No subject data for this semester.
                  </p>
                )}
              </div>
            </motion.div>

            {/* Back CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="flex justify-start"
            >
              <Link to="/student/$id" params={{ id }}>
                <Button
                  variant="outline"
                  className="rounded-xl border-border gap-2"
                  data-ocid="presentation.analytics.secondary_button"
                >
                  <Home className="w-4 h-4" /> Back to Profile
                </Button>
              </Link>
            </motion.div>
          </motion.div>
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
