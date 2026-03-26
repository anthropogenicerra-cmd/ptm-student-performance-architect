import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddSemesterRequest,
  CreateStudentRequest,
  Student,
  UpdateSemesterRequest,
  UpdateStudentRequest,
} from "../backend";
import { useActor } from "./useActor";

export function useGetAllStudents() {
  const { actor, isFetching } = useActor();
  return useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllStudents();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetStudent(id: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Student>({
    queryKey: ["student", id],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getStudent(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsAdminAssigned() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdminAssigned"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isAdminAssigned();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useClaimFirstAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const success = await actor.claimFirstAdmin();
      if (!success)
        throw new Error(
          "Could not claim admin access. An admin may already be assigned.",
        );
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["isAdminAssigned"] });
    },
  });
}

export function useCreateStudent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateStudentRequest) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createStudent(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUpdateStudent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateStudentRequest) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateStudent(data);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", vars.id] });
    },
  });
}

export function useDeleteStudent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteStudent(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useAddSemester() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AddSemesterRequest) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addSemester(data);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", vars.id] });
    },
  });
}

export function useUpdateSemester() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateSemesterRequest) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateSemester(data);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", vars.id] });
    },
  });
}

export function useDeleteSemester() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      semesterNumber,
    }: { id: string; semesterNumber: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteSemester(id, semesterNumber);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", vars.id] });
    },
  });
}
