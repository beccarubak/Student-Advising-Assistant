import React, { useState, useEffect } from "react";
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
  courseId?: string;
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

function academicStatusStyle(status: string): React.CSSProperties {
  if (status === "Active")
    return { background: "#e3f2fd", color: "#1565c0", border: "1px solid #90caf9" };
  if (status === "Graduated")
    return { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" };
  return { background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" };
}

function enrollmentStatusStyle(status: string): React.CSSProperties {
  if (status === "Completed")
    return { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" };
  if (status === "Enrolled")
    return { background: "#e3f2fd", color: "#1565c0", border: "1px solid #90caf9" };
  return { background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" };
}

function AdvisorDashboard() {
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([]);

  // Accordion: which student is expanded
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
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
    firstName: "",
    lastName: "",
    email: "",
    academicStatus: "Active",
    degreeProgramId: "",
  });
  const [createError, setCreateError] = useState("");

  // Edit student modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    academicStatus: "Active",
    degreeProgramId: "",
  });
  const [editError, setEditError] = useState("");

  // Add enrollment
  const [showAddEnrollment, setShowAddEnrollment] = useState(false);
  const [addEnrollmentForm, setAddEnrollmentForm] = useState({ courseId: "", term: "" });
  const [addEnrollmentError, setAddEnrollmentError] = useState("");

  // Inline grade inputs
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [enrollmentError, setEnrollmentError] = useState("");

  // Aggregate advisor chat (right panel)
  const [chatMessages, setChatMessages] = useState<{ user: string; bot: string }[]>([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatError, setChatError] = useState("");

  // Per-student chat (inside accordion)
  const [studentChatMessages, setStudentChatMessages] = useState<{ user: string; bot: string }[]>([]);
  const [studentChatInput, setStudentChatInput] = useState("");
  const [studentChatError, setStudentChatError] = useState("");

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
    setExpandedStudentId(student.id);
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
    setStudentChatMessages([]);
    setStudentChatInput("");
    setStudentChatError("");

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

  const toggleStudent = (student: Student) => {
    if (expandedStudentId === student.id) {
      setExpandedStudentId(null);
      setSelectedStudent(null);
      setAudit(null);
      setNotes([]);
      setStudentRequests([]);
      setEnrollments([]);
      setShowAddEnrollment(false);
      setGradeInputs({});
      setEnrollmentError("");
      setNoteError("");
      setStudentChatMessages([]);
      setStudentChatInput("");
      setStudentChatError("");
    } else {
      loadStudent(student);
    }
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
    const currentProgramId =
      degreePrograms.find((p) => p.programName === selectedStudent.degreeProgram?.programName)?.id ?? "";
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
      graphqlRequest<{ getDegreeAudit: DegreeAudit }>(
        `query GetAudit($studentId: ID!) {
          getDegreeAudit(studentId: $studentId) {
            totalCreditsRequired creditsCompleted creditsRemaining
            remainingCourses { id courseName courseCode credits }
          }
        }`,
        { studentId: selectedStudent!.id },
      )
        .then((d) => setAudit(d.getDegreeAudit))
        .catch(console.error);
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
      setGradeInputs((prev) => {
        const n = { ...prev };
        delete n[enrollmentId];
        return n;
      });
      graphqlRequest<{ getDegreeAudit: DegreeAudit }>(
        `query GetAudit($studentId: ID!) {
          getDegreeAudit(studentId: $studentId) {
            totalCreditsRequired creditsCompleted creditsRemaining
            remainingCourses { id courseName courseCode credits }
          }
        }`,
        { studentId: selectedStudent!.id },
      )
        .then((d) => setAudit(d.getDegreeAudit))
        .catch(console.error);
    } catch (err: any) {
      setEnrollmentError(err.message);
    }
  };

  const [resolveError, setResolveError] = useState("");

  const resolveRequest = async (requestId: string, status: "approved" | "denied") => {
    setResolveError("");
    try {
      await graphqlRequest<{ resolveChangeRequest: ChangeRequest }>(
        `mutation Resolve($id: ID!, $status: RequestStatus!) {
          resolveChangeRequest(id: $id, status: $status) { id status }
        }`,
        { id: requestId, status },
      );
      // Update local change requests list
      setStudentRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status } : r)),
      );
      // Remove from pending requests panel
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      // If an enrollment was just approved, refresh enrollments and audit
      if (status === "approved" && selectedStudent) {
        graphqlRequest<{ getStudentEnrollments: Enrollment[] }>(
          `query GetEnrollments($studentId: ID!) {
            getStudentEnrollments(studentId: $studentId) {
              id term status grade
              course { id courseName courseCode credits }
            }
          }`,
          { studentId: selectedStudent.id },
        )
          .then((d) => setEnrollments(d.getStudentEnrollments))
          .catch(console.error);
        graphqlRequest<{ getDegreeAudit: DegreeAudit }>(
          `query GetAudit($studentId: ID!) {
            getDegreeAudit(studentId: $studentId) {
              totalCreditsRequired creditsCompleted creditsRemaining
              remainingCourses { id courseName courseCode credits }
            }
          }`,
          { studentId: selectedStudent.id },
        )
          .then((d) => setAudit(d.getDegreeAudit))
          .catch(console.error);
      }
    } catch (err: any) {
      setResolveError(err.message);
    }
  };

  const sendStudentChatMessage = async () => {
    if (!studentChatInput.trim() || !selectedStudent) return;
    setStudentChatError("");
    const q = studentChatInput;
    setStudentChatInput("");
    try {
      const data = await graphqlRequest<{ askAdvisorStudentQuestion: string }>(
        `mutation AskStudentQ($studentId: ID!, $question: String!) {
           askAdvisorStudentQuestion(studentId: $studentId, question: $question)
         }`,
        { studentId: selectedStudent.id, question: q },
      );
      setStudentChatMessages((prev) => [...prev, { user: q, bot: data.askAdvisorStudentQuestion }]);
    } catch (err: any) {
      setStudentChatError(err.message);
    }
  };

  const sendChatMessage = async () => {
    if (!chatQuestion.trim()) return;
    setChatError("");
    const q = chatQuestion;
    setChatQuestion("");
    try {
      const data = await graphqlRequest<{ askAdvisorQuestion: string }>(
        `mutation AskAdvisor($question: String!) { askAdvisorQuestion(question: $question) }`,
        { question: q },
      );
      setChatMessages((prev) => [...prev, { user: q, bot: data.askAdvisorQuestion }]);
    } catch (err: any) {
      setChatError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.reload();
  };

  const formatDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString() : "");

  const progressPct = audit
    ? Math.min((audit.creditsCompleted / audit.totalCreditsRequired) * 100, 100)
    : 0;

  const modalFormStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    fontSize: "0.95rem",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1px solid #BFC9CA",
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.85rem",
    color: "#566573",
    marginBottom: 4,
  };

  const sectionHeadingStyle: React.CSSProperties = {
    margin: "0 0 10px 0",
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#2E4053",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#D5D8DC" }}>

      {/* Navbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 32px",
          background: "#2E4053",
          color: "white",
          position: "relative",
        }}
      >
        <div style={{ flex: 1 }} />
        <span
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "1.5rem",
            fontWeight: "bold",
          }}
        >
          Academic Advising Portal
        </span>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 20 }}>
          {advisor && (
            <span style={{ fontSize: "1.2rem", fontWeight: "500" }}>
              {advisor.firstName} {advisor.lastName}
            </span>
          )}
          <button
            onClick={logout}
            style={{
              background: "transparent",
              border: "1px solid white",
              color: "white",
              padding: "6px 14px",
              cursor: "pointer",
              borderRadius: 4,
              fontSize: "0.9rem",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: 24,
          gap: 20,
          height: "calc(100vh - 57px)",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Left Panel — Pending Requests + Students Accordion */}
        <div style={{ flex: "0 0 48%", display: "flex", flexDirection: "column", gap: 16, minWidth: 0, overflow: "hidden" }}>

          {/* Pending Requests */}
          <div
            style={{
              flex: "0 0 auto",
              maxHeight: "32%",
              background: "white",
              borderRadius: 8,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#2E4053", fontWeight: "700" }}>
              Pending Requests
              {pendingRequests.length > 0 && (
                <span
                  style={{
                    background: "#F1C40F",
                    color: "#2E4053",
                    borderRadius: 12,
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    marginLeft: 8,
                    fontWeight: "700",
                  }}
                >
                  {pendingRequests.length}
                </span>
              )}
            </h3>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {pendingRequests.length === 0 && (
                <p style={{ color: "#566573", fontSize: "0.9rem", margin: 0 }}>No pending requests.</p>
              )}
              {pendingRequests.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    const s = students.find((s) => s.id === r.student.id);
                    if (s) loadStudent(s);
                  }}
                  style={{
                    padding: "10px 12px",
                    marginBottom: 8,
                    borderRadius: 6,
                    background: "#fafafa",
                    border: "1px solid #BFC9CA",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: "600", fontSize: "0.88rem", color: "#2E4053" }}>
                    {r.student.firstName} {r.student.lastName}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#566573", marginTop: 2 }}>
                    {r.requestType.replace("_", " ")} &middot; {formatDate(r.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Students Accordion */}
          <div
            style={{
              flex: 1,
              background: "white",
              borderRadius: 8,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: "1rem", color: "#2E4053", fontWeight: "700" }}>Students</h3>
              <button
                onClick={() => { setShowCreateModal(true); setCreateError(""); }}
                style={{
                  fontSize: "0.82rem",
                  padding: "5px 14px",
                  cursor: "pointer",
                  background: "#F1C40F",
                  color: "#2E4053",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: "700",
                  fontFamily: "inherit",
                }}
              >
                + New Student
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {students.length === 0 && (
                <p style={{ color: "#566573", fontSize: "0.9rem", margin: 0 }}>No students found.</p>
              )}
              {students.map((s) => {
                const isExpanded = expandedStudentId === s.id;
                return (
                  <div
                    key={s.id}
                    style={{
                      marginBottom: 10,
                      borderRadius: 8,
                      border: isExpanded ? "1px solid #AAB7B8" : "1px solid #BFC9CA",
                      overflow: "hidden",
                      background: "white",
                    }}
                  >
                    {/* Accordion Header */}
                    <div
                      onClick={() => toggleStudent(s)}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        background: isExpanded ? "#EAF0F1" : "#fafafa",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#2E4053" }}>
                          {s.firstName} {s.lastName}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#566573", marginTop: 2 }}>
                          {s.degreeProgram?.programName ?? "No program"}
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 5,
                            fontSize: "0.73rem",
                            padding: "2px 9px",
                            borderRadius: 12,
                            fontWeight: "500",
                            ...academicStatusStyle(s.academicStatus),
                          }}
                        >
                          {s.academicStatus}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {isExpanded && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(); }}
                            style={{
                              fontSize: "0.78rem",
                              padding: "4px 10px",
                              cursor: "pointer",
                              background: "#2E4053",
                              color: "white",
                              border: "none",
                              borderRadius: 5,
                              fontWeight: "600",
                              fontFamily: "inherit",
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <span style={{ color: "#888", fontSize: "0.85rem", userSelect: "none" }}>
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* Accordion Body */}
                    {isExpanded && (
                      <div style={{ padding: "20px 18px", borderTop: "1px solid #e8eaed", background: "white" }}>

                        {/* Student email */}
                        <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "#566573" }}>
                          {s.email}
                        </p>

                        {/* Degree Progress */}
                        <div style={{ marginBottom: 20 }}>
                          <h4 style={sectionHeadingStyle}>Degree Progress</h4>
                          {!audit ? (
                            <p style={{ color: "#566573", fontSize: "0.85rem" }}>Loading...</p>
                          ) : (
                            <>
                              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                                <div style={{ flex: 1, background: "#BFC9CA", borderRadius: 8, height: 16, overflow: "hidden" }}>
                                  <div
                                    style={{
                                      background: "#43a047",
                                      height: "100%",
                                      borderRadius: 8,
                                      width: `${progressPct}%`,
                                      transition: "width 0.6s ease",
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: "0.82rem", whiteSpace: "nowrap", color: "#566573" }}>
                                  {audit.creditsCompleted} / {audit.totalCreditsRequired} credits
                                </span>
                              </div>
                              {audit.remainingCourses.length === 0 ? (
                                <div style={{ fontSize: "0.85rem", color: "#388e3c", fontWeight: "600" }}>
                                  All required courses completed — eligible for graduation
                                </div>
                              ) : (
                                <>
                                  <div style={{ fontSize: "0.8rem", color: "#566573", marginBottom: 6 }}>
                                    Remaining required courses:
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {audit.remainingCourses.map((c) => (
                                      <span
                                        key={c.id}
                                        style={{
                                          fontSize: "0.75rem",
                                          padding: "2px 8px",
                                          borderRadius: 10,
                                          background: "#D5D8DC",
                                          color: "#2E4053",
                                          border: "1px solid #BFC9CA",
                                        }}
                                      >
                                        {c.courseCode} — {c.courseName}
                                      </span>
                                    ))}
                                  </div>
                                </>
                              )}
                            </>
                          )}
                        </div>

                        {/* Enrollments */}
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <h4 style={{ ...sectionHeadingStyle, margin: 0 }}>Enrollments</h4>
                            <button
                              onClick={() => { setShowAddEnrollment((v) => !v); setAddEnrollmentError(""); }}
                              style={{
                                fontSize: "0.78rem",
                                padding: "4px 10px",
                                cursor: "pointer",
                                background: "#F1C40F",
                                color: "#2E4053",
                                border: "none",
                                borderRadius: 5,
                                fontWeight: "700",
                                fontFamily: "inherit",
                              }}
                            >
                              {showAddEnrollment ? "Cancel" : "+ Add"}
                            </button>
                          </div>

                          {showAddEnrollment && (
                            <div style={{ background: "#fafafa", border: "1px solid #BFC9CA", borderRadius: 7, padding: 12, marginBottom: 10 }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                                <div style={{ flex: "1 1 150px" }}>
                                  <label style={labelStyle}>Course</label>
                                  <select
                                    value={addEnrollmentForm.courseId}
                                    onChange={(e) => setAddEnrollmentForm((f) => ({ ...f, courseId: e.target.value }))}
                                    style={{ ...modalFormStyle, background: "white", fontSize: "0.85rem", padding: "7px 10px" }}
                                  >
                                    <option value="">— Select —</option>
                                    {allCourses.map((c) => (
                                      <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ flex: "1 1 100px" }}>
                                  <label style={labelStyle}>Term</label>
                                  <input
                                    value={addEnrollmentForm.term}
                                    onChange={(e) => setAddEnrollmentForm((f) => ({ ...f, term: e.target.value }))}
                                    placeholder="Fall 2025"
                                    style={{ ...modalFormStyle, fontSize: "0.85rem", padding: "7px 10px" }}
                                  />
                                </div>
                                <button
                                  onClick={submitAddEnrollment}
                                  style={{
                                    fontSize: "0.85rem",
                                    padding: "7px 14px",
                                    cursor: "pointer",
                                    background: "#2E4053",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 5,
                                    fontWeight: "600",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  Enroll
                                </button>
                              </div>
                              {addEnrollmentError && (
                                <p style={{ color: "#c62828", fontSize: "0.8rem", margin: "6px 0 0 0" }}>
                                  {addEnrollmentError}
                                </p>
                              )}
                            </div>
                          )}

                          {enrollmentError && (
                            <p style={{ color: "#c62828", fontSize: "0.8rem", marginBottom: 6 }}>{enrollmentError}</p>
                          )}

                          {enrollments.length === 0 && (
                            <p style={{ color: "#566573", fontSize: "0.85rem" }}>No enrollments.</p>
                          )}
                          {enrollments.map((e) => (
                            <div
                              key={e.id}
                              style={{
                                padding: "10px 12px",
                                marginBottom: 8,
                                borderRadius: 6,
                                background: "#fafafa",
                                border: "1px solid #BFC9CA",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                                <div>
                                  <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "#2E4053" }}>
                                    {e.course.courseName}
                                  </div>
                                  <div style={{ fontSize: "0.78rem", color: "#717D7E", marginTop: 2 }}>
                                    {e.course.courseCode} &middot; {e.term}
                                    {e.grade && <span style={{ marginLeft: 6 }}>Grade: <strong>{e.grade}</strong></span>}
                                  </div>
                                </div>
                                <span style={{ fontSize: "0.73rem", padding: "2px 8px", borderRadius: 10, fontWeight: "500", ...enrollmentStatusStyle(e.status) }}>
                                  {e.status}
                                </span>
                              </div>
                              {e.status === "Enrolled" && (
                                <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                  <input
                                    value={gradeInputs[e.id] ?? ""}
                                    onChange={(ev) => setGradeInputs((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                                    placeholder="Grade (e.g. A)"
                                    style={{ fontSize: "0.8rem", padding: "4px 8px", borderRadius: 5, border: "1px solid #BFC9CA", outline: "none", width: 110, fontFamily: "inherit" }}
                                  />
                                  <button
                                    onClick={() => updateEnrollmentStatus(e.id, "Completed", gradeInputs[e.id])}
                                    style={{ fontSize: "0.75rem", padding: "4px 10px", cursor: "pointer", background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7", borderRadius: 5, fontFamily: "inherit" }}
                                  >
                                    Complete
                                  </button>
                                  <button
                                    onClick={() => updateEnrollmentStatus(e.id, "Dropped")}
                                    style={{ fontSize: "0.75rem", padding: "4px 10px", cursor: "pointer", background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a", borderRadius: 5, fontFamily: "inherit" }}
                                  >
                                    Drop
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Change Requests */}
                        <div style={{ marginBottom: 20 }}>
                          <h4 style={sectionHeadingStyle}>Change Requests</h4>
                          {resolveError && (
                            <p style={{ color: "#c62828", fontSize: "0.82rem", marginBottom: 8 }}>{resolveError}</p>
                          )}
                          {studentRequests.length === 0 ? (
                            <p style={{ color: "#566573", fontSize: "0.85rem" }}>No change requests.</p>
                          ) : (
                            studentRequests.map((r) => (
                              <div key={r.id} style={{ padding: "10px 12px", marginBottom: 8, borderRadius: 6, background: "#fafafa", border: "1px solid #BFC9CA" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "#2E4053" }}>
                                    {r.requestType === "ENROLLMENT_REQUEST" ? "Enrollment Request" : r.requestType.replace(/_/g, " ")}
                                  </div>
                                  <span style={{ fontSize: "0.73rem", padding: "2px 8px", borderRadius: 10, background: requestStatusColor(r.status), color: requestStatusTextColor(r.status), fontWeight: "600" }}>
                                    {r.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#566573", marginTop: 4 }}>
                                  {r.requestType === "ENROLLMENT_REQUEST"
                                    ? <>Course: <strong>{r.proposedValue}</strong></>
                                    : <><span style={{ color: "#717D7E" }}>From:</span> {r.currentValue} <span style={{ margin: "0 6px", color: "#717D7E" }}>→</span> {r.proposedValue}</>
                                  }
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#717D7E", marginTop: 4 }}>{formatDate(r.createdAt)}</div>
                                {r.requestType === "ENROLLMENT_REQUEST" && r.status === "pending" && (
                                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                                    <button
                                      onClick={() => resolveRequest(r.id, "approved")}
                                      style={{ fontSize: "0.78rem", padding: "4px 12px", cursor: "pointer", background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7", borderRadius: 5, fontFamily: "inherit", fontWeight: "600" }}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => resolveRequest(r.id, "denied")}
                                      style={{ fontSize: "0.78rem", padding: "4px 12px", cursor: "pointer", background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a", borderRadius: 5, fontFamily: "inherit", fontWeight: "600" }}
                                    >
                                      Deny
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Advising Notes */}
                        <div>
                          <h4 style={sectionHeadingStyle}>Advising Notes</h4>
                          {notes.length === 0 && (
                            <p style={{ color: "#566573", fontSize: "0.85rem" }}>No notes yet.</p>
                          )}
                          {notes.map((n) => (
                            <div key={n.id} style={{ padding: "8px 12px", marginBottom: 8, borderRadius: 6, background: "#fafafa", border: "1px solid #BFC9CA" }}>
                              <div style={{ fontSize: "0.85rem", color: "#2E4053" }}>{n.note}</div>
                              <div style={{ fontSize: "0.75rem", color: "#717D7E", marginTop: 4 }}>{formatDate(n.createdAt)}</div>
                            </div>
                          ))}
                          {noteError && <p style={{ color: "#c62828", fontSize: "0.82rem" }}>{noteError}</p>}
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <input
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && addNote()}
                              placeholder="Add a note..."
                              style={{ flex: 1, fontSize: "0.88rem", padding: "8px 10px", borderRadius: 6, border: "1px solid #BFC9CA", outline: "none", fontFamily: "inherit" }}
                            />
                            <button
                              onClick={addNote}
                              style={{ fontSize: "0.88rem", padding: "8px 14px", cursor: "pointer", background: "#F1C40F", color: "#2E4053", border: "none", borderRadius: 6, fontWeight: "700", fontFamily: "inherit" }}
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Per-student chat */}
                        <div style={{ marginTop: 20, borderTop: "1px solid #e8eaed", paddingTop: 16 }}>
                          <h4 style={sectionHeadingStyle}>Ask About This Student</h4>
                          <div
                            style={{
                              border: "1px solid #e8eaed",
                              borderRadius: 8,
                              background: "#f8f9fa",
                              padding: 12,
                              marginBottom: 10,
                              minHeight: 80,
                              maxHeight: 240,
                              overflowY: "auto",
                            }}
                          >
                            {studentChatMessages.length === 0 && (
                              <p style={{ color: "#717D7E", fontSize: "0.82rem", margin: 0 }}>
                                Ask about this student's progress, eligibility, or enrollments
                              </p>
                            )}
                            {studentChatMessages.map((m, i) => (
                              <div key={i} style={{ marginBottom: 12 }}>
                                <div style={{ fontWeight: "600", fontSize: "0.82rem", color: "#2E4053", marginBottom: 2 }}>You</div>
                                <div style={{ fontSize: "0.85rem", marginBottom: 6 }}>{m.user}</div>
                                <div style={{ fontWeight: "600", fontSize: "0.82rem", color: "#566573", marginBottom: 2 }}>Assistant</div>
                                <div style={{ whiteSpace: "pre-line", fontSize: "0.85rem" }}>{m.bot}</div>
                              </div>
                            ))}
                          </div>
                          {studentChatError && (
                            <p style={{ color: "#c62828", fontSize: "0.8rem", marginBottom: 6 }}>{studentChatError}</p>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              value={studentChatInput}
                              onChange={(e) => setStudentChatInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && sendStudentChatMessage()}
                              placeholder="e.g. Is this student eligible to graduate?"
                              style={{
                                flex: 1,
                                fontSize: "0.85rem",
                                padding: "7px 10px",
                                borderRadius: 6,
                                border: "1px solid #e8eaed",
                                outline: "none",
                                background: "white",
                                fontFamily: "inherit",
                              }}
                            />
                            <button
                              onClick={sendStudentChatMessage}
                              style={{
                                fontSize: "0.85rem",
                                padding: "7px 14px",
                                cursor: "pointer",
                                background: "#F1C40F",
                                color: "#2E4053",
                                border: "none",
                                borderRadius: 6,
                                fontWeight: "700",
                                fontFamily: "inherit",
                              }}
                            >
                              Ask
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel — Advisor Analytics Chat */}
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: 8,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <h3 style={{ margin: "0 0 14px 0", fontSize: "1.1rem", color: "#2E4053", fontWeight: "700" }}>
            Advisor Analytics Chat
          </h3>

          {/* Message history */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              border: "1px solid #e8eaed",
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
              background: "#f8f9fa",
            }}
          >
            {chatMessages.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 14,
                }}
              >
                <p style={{ color: "#717D7E", fontSize: "0.95rem", margin: 0, textAlign: "center" }}>
                  Query aggregate student data
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                  {[
                    "Which students are nearing graduation?",
                    "Show course enrollment counts",
                    "How many students per program?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setChatQuestion(suggestion)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 16,
                        border: "1px solid #BFC9CA",
                        background: "white",
                        color: "#2E4053",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: "bold", color: "#2E4053", marginBottom: 2, fontSize: "0.95rem" }}>
                  You
                </div>
                <div style={{ marginBottom: 8, fontSize: "0.95rem" }}>{m.user}</div>
                <div style={{ fontWeight: "bold", color: "#566573", marginBottom: 2, fontSize: "0.95rem" }}>
                  Assistant
                </div>
                <div style={{ whiteSpace: "pre-line", fontSize: "0.95rem" }}>{m.bot}</div>
              </div>
            ))}
          </div>

          {chatError && (
            <p style={{ color: "#c62828", fontSize: "0.82rem", marginBottom: 8 }}>{chatError}</p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              placeholder="Ask about student data..."
              style={{
                flex: 1,
                fontSize: "0.95rem",
                padding: "9px 12px",
                borderRadius: 6,
                border: "1px solid #e8eaed",
                outline: "none",
                background: "#f8f9fa",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={sendChatMessage}
              style={{
                fontSize: "0.95rem",
                padding: "9px 18px",
                cursor: "pointer",
                background: "#F1C40F",
                color: "#2E4053",
                border: "none",
                borderRadius: 6,
                fontWeight: "700",
                fontFamily: "inherit",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Create Student Modal */}
      {showCreateModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div style={{ background: "white", borderRadius: 10, padding: 32, width: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "1.2rem", color: "#2E4053" }}>Create New Student</h2>
            {(["firstName", "lastName", "email"] as const).map((field) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>
                  {field === "firstName" ? "First Name" : field === "lastName" ? "Last Name" : "Email"}{" "}
                  <span style={{ color: "#c62828" }}>*</span>
                </label>
                <input
                  type={field === "email" ? "email" : "text"}
                  value={createForm[field]}
                  onChange={(e) => setCreateForm((f) => ({ ...f, [field]: e.target.value }))}
                  style={modalFormStyle}
                />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Academic Status</label>
              <select value={createForm.academicStatus} onChange={(e) => setCreateForm((f) => ({ ...f, academicStatus: e.target.value }))} style={{ ...modalFormStyle, background: "white" }}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Degree Program</label>
              <select value={createForm.degreeProgramId} onChange={(e) => setCreateForm((f) => ({ ...f, degreeProgramId: e.target.value }))} style={{ ...modalFormStyle, background: "white" }}>
                <option value="">— None —</option>
                {degreePrograms.map((p) => <option key={p.id} value={p.id}>{p.programName}</option>)}
              </select>
            </div>
            {createError && <p style={{ color: "#c62828", fontSize: "0.85rem", marginBottom: 12 }}>{createError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreateModal(false)} style={{ fontSize: "0.95rem", padding: "9px 20px", cursor: "pointer", background: "transparent", color: "#566573", border: "1px solid #BFC9CA", borderRadius: 6, fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={submitCreateStudent} style={{ fontSize: "0.95rem", padding: "9px 20px", cursor: "pointer", background: "#F1C40F", color: "#2E4053", border: "none", borderRadius: 6, fontWeight: "700", fontFamily: "inherit" }}>
                Create Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
        >
          <div style={{ background: "white", borderRadius: 10, padding: 32, width: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "1.2rem", color: "#2E4053" }}>Edit Student</h2>
            {(["firstName", "lastName", "email"] as const).map((field) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>
                  {field === "firstName" ? "First Name" : field === "lastName" ? "Last Name" : "Email"}{" "}
                  <span style={{ color: "#c62828" }}>*</span>
                </label>
                <input
                  type={field === "email" ? "email" : "text"}
                  value={editForm[field]}
                  onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                  style={modalFormStyle}
                />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Academic Status</label>
              <select value={editForm.academicStatus} onChange={(e) => setEditForm((f) => ({ ...f, academicStatus: e.target.value }))} style={{ ...modalFormStyle, background: "white" }}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Degree Program</label>
              <select value={editForm.degreeProgramId} onChange={(e) => setEditForm((f) => ({ ...f, degreeProgramId: e.target.value }))} style={{ ...modalFormStyle, background: "white" }}>
                <option value="">— None —</option>
                {degreePrograms.map((p) => <option key={p.id} value={p.id}>{p.programName}</option>)}
              </select>
            </div>
            {editError && <p style={{ color: "#c62828", fontSize: "0.85rem", marginBottom: 12 }}>{editError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowEditModal(false)} style={{ fontSize: "0.95rem", padding: "9px 20px", cursor: "pointer", background: "transparent", color: "#566573", border: "1px solid #BFC9CA", borderRadius: 6, fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={submitEditStudent} style={{ fontSize: "0.95rem", padding: "9px 20px", cursor: "pointer", background: "#F1C40F", color: "#2E4053", border: "none", borderRadius: 6, fontWeight: "700", fontFamily: "inherit" }}>
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
