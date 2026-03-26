import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";

import Text "mo:core/Text";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

//"with" syntax applies the migration function post-upgrade to move previous state to new state

actor {
  include MixinStorage();

  // Types
  type Subject = {
    name : Text;
    marks : Nat;
    detailedNote : Text;
  };

  type SemesterData = {
    semesterNumber : Nat;
    overallPerformance : Text;
    subjects : [Subject];
  };

  type StudentBase = {
    id : Text;
    name : Text;
    className : Text;
    psychologicalContext : Text;
    photoUrl : ?Text;
    createdTime : Time.Time;
    updatedTime : ?Time.Time;
    deleted : Bool;
  };

  type Student = {
    base : StudentBase;
    semesters : [SemesterData];
  };

  // Initialize mutable students map with empty values.
  let students = Map.empty<Text, Student>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Check if an admin has already been assigned
  public query func isAdminAssigned() : async Bool {
    accessControlState.adminAssigned;
  };

  // Allow the first caller to claim admin (professor) role - no token required
  public shared ({ caller }) func claimFirstAdmin() : async Bool {
    if (caller.isAnonymous()) { return false };
    if (accessControlState.adminAssigned) { return false };
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    true;
  };

  // Student CRUD operations (without semesters)
  public type CreateStudentRequest = {
    id : Text;
    name : Text;
    className : Text;
    psychologicalContext : Text;
    photoUrl : ?Text;
  };

  public shared ({ caller }) func createStudent(request : CreateStudentRequest) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create students");
    };

    if (students.containsKey(request.id)) { Runtime.trap("Student with this ID already exists") };

    let base : StudentBase = {
      id = request.id;
      name = request.name;
      className = request.className;
      psychologicalContext = request.psychologicalContext;
      photoUrl = request.photoUrl;
      createdTime = Time.now();
      updatedTime = null;
      deleted = false;
    };

    let student : Student = {
      base;
      semesters = [];
    };

    students.add(request.id, student);
  };

  public type UpdateStudentRequest = {
    id : Text;
    name : Text;
    className : Text;
    psychologicalContext : Text;
    photoUrl : ?Text;
  };

  public shared ({ caller }) func updateStudent(request : UpdateStudentRequest) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update students");
    };

    switch (students.get(request.id)) {
      case (null) { Runtime.trap("Student not found") };
      case (?existingStudent) {
        let oldBase = existingStudent.base;
        let updatedBase : StudentBase = {
          id = request.id;
          name = request.name;
          className = request.className;
          psychologicalContext = request.psychologicalContext;
          photoUrl = request.photoUrl;
          createdTime = oldBase.createdTime;
          updatedTime = ?Time.now();
          deleted = oldBase.deleted;
        };
        let updatedStudent : Student = {
          base = updatedBase;
          semesters = existingStudent.semesters;
        };
        students.add(request.id, updatedStudent);
      };
    };
  };

  public shared ({ caller }) func deleteStudent(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete students");
    };

    switch (students.get(id)) {
      case (null) { Runtime.trap("Student not found") };
      case (?existingStudent) {
        let deletedBase = {
          id = id;
          name = existingStudent.base.name;
          className = existingStudent.base.className;
          psychologicalContext = existingStudent.base.psychologicalContext;
          photoUrl = existingStudent.base.photoUrl;
          createdTime = existingStudent.base.createdTime;
          updatedTime = ?Time.now();
          deleted = true;
        };
        let deletedStudent : Student = {
          base = deletedBase;
          semesters = existingStudent.semesters;
        };
        students.add(id, deletedStudent);
      };
    };
  };

  // Semester CRUD operations for a student
  public type AddSemesterRequest = {
    id : Text;
    semesterNumber : Nat;
    overallPerformance : Text;
    subjects : [Subject];
  };

  public shared ({ caller }) func addSemester(request : AddSemesterRequest) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add semesters");
    };

    switch (students.get(request.id)) {
      case (null) { Runtime.trap("Student not found") };
      case (?student) {
        // Check if semester already exists
        let existingSemesters = List.fromArray<SemesterData>(student.semesters);
        let hasExisting = existingSemesters.any(func(s) { s.semesterNumber == request.semesterNumber });
        if (hasExisting) { Runtime.trap("Semester already exists") };

        let newSemester : SemesterData = {
          semesterNumber = request.semesterNumber;
          overallPerformance = request.overallPerformance;
          subjects = request.subjects;
        };

        existingSemesters.add(newSemester);
        let updatedStudent : Student = {
          base = student.base;
          semesters = existingSemesters.toArray();
        };
        students.add(request.id, updatedStudent);
      };
    };
  };

  public type UpdateSemesterRequest = {
    id : Text;
    semesterNumber : Nat;
    overallPerformance : Text;
    subjects : [Subject];
  };

  public shared ({ caller }) func updateSemester(request : UpdateSemesterRequest) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update semesters");
    };

    switch (students.get(request.id)) {
      case (null) { Runtime.trap("Student not found") };
      case (?student) {
        let updatedSemesters = student.semesters.map(
          func(s) {
            if (s.semesterNumber == request.semesterNumber) {
              {
                semesterNumber = request.semesterNumber;
                overallPerformance = request.overallPerformance;
                subjects = request.subjects;
              };
            } else { s };
          }
        );
        let updatedStudent : Student = {
          base = student.base;
          semesters = updatedSemesters;
        };
        students.add(request.id, updatedStudent);
      };
    };
  };

  public shared ({ caller }) func deleteSemester(id : Text, semesterNumber : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete semesters");
    };

    switch (students.get(id)) {
      case (null) { Runtime.trap("Student not found") };
      case (?student) {
        let remainingSemesters = student.semesters.filter(
          func(s) { s.semesterNumber != semesterNumber }
        );
        let updatedStudent : Student = {
          base = student.base;
          semesters = remainingSemesters;
        };
        students.add(id, updatedStudent);
      };
    };
  };

  public query func getStudent(id : Text) : async Student {
    switch (students.get(id)) {
      case (null) { Runtime.trap("Student not found") };
      case (?student) {
        if (student.base.deleted) {
          Runtime.trap("Student not found");
        } else { student };
      };
    };
  };

  public query func getAllStudents() : async [Student] {
    students.values().toArray().filter(func(s) { not s.base.deleted });
  };
};
