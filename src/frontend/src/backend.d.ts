import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AddSemesterRequest {
    id: string;
    subjects: Array<Subject>;
    overallPerformance: string;
    semesterNumber: bigint;
}
export interface UpdateSemesterRequest {
    id: string;
    subjects: Array<Subject>;
    overallPerformance: string;
    semesterNumber: bigint;
}
export type Time = bigint;
export interface StudentBase {
    id: string;
    deleted: boolean;
    updatedTime?: Time;
    name: string;
    photoUrl?: string;
    createdTime: Time;
    className: string;
    psychologicalContext: string;
}
export interface SemesterData {
    subjects: Array<Subject>;
    overallPerformance: string;
    semesterNumber: bigint;
}
export interface UpdateStudentRequest {
    id: string;
    name: string;
    photoUrl?: string;
    className: string;
    psychologicalContext: string;
}
export interface CreateStudentRequest {
    id: string;
    name: string;
    photoUrl?: string;
    className: string;
    psychologicalContext: string;
}
export interface Subject {
    marks: bigint;
    name: string;
    detailedNote: string;
}
export interface Student {
    base: StudentBase;
    semesters: Array<SemesterData>;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addSemester(request: AddSemesterRequest): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimFirstAdmin(): Promise<boolean>;
    createStudent(request: CreateStudentRequest): Promise<void>;
    deleteSemester(id: string, semesterNumber: bigint): Promise<void>;
    deleteStudent(id: string): Promise<void>;
    getAllStudents(): Promise<Array<Student>>;
    getCallerUserRole(): Promise<UserRole>;
    getStudent(id: string): Promise<Student>;
    isAdminAssigned(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    updateSemester(request: UpdateSemesterRequest): Promise<void>;
    updateStudent(request: UpdateStudentRequest): Promise<void>;
}
