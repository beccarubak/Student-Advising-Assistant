import { useState, useEffect } from "react";
import { graphqlRequest } from "../services/api";

interface Course {
  id: string;
  courseName: string;
  courseCode: string;
  credits: number;
}

interface DegreeProgram {
  programName: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  academicStatus: string;
  degreeProgram: DegreeProgram | null;
}

interface Advisor {
  firstName: string;
  lastName: string;
}

interface DegreeProgramOption {
  id: string;
  programName: string;
}

interface DegreeAudit {
  totalCreditsRequired: number;
  creditsCompleted: number;
  creditsRemaining: number;
  remainingCourses: Course[];
}

interface AdvisingNote {
  id: string;
  note: string;
  createdAt: string;
}

interface ChangeRequest {
  id: string;
  student: Student;
  requestType: string;
  currentValue: string;
  proposedValue: string;
  status: string;
  advisorNotes: string | null;
  createdAt: string;
}

interface Enrollment {
  id: string;
  course: Course;
  term: string;
  status: string;
  grade?: string;
}

function getAdvisorIdFromToken(): string {
  const token = localStorage.getItem("token")!;
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.userId;
}

function requestStatusColor(status: string): string {
  if (status === "pending") return "#F1C40F";
  if (status === "approved") return "#388e3c";
  return "#c62828";
}

function requestStatusTextColor(status: string): string {
  return status === "pending" ? "#2E4053" : "white";
}

function academicStatusColor(status: string): string {
  if (status === "Active") return "#2E4053";
  if (status === "Graduated") return "#388e3c";
  return "#c62828";
}

function enrollmentStatusStyle(status: string): React.CSSProperties {
  if (status === "Completed") return { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" };
  if (status === "Enrolled") return { background: "#e3f2fd", color: "#1565c0", border: "1px solid #90caf9" };
  return { background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" };
}

import React from "react";

function AdvisorDashboard() {
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [audit, setAudit] = useState<DegreeAudit | null>(null);
  const [notes, setNotes] = useState<AdvisingNote[]>([]);
  const [studentRequests, setStudentRequests] = useState<ChangeRequest[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteError, setNoteError] = useState("");

  // Create student modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [degreePrograms, setDegreePrograms] = useState<DegreeProgramOption[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [createForm, setCreateForm] = useState({
    firstName: "", lastName: "", email: "", academicStatus: "Active", degreeProgramId: "",
  });
  const [createError, setCreateError] = useState("");

  // Edit student modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", email: "", academicStatus: "Active", degreeProgramId: "",
  });
  const [editError, setEditError] = useState("");

  // Add enrollment
  const [showAddEnrollment, setShowAddEnrollment] = useState(false);
  const [addEnrollmentForm, setAddEnrollmentForm] = useState({ courseId: "", term: "" });
  const [addEnrollmentError, setAddEnrollmentError] = useState("");

  // Inline grade inputs for completing enrollments
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [enrollmentError, setEnrollmentError] = useState("");

  const advisorId = getAdvisorIdFromToken();

  useEffect(() => {
    graphqlRequest<{ getAdvisor: Advisor }>(
      `query GetAdvisor($id: ID!) {
        getAdvisor(id: $id) { firstName lastName }
      }`,
      { id: advisorId },
    )
      .then((d) => setAdvisor(d.getAdvisor))
      .catch(console.error);

    graphqlRequest<{ getStudents: Student[] }>(
      `query {
        getStudents {
          id firstName lastName email academicStatus
          degreeProgram { programName }
        }
      }`,
    )
      .then((d) => setStudents(d.getStudents))
      .catch(console.error);

    graphqlRequest<{ getPendingChangeRequests: ChangeRequest[] }>(
      `query {
        getPendingChangeRequests {
          id requestType currentValue proposedValue status createdAt
          student { id firstName lastName }
        }
      }`,
    )
      .then((d) => setPendingRequests(d.getPendingChangeRequests))
      .catch(console.error);

    graphqlRequest<{ getDegreePrograms: DegreeProgramOption[] }>(
      `query { getDegreePrograms { id programName } }`,
    )
      .then((d) => setDegreePrograms(d.getDegreePrograms))
      .catch(console.error);

    graphqlRequest<{ getCourses: Course[] }>(
      `query { getCourses { id courseCode courseName credits } }`,
    )
      .then((d) => setAllCourses(d.getCourses))
      .catch(console.error);
  }, [advisorId]);

  const loadStudent = async (student: Student) => {
    setSelectedStudent(student);
    setAudit(null);
    setNotes([]);
    setStudentRequests([]);
    setEnrollments([]);
    setNewNote("");
    setNoteError("");
    setShowAddEnrollment(false);
    setAddEnrollmentForm({ courseId: "", term: "" });
    setAddEnrollmentError("");
    setEnrollmentError("");
    setGradeInputs({});

    const [auditData, notesData, requestsData, enrollmentsData] = await Promise.all([
      graphqlRequest<{ getDegreeAudit: DegreeAudit }>(
        `query GetAudit($studentId: ID!) {
          getDegreeAudit(studentId: $studentId) {
            totalCreditsRequired creditsCompleted creditsRemaining
            remainingCourses { id courseName courseCode credits }
          }
        }`,
        { studentId: student.id },
      ).catch(() => null),

      graphqlRequest<{ getAdvisingNotes: AdvisingNote[] }>(
        `query GetNotes($studentId: ID!) {
          getAdvisingNotes(studentId: $studentId) { id note createdAt }
        }`,
        { studentId: student.id },
      ).catch(() => null),

      graphqlRequest<{ getAdvisorRequestSummary: ChangeRequest[] }>(
        `query {
          getAdvisorRequestSummary {
            id requestType currentValue proposedValue status advisorNotes createdAt
            student { id firstName lastName }
          }
        }`,
      ).catch(() => null),

      graphqlRequest<{ getStudentEnrollments: Enrollment[] }>(
        `query GetEnrollments($studentId: ID!) {
          getStudentEnrollments(studentId: $studentId) {
            id term status grade
            course { id courseName courseCode credits }
          }
        }`,
        { studentId: student.id },
      ).catch(() => null),
    ]);

    if (auditData) setAudit(auditData.getDegreeAudit);
    if (notesData) setNotes(notesData.getAdvisingNotes);
    if (requestsData) {
      setStudentRequests(
        requestsData.getAdvisorRequestSummary.filter((r) => r.student.id === student.id),
      );
    }
    if (enrollmentsData) setEnrollments(enrollmentsData.getStudentEnrollments);
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedStudent) return;
    setNoteError("");
    try {
      const data = await graphqlRequest<{ createAdvisingNote: AdvisingNote }>(
        `mutation CreateNote($studentId: ID!, $advisorId: ID!, $note: String!) {
          createAdvisingNote(studentId: $studentId, advisorId: $advisorId, note: $note) {
            id note createdAt
          }
        }`,
        { studentId: selectedStudent.id, advisorId, note: newNote },
      );
      setNotes((prev) => [...prev, data.createAdvisingNote]);
      setNewNote("");
    } catch (err: any) {
      setNoteError(err.message);
    }
  };

  const submitCreateStudent = async () => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) {
      setCreateError("First name, last name, and email are required.");
      return;
    }
    setCreateError("");
    try {
      const input: Record<string, string> = {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim(),
        academicStatus: createForm.academicStatus,
      };
      if (createForm.degreeProgramId) input.degreeProgramId = createForm.degreeProgramId;
      const data = await graphqlRequest<{ createStudent: Student }>(
        `mutation CreateStudent($input: StudentInput!) {
          createStudent(input: $input) {
            id firstName lastName email academicStatus
            degreeProgram { programName }
          }
        }`,
        { input },
      );
      setStudents((prev) => [...prev, data.createStudent]);
      setShowCreateModal(false);
      setCreateForm({ firstName: "", lastName: "", email: "", academicStatus: "Active", degreeProgramId: "" });
    } catch (err: any) {
      setCreateError(err.message);
    }
  };

  const openEditModal = () => {
    if (!selectedStudent) return;
    const currentProgramId = degreePrograms.find(
      (p) => p.programName === selectedStudent.degreeProgram?.programName
    )?.id ?? "";
    setEditForm({
      firstName: selectedStudent.firstName,
      lastName: selectedStudent.lastName,
      email: selectedStudent.email,
      academicStatus: selectedStudent.academicStatus,
      degreeProgramId: currentProgramId,
    });
    setEditError("");
    setShowEditModal(true);
  };

  const submitEditStudent = async () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      setEditError("First name, last name, and email are required.");
      return;
    }
    setEditError("");
    try {
      const input: Record<string, string> = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        academicStatus: editForm.academicStatus,
      };
      if (editForm.degreeProgramId) input.degreeProgramId = editForm.degreeProgramId;
      const data = await graphqlRequest<{ updateStudent: Student }>(
        `mutation UpdateStudent($id: ID!, $input: StudentInput!) {
          updateStudent(id: $id, input: $input) {
            id firstName lastName email academicStatus
            degreeProgram { programName }
          }
        }`,
        { id: selectedStudent!.id, input },
      );
      const updated = data.updateStudent;
      setSelectedStudent(updated);
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setShowEditModal(false);
    } catch (err: any) {
      setEditError(err.message);
    }
  };

  const submitAddEnrollment = async () => {
    if (!addEnrollmentForm.courseId || !addEnrollmentForm.term.trim()) {
      setAddEnrollmentError("Course and term are required.");
      return;
    }
    setAddEnrollmentError("");
    try {
      const data = await graphqlRequest<{ enrollStudent: Enrollment }>(
        `mutation EnrollStudent($studentId: ID!, $courseId: ID!, $term: String!) {
          enrollStudent(studentId: $studentId, courseId: $courseId, term: $term) {
            id term status grade
            course { id courseName courseCode credits }
          }
        }`,
        { studentId: selectedStudent!.id, courseId: addEnrollmentForm.courseId, term: addEnrollmentForm.term.trim() },
      );
      setEnrollments((prev) => [...prev, data.enrollStudent]);
      setShowAddEnrollment(false);
      setAddEnrollmentForm({ courseId: "", term: "" });
      // Reload audit since credits may have changed
      graphqlRequest<{ getDegreeAudit: DegreeAudit }>(
        `query GetAudit($studentId: ID!) {
          getDegreeAudit(studentId: $studentId) {
            totalCreditsRequired creditsCompleted creditsRemaining
            remainingCourses { id courseName courseCode credits }
          }
        }`,
        { studentId: selectedStudent!.id },
      ).then((d) => setAudit(d.getDegreeAudit)).catch(console.error);
    } catch (err: any) {
      setAddEnrollmentError(err.message);
    }
  };

  const updateEnrollmentStatus = async (enrollmentId: string, status: string, grade?: string) => {
    setEnrollmentError("");
    try {
      const data = await graphqlRequest<{ updateEnrollmentStatus: Enrollment }>(
        `mutation UpdateEnrollment($enrollmentId: ID!, $status: EnrollmentStatus!, $grade: String) {
          updateEnrollmentStatus(enrollmentId: $enrollmentId, status: $status, grade: $grade) {
            id term status grade
            course { id courseName courseCode credits }
          }
        }`,
        { enrollmentId, status, grade },
      );
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? data.updateEnrollmentStatus : e)),
      );
      setGradeInputs((prev) => { const n = { ...prev }; delete n[enrollmentId]; return n; });
      // Reload audit
      graphqlRequest<{ getDegreeAudit: DegreeAudit }>(
        `query GetAudit($studentId: ID!) {
          getDegreeAudit(studentId: $studentId) {
            totalCreditsRequired creditsCompleted creditsRemaining
            remainingCourses { id courseName courseCode credits }
          }
        }`,
        { studentId: selectedStudent!.id },
      ).then((d) => setAudit(d.getDegreeAudit)).catch(console.error);
    } catch (err: any) {
      setEnrollmentError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.reload();
  };

  const progressPct = audit
    ? Math.min((audit.creditsCompleted / audit.totalCreditsRequired) * 100, 100)
    : 0;

  const formatDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString() : "");

  const modalFormStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", fontSize: "0.95rem",
    padding: "9px 12px", borderRadius: 6, border: "1px solid #BFC9CA",
    outline: "none", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.85rem", color: "#566573", marginBottom: 4,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#D5D8DC" }}>
      {/* Navbar */}
      <div style={{ display: "flex", alignItems: "center", padding: "14px 32px", background: "#2E4053", color: "white", position: "relative" }}>
        <div style={{ flex: 1 }} />
        <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: "1.5rem", fontWeight: "bold" }}>
          Academic Advising Portal
        </span>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 20 }}>
          {advisor && (
            <span style={{ fontSize: "1.2rem", fontWeight: "500" }}>
              {advisor.firstName} {advisor.lastName}
            </span>
          )}
          <button onClick={logout} style={{ background: "transparent", border: "1px solid white", color: "white", padding: "6px 14px", cursor: "pointer", borderRadius: 4, fontSize: "0.9rem" }}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flex: 1, padding: 24, gap: 20, height: "calc(100vh - 57px)", boxSizing: "border-box" }}>
        {/* Left Panel */}
        <div style={{ flex: "0 0 35%", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Pending Requests */}
          <div style={{ flex: 1, background: "white", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 20, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "1.2rem", color: "#2E4053" }}>
              Pending Requests
              {pendingRequests.length > 0 && (
                <span style={{ background: "#F1C40F", color: "#2E4053", borderRadius: 12, fontSize: "0.75rem", padding: "2px 8px", marginLeft: 8, fontWeight: "700" }}>
                  {pendingRequests.length}
                </span>
              )}
            </h3>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {pendingRequests.length === 0 && (
                <p style={{ color: "#566573", fontSize: "0.9rem", margin: 0 }}>No pending requests.</p>
              )}
              {pendingRequests.map((r) => (
                <div key={r.id} onClick={() => { const s = students.find((s) => s.id === r.student.id); if (s) loadStudent(s); }}
                  style={{ padding: "10px 12px", marginBottom: 10, borderRadius: 6, background: "#fafafa", border: "1px solid #BFC9CA", cursor: "pointer" }}>
                  <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#2E4053" }}>
                    {r.student.firstName} {r.student.lastName}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#566573", marginTop: 3 }}>
                    {r.requestType.replace("_", " ")}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#717D7E", marginTop: 2 }}>
                    {formatDate(r.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student List */}
          <div style={{ flex: 1, background: "white", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 20, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#2E4053" }}>Students</h3>
              <button onClick={() => { setShowCreateModal(true); setCreateError(""); }}
                style={{ fontSize: "0.85rem", padding: "5px 14px", cursor: "pointer", background: "#F1C40F", color: "#2E4053", border: "none", borderRadius: 6, fontWeight: "700", fontFamily: "inherit" }}>
                + New Student
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {students.length === 0 && (
                <p style={{ color: "#566573", fontSize: "0.9rem", margin: 0 }}>No students found.</p>
              )}
              {students.map((s) => (
                <div key={s.id} onClick={() => loadStudent(s)}
                  style={{ padding: "10px 12px", marginBottom: 10, borderRadius: 6, cursor: "pointer", background: selectedStudent?.id === s.id ? "#D5D8DC" : "#fafafa", border: selectedStudent?.id === s.id ? "1px solid #AAB7B8" : "1px solid #BFC9CA" }}>
                  <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#2E4053" }}>
                    {s.firstName} {s.lastName}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#566573", marginTop: 3 }}>
                    {s.degreeProgram?.programName ?? "No program"}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 12, background: academicStatusColor(s.academicStatus), color: "white" }}>
                      {s.academicStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ flex: 1, background: "white", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 28, overflowY: "auto" }}>
          {!selectedStudent ? (
            <div style={{ color: "#717D7E", fontSize: "1rem", marginTop: 300, textAlign: "center" }}>
              Select a student to view their details
            </div>
          ) : (
            <>
              {/* Student Header */}
              <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: "0 0 6px 0", fontSize: "1.4rem", color: "#2E4053" }}>
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </h2>
                  <div style={{ fontSize: "0.9rem", color: "#566573", marginBottom: 6 }}>
                    {selectedStudent.email}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", padding: "2px 10px", borderRadius: 12, background: academicStatusColor(selectedStudent.academicStatus), color: "white" }}>
                      {selectedStudent.academicStatus}
                    </span>
                    {selectedStudent.degreeProgram && (
                      <span style={{ fontSize: "0.9rem", color: "#566573" }}>
                        {selectedStudent.degreeProgram.programName}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={openEditModal}
                  style={{ fontSize: "0.85rem", padding: "7px 16px", cursor: "pointer", background: "#2E4053", color: "white", border: "none", borderRadius: 6, fontWeight: "600", fontFamily: "inherit" }}>
                  Edit Student
                </button>
              </div>

              {/* Degree Progress */}
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#2E4053" }}>Degree Progress</h3>
                {!audit ? (
                  <p style={{ color: "#566573", fontSize: "0.9rem" }}>Loading...</p>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                      <div style={{ flex: 1, background: "#BFC9CA", borderRadius: 8, height: 20, overflow: "hidden" }}>
                        <div style={{ background: "#43a047", height: "100%", borderRadius: 8, width: `${progressPct}%`, transition: "width 0.6s ease" }} />
                      </div>
                      <span style={{ fontSize: "0.9rem", whiteSpace: "nowrap", color: "#566573" }}>
                        {audit.creditsCompleted} / {audit.totalCreditsRequired} credits
                      </span>
                    </div>
                    {audit.remainingCourses.length > 0 && (
                      <>
                        <div style={{ fontSize: "0.85rem", color: "#566573", marginBottom: 8 }}>
                          Remaining required courses:
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {audit.remainingCourses.map((c) => (
                            <span key={c.id} style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: 12, background: "#D5D8DC", color: "#2E4053", border: "1px solid #BFC9CA" }}>
                              {c.courseCode} — {c.courseName}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {audit.remainingCourses.length === 0 && (
                      <div style={{ fontSize: "0.9rem", color: "#388e3c", fontWeight: "600" }}>
                        All required courses completed — eligible for graduation
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Enrollments */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: "#2E4053" }}>Enrollments</h3>
                  <button onClick={() => { setShowAddEnrollment((v) => !v); setAddEnrollmentError(""); }}
                    style={{ fontSize: "0.82rem", padding: "5px 12px", cursor: "pointer", background: "#F1C40F", color: "#2E4053", border: "none", borderRadius: 6, fontWeight: "700", fontFamily: "inherit" }}>
                    {showAddEnrollment ? "Cancel" : "+ Add Enrollment"}
                  </button>
                </div>

                {showAddEnrollment && (
                  <div style={{ background: "#fafafa", border: "1px solid #BFC9CA", borderRadius: 8, padding: 16, marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div style={{ flex: "1 1 180px" }}>
                        <label style={labelStyle}>Course</label>
                        <select value={addEnrollmentForm.courseId}
                          onChange={(e) => setAddEnrollmentForm((f) => ({ ...f, courseId: e.target.value }))}
                          style={{ ...modalFormStyle, background: "white" }}>
                          <option value="">— Select course —</option>
                          {allCourses.map((c) => (
                            <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: "1 1 120px" }}>
                        <label style={labelStyle}>Term (e.g. Fall 2025)</label>
                        <input value={addEnrollmentForm.term}
                          onChange={(e) => setAddEnrollmentForm((f) => ({ ...f, term: e.target.value }))}
                          placeholder="Fall 2025"
                          style={modalFormStyle} />
                      </div>
                      <button onClick={submitAddEnrollment}
                        style={{ fontSize: "0.9rem", padding: "9px 18px", cursor: "pointer", background: "#2E4053", color: "white", border: "none", borderRadius: 6, fontWeight: "600", fontFamily: "inherit", alignSelf: "flex-end" }}>
                        Enroll
                      </button>
                    </div>
                    {addEnrollmentError && (
                      <p style={{ color: "#c62828", fontSize: "0.82rem", margin: "8px 0 0 0" }}>{addEnrollmentError}</p>
                    )}
                  </div>
                )}

                {enrollmentError && (
                  <p style={{ color: "#c62828", fontSize: "0.82rem", marginBottom: 8 }}>{enrollmentError}</p>
                )}

                {enrollments.length === 0 && (
                  <p style={{ color: "#566573", fontSize: "0.9rem" }}>No enrollments.</p>
                )}
                {enrollments.map((e) => (
                  <div key={e.id} style={{ padding: "12px 14px", marginBottom: 10, borderRadius: 6, background: "#fafafa", border: "1px solid #BFC9CA" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#2E4053" }}>
                          {e.course.courseName}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#717D7E", marginTop: 2 }}>
                          {e.course.courseCode} &middot; {e.term}
                          {e.grade && <span style={{ marginLeft: 8 }}>Grade: <strong>{e.grade}</strong></span>}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.78rem", padding: "3px 10px", borderRadius: 12, fontWeight: "500", ...enrollmentStatusStyle(e.status) }}>
                        {e.status}
                      </span>
                    </div>

                    {e.status === "Enrolled" && (
                      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          value={gradeInputs[e.id] ?? ""}
                          onChange={(ev) => setGradeInputs((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                          placeholder="Grade (e.g. A)"
                          style={{ fontSize: "0.82rem", padding: "5px 10px", borderRadius: 6, border: "1px solid #BFC9CA", outline: "none", width: 120, fontFamily: "inherit" }}
                        />
                        <button
                          onClick={() => updateEnrollmentStatus(e.id, "Completed", gradeInputs[e.id])}
                          style={{ fontSize: "0.8rem", padding: "5px 12px", cursor: "pointer", background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7", borderRadius: 6, fontFamily: "inherit" }}>
                          Mark Completed
                        </button>
                        <button
                          onClick={() => updateEnrollmentStatus(e.id, "Dropped")}
                          style={{ fontSize: "0.8rem", padding: "5px 12px", cursor: "pointer", background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a", borderRadius: 6, fontFamily: "inherit" }}>
                          Drop
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Change Requests */}
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#2E4053" }}>Change Requests</h3>
                {studentRequests.length === 0 ? (
                  <p style={{ color: "#566573", fontSize: "0.9rem" }}>No change requests.</p>
                ) : (
                  studentRequests.map((r) => (
                    <div key={r.id} style={{ padding: "12px 14px", marginBottom: 10, borderRadius: 6, background: "#fafafa", border: "1px solid #BFC9CA" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#2E4053" }}>
                          {r.requestType.replace("_", " ")}
                        </div>
                        <span style={{ fontSize: "0.78rem", padding: "2px 9px", borderRadius: 12, background: requestStatusColor(r.status), color: requestStatusTextColor(r.status), fontWeight: "600" }}>
                          {r.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#566573", marginTop: 6 }}>
                        <span style={{ color: "#717D7E" }}>From:</span> {r.currentValue}
                        <span style={{ margin: "0 8px", color: "#717D7E" }}>→</span>
                        {r.proposedValue}
                      </div>
                      {r.advisorNotes && (
                        <div style={{ fontSize: "0.82rem", color: "#566573", marginTop: 6, fontStyle: "italic" }}>
                          Note: {r.advisorNotes}
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: "#717D7E", marginTop: 6 }}>
                        {formatDate(r.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Advising Notes */}
              <div>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#2E4053" }}>Advising Notes</h3>
                {notes.length === 0 && (
                  <p style={{ color: "#566573", fontSize: "0.9rem" }}>No notes yet.</p>
                )}
                {notes.map((n) => (
                  <div key={n.id} style={{ padding: "10px 14px", marginBottom: 10, borderRadius: 6, background: "#fafafa", border: "1px solid #BFC9CA" }}>
                    <div style={{ fontSize: "0.9rem", color: "#2E4053" }}>{n.note}</div>
                    <div style={{ fontSize: "0.78rem", color: "#717D7E", marginTop: 6 }}>{formatDate(n.createdAt)}</div>
                  </div>
                ))}
                {noteError && <p style={{ color: "#c62828", fontSize: "0.85rem" }}>{noteError}</p>}
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()}
                    placeholder="Add a note..."
                    style={{ flex: 1, fontSize: "0.95rem", padding: "9px 12px", borderRadius: 6, border: "1px solid #BFC9CA", outline: "none", fontFamily: "inherit" }} />
                  <button onClick={addNote}
                    style={{ fontSize: "0.95rem", padding: "9px 18px", cursor: "pointer", background: "#F1C40F", color: "#2E4053", border: "none", borderRadius: 6, fontWeight: "700", fontFamily: "inherit" }}>
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Student Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div style={{ background: "white", borderRadius: 10, padding: 32, width: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "1.2rem", color: "#2E4053" }}>Create New Student</h2>
            {(["firstName", "lastName", "email"] as const).map((field) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>
                  {field === "firstName" ? "First Name" : field === "lastName" ? "Last Name" : "Email"}
                  {" "}<span style={{ color: "#c62828" }}>*</span>
                </label>
                <input type={field === "email" ? "email" : "text"} value={createForm[field]}
                  onChange={(e) => setCreateForm((f) => ({ ...f, [field]: e.target.value }))}
                  style={modalFormStyle} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Academic Status</label>
              <select value={createForm.academicStatus} onChange={(e) => setCreateForm((f) => ({ ...f, academicStatus: e.target.value }))}
                style={{ ...modalFormStyle, background: "white" }}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Degree Program</label>
              <select value={createForm.degreeProgramId} onChange={(e) => setCreateForm((f) => ({ ...f, degreeProgramId: e.target.value }))}
                style={{ ...modalFormStyle, background: "white" }}>
                <option value="">— None —</option>
                {degreePrograms.map((p) => <option key={p.id} value={p.id}>{p.programName}</option>)}
              </select>
            </div>
            {createError && <p style={{ color: "#c62828", fontSize: "0.85rem", marginBottom: 12 }}>{createError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreateModal(false)}
                style={{ fontSize: "0.95rem", padding: "9px 20px", cursor: "pointer", background: "transparent", color: "#566573", border: "1px solid #BFC9CA", borderRadius: 6, fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={submitCreateStudent}
                style={{ fontSize: "0.95rem", padding: "9px 20px", cursor: "pointer", background: "#F1C40F", color: "#2E4053", border: "none", borderRadius: 6, fontWeight: "700", fontFamily: "inherit" }}>
                Create Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div style={{ background: "white", borderRadius: 10, padding: 32, width: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "1.2rem", color: "#2E4053" }}>Edit Student</h2>
            {(["firstName", "lastName", "email"] as const).map((field) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>
                  {field === "firstName" ? "First Name" : field === "lastName" ? "Last Name" : "Email"}
                  {" "}<span style={{ color: "#c62828" }}>*</span>
                </label>
                <input type={field === "email" ? "email" : "text"} value={editForm[field]}
                  onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                  style={modalFormStyle} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Academic Status</label>
              <select value={editForm.academicStatus} onChange={(e) => setEditForm((f) => ({ ...f, academicStatus: e.target.value }))}
                style={{ ...modalFormStyle, background: "white" }}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Degree Program</label>
              <select value={editForm.degreeProgramId} onChange={(e) => setEditForm((f) => ({ ...f, degreeProgramId: e.target.value }))}
                style={{ ...modalFormStyle, background: "white" }}>
                <option value="">— None —</option>
                {degreePrograms.map((p) => <option key={p.id} value={p.id}>{p.programName}</option>)}
              </select>
            </div>
            {editError && <p style={{ color: "#c62828", fontSize: "0.85rem", marginBottom: 12 }}>{editError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowEditModal(false)}
                style={{ fontSize: "0.95rem", padding: "9px 20px", cursor: "pointer", background: "transparent", color: "#566573", border: "1px solid #BFC9CA", borderRadius: 6, fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={submitEditStudent}
                style={{ fontSize: "0.95rem", padding: "9px 20px", cursor: "pointer", background: "#F1C40F", color: "#2E4053", border: "none", borderRadius: 6, fontWeight: "700", fontFamily: "inherit" }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvisorDashboard;
