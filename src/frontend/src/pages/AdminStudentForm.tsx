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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, User } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import BackgroundAnimation from "../components/BackgroundAnimation";
import PageHeader from "../components/PageHeader";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddSemester,
  useCreateStudent,
  useDeleteSemester,
  useGetStudent,
  useIsCallerAdmin,
  useUpdateSemester,
  useUpdateStudent,
} from "../hooks/useQueries";

const DEFAULT_SUBJECTS = [
  "Typography",
  "Illustration",
  "Color Theory",
  "Visual Communication",
  "Design History",
];

interface SubjectRow {
  uid: string;
  name: string;
  internalMarks: string;
  externalMarks: string;
  detailedNote: string;
}

interface SemesterForm {
  semesterNumber: number;
  overallPerformance: string;
  subjects: SubjectRow[];
}

function makeSubjectRow(
  name = "",
  internalMarks = "",
  externalMarks = "",
  detailedNote = "",
): SubjectRow {
  return {
    uid: crypto.randomUUID(),
    name,
    internalMarks,
    externalMarks,
    detailedNote,
  };
}

function defaultSemesterForm(num: number): SemesterForm {
  return {
    semesterNumber: num,
    overallPerformance: "",
    subjects: DEFAULT_SUBJECTS.map((n) => makeSubjectRow(n)),
  };
}
function encodeDetailedNote(
  internalMarks: string,
  externalMarks: string,
  note: string,
): string {
  const int = Math.max(0, Math.min(60, Number(internalMarks) || 0));
  const ext = Math.max(0, Math.min(40, Number(externalMarks) || 0));
  if (int === 0 && ext === 0) return note;
  return `[INT:${int}|EXT:${ext}]${note}`;
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

export default function AdminStudentForm() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { id?: string };
  const isEdit = !!params.id && params.id !== "new";

  const { identity } = useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: existingStudent, isLoading: studentLoading } = useGetStudent(
    isEdit ? params.id! : "",
  );

  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const addSemester = useAddSemester();
  const updateSemester = useUpdateSemester();
  const deleteSemester = useDeleteSemester();

  // Base info state
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [psychologicalContext, setPsychologicalContext] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Base form saved = student created
  const [baseCreated, setBaseCreated] = useState(false);

  // Semesters state
  const [semesters, setSemesters] = useState<SemesterForm[]>([]);
  const [activeSemTab, setActiveSemTab] = useState("1");

  // Track which semesters exist on backend
  const [existingSemNumbers, setExistingSemNumbers] = useState<number[]>([]);

  useEffect(() => {
    if (!identity && !adminLoading) navigate({ to: "/admin/login" });
    if (identity && !adminLoading && !isAdmin) navigate({ to: "/admin/login" });
  }, [identity, isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (existingStudent && isEdit) {
      const base = existingStudent.base;
      setStudentId(base.id);
      setName(base.name);
      setClassName(base.className);
      setPsychologicalContext(base.psychologicalContext);
      setPhotoUrl(base.photoUrl ?? undefined);
      setPhotoPreview(base.photoUrl ?? null);
      setBaseCreated(true);

      const semForms: SemesterForm[] = existingStudent.semesters.map((sem) => ({
        semesterNumber: Number(sem.semesterNumber),
        overallPerformance: sem.overallPerformance,
        subjects: sem.subjects.map((s) => {
          const decoded = decodeDetailedNote(s.detailedNote);
          return makeSubjectRow(
            s.name,
            decoded.internalMarks > 0
              ? decoded.internalMarks.toString()
              : Number(s.marks).toString(),
            decoded.externalMarks > 0 ? decoded.externalMarks.toString() : "",
            decoded.note,
          );
        }),
      }));
      semForms.sort((a, b) => a.semesterNumber - b.semesterNumber);
      setSemesters(semForms);
      setExistingSemNumbers(semForms.map((s) => s.semesterNumber));
      if (semForms.length > 0) {
        setActiveSemTab(semForms[0].semesterNumber.toString());
      }
    } else if (!isEdit) {
      setStudentId(crypto.randomUUID());
    }
  }, [existingStudent, isEdit]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((p) =>
        setUploadProgress(p),
      );
      const url = blob.getDirectURL();
      setPhotoUrl(url);
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Student name is required");
      return;
    }
    try {
      const payload = {
        id: studentId,
        name: name.trim(),
        className: className.trim(),
        psychologicalContext: psychologicalContext.trim(),
        photoUrl: photoUrl,
      };
      if (isEdit) {
        await updateStudent.mutateAsync(payload);
        toast.success("Student info updated");
      } else {
        await createStudent.mutateAsync(payload);
        toast.success("Student created — now add semesters");
        setBaseCreated(true);
        setSemesters([defaultSemesterForm(1)]);
        setActiveSemTab("1");
      }
    } catch {
      toast.error("Failed to save student info");
    }
  };

  const handleAddSemester = () => {
    const nextNum =
      semesters.length > 0
        ? Math.max(...semesters.map((s) => s.semesterNumber)) + 1
        : 1;
    if (nextNum > 8) {
      toast.error("Maximum 8 semesters");
      return;
    }
    const newSem = defaultSemesterForm(nextNum);
    setSemesters((prev) => [...prev, newSem]);
    setActiveSemTab(nextNum.toString());
  };

  const handleSaveSemester = async (sem: SemesterForm) => {
    const subjects = sem.subjects
      .filter((s) => s.name.trim())
      .map((s) => {
        const internal = Math.max(
          0,
          Math.min(60, Number(s.internalMarks) || 0),
        );
        const external = Math.max(
          0,
          Math.min(40, Number(s.externalMarks) || 0),
        );
        const total = internal + external;
        return {
          name: s.name.trim(),
          marks: BigInt(total),
          detailedNote: encodeDetailedNote(
            s.internalMarks,
            s.externalMarks,
            s.detailedNote,
          ),
        };
      });

    const payload = {
      id: studentId,
      semesterNumber: BigInt(sem.semesterNumber),
      overallPerformance: sem.overallPerformance.trim(),
      subjects,
    };

    try {
      if (existingSemNumbers.includes(sem.semesterNumber)) {
        await updateSemester.mutateAsync(payload);
      } else {
        await addSemester.mutateAsync(payload);
        setExistingSemNumbers((prev) => [...prev, sem.semesterNumber]);
      }
      toast.success(`Semester ${sem.semesterNumber} saved`);
    } catch {
      toast.error(`Failed to save Semester ${sem.semesterNumber}`);
    }
  };

  const handleDeleteSemester = async (semNum: number) => {
    try {
      await deleteSemester.mutateAsync({
        id: studentId,
        semesterNumber: BigInt(semNum),
      });
      setSemesters((prev) => prev.filter((s) => s.semesterNumber !== semNum));
      setExistingSemNumbers((prev) => prev.filter((n) => n !== semNum));
      const remaining = semesters.filter((s) => s.semesterNumber !== semNum);
      if (remaining.length > 0) {
        setActiveSemTab(remaining[0].semesterNumber.toString());
      }
      toast.success(`Semester ${semNum} deleted`);
    } catch {
      toast.error(`Failed to delete Semester ${semNum}`);
    }
  };

  const updateSemField = (
    semNum: number,
    field: keyof Omit<SemesterForm, "subjects" | "semesterNumber">,
    value: string,
  ) => {
    setSemesters((prev) =>
      prev.map((s) =>
        s.semesterNumber === semNum ? { ...s, [field]: value } : s,
      ),
    );
  };

  const updateSubjectField = (
    semNum: number,
    uid: string,
    field: keyof Omit<SubjectRow, "uid">,
    value: string,
  ) => {
    setSemesters((prev) =>
      prev.map((s) =>
        s.semesterNumber === semNum
          ? {
              ...s,
              subjects: s.subjects.map((sub) =>
                sub.uid === uid ? { ...sub, [field]: value } : sub,
              ),
            }
          : s,
      ),
    );
  };

  const addSubjectToSem = (semNum: number) => {
    setSemesters((prev) =>
      prev.map((s) =>
        s.semesterNumber === semNum
          ? { ...s, subjects: [...s.subjects, makeSubjectRow()] }
          : s,
      ),
    );
  };

  const removeSubjectFromSem = (semNum: number, uid: string) => {
    setSemesters((prev) =>
      prev.map((s) =>
        s.semesterNumber === semNum
          ? { ...s, subjects: s.subjects.filter((sub) => sub.uid !== uid) }
          : s,
      ),
    );
  };

  const isSavingBase = createStudent.isPending || updateStudent.isPending;
  const isSavingSem = addSemester.isPending || updateSemester.isPending;

  if (adminLoading || (isEdit && studentLoading)) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center"
        data-ocid="admin.form.loading_state"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-ocid="admin.form.page">
      <BackgroundAnimation />
      <PageHeader />

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <Link to="/admin">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground -ml-2 mb-4"
                data-ocid="admin.form.link"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Students
              </Button>
            </Link>
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">
              {isEdit ? "Edit Record" : "New Record"}
            </p>
            <h1 className="text-3xl font-bold text-foreground">
              {isEdit ? "Update Student" : "Add Student"}
            </h1>
          </div>

          {/* ── Base Info Form ── */}
          <form onSubmit={handleSaveBase} className="mb-6">
            <Card className="rounded-[24px] shadow-card border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Photo Upload */}
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted border border-border flex items-center justify-center">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    {isUploading && (
                      <div className="mt-2">
                        <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Student Photo</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Upload a student photo for the presentation.
                    </p>
                    <label
                      htmlFor="photo-upload"
                      className="inline-flex items-center gap-2 cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm px-4 py-2 rounded-xl transition-colors"
                      data-ocid="admin.form.upload_button"
                    >
                      <Upload className="w-4 h-4" /> Choose Photo
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="student-name"
                      className="text-sm font-medium"
                    >
                      Student Name *
                    </Label>
                    <Input
                      id="student-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Arjun Sharma"
                      className="mt-1.5 rounded-xl bg-input border-border"
                      data-ocid="admin.form.input"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="class-name" className="text-sm font-medium">
                      Class / Division
                    </Label>
                    <Input
                      id="class-name"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="e.g. B.Des Year 2, Section A"
                      className="mt-1.5 rounded-xl bg-input border-border"
                      data-ocid="admin.form.input"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="psych-context"
                    className="text-sm font-medium"
                  >
                    Psychological &amp; Performance Context
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
                    Detailed qualitative assessment for parent presentation.
                  </p>
                  <Textarea
                    id="psych-context"
                    value={psychologicalContext}
                    onChange={(e) => setPsychologicalContext(e.target.value)}
                    placeholder="Describe the student's psychological profile, strengths, areas of growth..."
                    className="min-h-32 rounded-xl bg-input border-border resize-none leading-relaxed"
                    data-ocid="admin.form.textarea"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingBase}
                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 min-w-36"
                    data-ocid="admin.form.submit_button"
                  >
                    {isSavingBase ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Saving...
                      </>
                    ) : isEdit ? (
                      "Update Info"
                    ) : (
                      "Save & Add Semesters"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* ── Semesters Section (shown after base created) ── */}
          {(baseCreated || isEdit) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="rounded-[24px] shadow-card border-border bg-card">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">
                    Semester Data
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSemester}
                    className="rounded-xl border-border gap-1.5 text-xs"
                    data-ocid="admin.form.secondary_button"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Semester
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  {semesters.length === 0 ? (
                    <div
                      className="text-center py-10"
                      data-ocid="admin.form.empty_state"
                    >
                      <p className="text-muted-foreground text-sm mb-4">
                        No semesters yet. Add the first semester.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddSemester}
                        className="rounded-xl border-border gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Semester 1
                      </Button>
                    </div>
                  ) : (
                    <Tabs value={activeSemTab} onValueChange={setActiveSemTab}>
                      <TabsList className="mb-6 flex-wrap h-auto gap-1 bg-muted/50 rounded-2xl p-1">
                        {semesters.map((sem) => (
                          <TabsTrigger
                            key={sem.semesterNumber}
                            value={sem.semesterNumber.toString()}
                            className="rounded-xl text-xs px-4 py-1.5"
                            data-ocid="admin.form.tab"
                          >
                            Sem {sem.semesterNumber}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {semesters.map((sem) => (
                        <TabsContent
                          key={sem.semesterNumber}
                          value={sem.semesterNumber.toString()}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-foreground">
                              Semester {sem.semesterNumber}
                            </h3>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5 gap-1.5 text-xs"
                                  data-ocid="admin.form.delete_button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                  Semester
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent
                                className="rounded-[24px]"
                                data-ocid="admin.form.dialog"
                              >
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Semester {sem.semesterNumber}?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove all marks and
                                    notes for Semester {sem.semesterNumber}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel
                                    className="rounded-xl"
                                    data-ocid="admin.form.cancel_button"
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="rounded-xl bg-destructive text-destructive-foreground"
                                    onClick={() =>
                                      handleDeleteSemester(sem.semesterNumber)
                                    }
                                    data-ocid="admin.form.confirm_button"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">
                              Overall Performance
                            </Label>
                            <Input
                              value={sem.overallPerformance}
                              onChange={(e) =>
                                updateSemField(
                                  sem.semesterNumber,
                                  "overallPerformance",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. Distinction, Merit, Pass"
                              className="mt-1.5 rounded-xl bg-input border-border"
                              data-ocid="admin.form.input"
                            />
                          </div>

                          <div className="flex items-center justify-between mt-4 mb-2">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                              Subjects
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                addSubjectToSem(sem.semesterNumber)
                              }
                              className="text-xs gap-1.5 rounded-xl"
                              data-ocid="admin.form.secondary_button"
                            >
                              <Plus className="w-3 h-3" /> Add Subject
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {sem.subjects.map((subject, idx) => (
                              <div
                                key={subject.uid}
                                className="border border-border rounded-2xl p-4 bg-background space-y-3"
                                data-ocid={`admin.form.item.${idx + 1}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-primary">
                                      {idx + 1}
                                    </span>
                                  </div>
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                      <Input
                                        value={subject.name}
                                        onChange={(e) =>
                                          updateSubjectField(
                                            sem.semesterNumber,
                                            subject.uid,
                                            "name",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Subject name"
                                        className="rounded-xl bg-input border-border text-sm"
                                        data-ocid="admin.form.input"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                          <Label className="text-xs text-muted-foreground mb-1 block">
                                            Internal
                                          </Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="60"
                                            value={subject.internalMarks}
                                            onChange={(e) =>
                                              updateSubjectField(
                                                sem.semesterNumber,
                                                subject.uid,
                                                "internalMarks",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="0-60"
                                            className="rounded-xl bg-input border-border text-sm pr-12"
                                            data-ocid="admin.form.input"
                                          />
                                          <span className="absolute right-3 bottom-2.5 text-xs text-muted-foreground">
                                            /60
                                          </span>
                                        </div>
                                        <div className="relative">
                                          <Label className="text-xs text-muted-foreground mb-1 block">
                                            External
                                          </Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="40"
                                            value={subject.externalMarks}
                                            onChange={(e) =>
                                              updateSubjectField(
                                                sem.semesterNumber,
                                                subject.uid,
                                                "externalMarks",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="0-40"
                                            className="rounded-xl bg-input border-border text-sm pr-12"
                                            data-ocid="admin.form.input"
                                          />
                                          <span className="absolute right-3 bottom-2.5 text-xs text-muted-foreground">
                                            /40
                                          </span>
                                        </div>
                                      </div>
                                      {(subject.internalMarks ||
                                        subject.externalMarks) && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Total:{" "}
                                          {Number(subject.internalMarks || 0) +
                                            Number(subject.externalMarks || 0)}
                                          /100
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeSubjectFromSem(
                                        sem.semesterNumber,
                                        subject.uid,
                                      )
                                    }
                                    className="text-destructive hover:bg-destructive/5 rounded-xl flex-shrink-0"
                                    data-ocid={`admin.form.delete_button.${idx + 1}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <Textarea
                                  value={subject.detailedNote}
                                  onChange={(e) =>
                                    updateSubjectField(
                                      sem.semesterNumber,
                                      subject.uid,
                                      "detailedNote",
                                      e.target.value,
                                    )
                                  }
                                  placeholder={`Detailed notes for ${subject.name || "this subject"}...`}
                                  className="min-h-20 rounded-xl bg-input border-border text-sm resize-none"
                                  data-ocid="admin.form.textarea"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button
                              type="button"
                              disabled={isSavingSem}
                              onClick={() => handleSaveSemester(sem)}
                              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 min-w-40"
                              data-ocid="admin.form.save_button"
                            >
                              {isSavingSem ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                  Saving...
                                </>
                              ) : (
                                `Save Semester ${sem.semesterNumber}`
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3 justify-between mt-6">
                <Link to="/admin">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    data-ocid="admin.form.cancel_button"
                  >
                    Done — Back to Dashboard
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

          {!baseCreated && !isEdit && (
            <div className="flex justify-end mt-4">
              <Link to="/admin">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  data-ocid="admin.form.cancel_button"
                >
                  Cancel
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </main>

      <footer className="relative z-10 max-w-4xl mx-auto px-6 py-6 mt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
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
