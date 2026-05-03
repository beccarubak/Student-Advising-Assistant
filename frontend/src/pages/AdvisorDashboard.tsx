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

function AdvisorDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [audit, setAudit] = useState<DegreeAudit | null>(null);
  const [notes, setNotes] = useState<AdvisingNote[]>([]);
  const [studentRequests, setStudentRequests] = useState<ChangeRequest[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteError, setNoteError] = useState("");

  const advisorId = getAdvisorIdFromToken();

  useEffect(() => {
    graphqlRequest<{ getStudents: Student[] }>(
      `query {
        getStudents {
          id firstName lastName email academicStatus
          degreeProgram { programName }
        }
      }`
    )
      .then((d) => setStudents(d.getStudents))
      .catch(console.error);

    graphqlRequest<{ getPendingChangeRequests: ChangeRequest[] }>(
      `query {
        getPendingChangeRequests {
          id requestType currentValue proposedValue status createdAt
          student { id firstName lastName }
        }
      }`
    )
      .then((d) => setPendingRequests(d.getPendingChangeRequests))
      .catch(console.error);
  }, []);

  const loadStudent = async (student: Student) => {
    setSelectedStudent(student);
    setAudit(null);
    setNotes([]);
    setStudentRequests([]);
    setNewNote("");
    setNoteError("");

    const [auditData, notesData, requestsData] = await Promise.all([
      graphqlRequest<{ getDegreeAudit: DegreeAudit }>(
        `query GetAudit($studentId: ID!) {
          getDegreeAudit(studentId: $studentId) {
            totalCreditsRequired creditsCompleted creditsRemaining
            remainingCourses { id courseName courseCode credits }
          }
        }`,
        { studentId: student.id }
      ).catch(() => null),

      graphqlRequest<{ getAdvisingNotes: AdvisingNote[] }>(
        `query GetNotes($studentId: ID!) {
          getAdvisingNotes(studentId: $studentId) {
            id note createdAt
          }
        }`,
        { studentId: student.id }
      ).catch(() => null),

      graphqlRequest<{ getAdvisorRequestSummary: ChangeRequest[] }>(
        `query {
          getAdvisorRequestSummary {
            id requestType currentValue proposedValue status advisorNotes createdAt
            student { id firstName lastName }
          }
        }`
      ).catch(() => null),
    ]);

    if (auditData) setAudit(auditData.getDegreeAudit);
    if (notesData) setNotes(notesData.getAdvisingNotes);
    if (requestsData) {
      setStudentRequests(
        requestsData.getAdvisorRequestSummary.filter(
          (r) => r.student.id === student.id
        )
      );
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
        { studentId: selectedStudent.id, advisorId, note: newNote }
      );
      setNotes((prev) => [...prev, data.createAdvisingNote]);
      setNewNote("");
    } catch (err: any) {
      setNoteError(err.message);
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

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString() : "";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#D5D8DC" }}>

      {/* Navbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 32px", background: "#2E4053", color: "white",
      }}>
        <span style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Academic Advising Portal</span>
        <button
          onClick={logout}
          style={{
            background: "transparent", border: "1px solid white", color: "white",
            padding: "6px 14px", cursor: "pointer", borderRadius: 4, fontSize: "0.9rem",
          }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flex: 1, padding: 24, gap: 20, height: "calc(100vh - 57px)", boxSizing: "border-box" }}>

        {/* Left Panel */}
        <div style={{ flex: "0 0 28%", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Pending Requests */}
          <div style={{
            flex: 1, background: "white", borderRadius: 8,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 20,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "1rem", color: "#2E4053" }}>
              Pending Requests{pendingRequests.length > 0 && (
                <span style={{
                  background: "#F1C40F", color: "#2E4053", borderRadius: 12,
                  fontSize: "0.75rem", padding: "2px 8px", marginLeft: 8, fontWeight: "700",
                }}>{pendingRequests.length}</span>
              )}
            </h3>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {pendingRequests.length === 0 && (
                <p style={{ color: "#AAB7B8", fontSize: "0.9rem", margin: 0 }}>No pending requests.</p>
              )}
              {pendingRequests.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    const s = students.find((s) => s.id === r.student.id);
                    if (s) loadStudent(s);
                  }}
                  style={{
                    padding: "10px 12px", marginBottom: 10, borderRadius: 6,
                    background: "#fafafa", border: "1px solid #BFC9CA", cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#2E4053" }}>
                    {r.student.firstName} {r.student.lastName}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#AAB7B8", marginTop: 3 }}>
                    {r.requestType.replace("_", " ")}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#BFC9CA", marginTop: 2 }}>
                    {formatDate(r.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student List */}
          <div style={{
            flex: 1, background: "white", borderRadius: 8,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 20,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "1rem", color: "#2E4053" }}>Students</h3>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {students.length === 0 && (
                <p style={{ color: "#AAB7B8", fontSize: "0.9rem", margin: 0 }}>No students found.</p>
              )}
              {students.map((s) => (
                <div
                  key={s.id}
                  onClick={() => loadStudent(s)}
                  style={{
                    padding: "10px 12px", marginBottom: 10, borderRadius: 6, cursor: "pointer",
                    background: selectedStudent?.id === s.id ? "#D5D8DC" : "#fafafa",
                    border: selectedStudent?.id === s.id ? "1px solid #AAB7B8" : "1px solid #BFC9CA",
                  }}
                >
                  <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#2E4053" }}>
                    {s.firstName} {s.lastName}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#AAB7B8", marginTop: 3 }}>
                    {s.degreeProgram?.programName ?? "No program"}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      fontSize: "0.75rem", padding: "2px 8px", borderRadius: 12,
                      background: academicStatusColor(s.academicStatus), color: "white",
                    }}>
                      {s.academicStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{
          flex: 1, background: "white", borderRadius: 8,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 28,
          overflowY: "auto",
        }}>
          {!selectedStudent ? (
            <div style={{ color: "#BFC9CA", fontSize: "1rem", marginTop: 40, textAlign: "center" }}>
              Select a student to view their details
            </div>
          ) : (
            <>
              {/* Student Header */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ margin: "0 0 6px 0", fontSize: "1.4rem", color: "#2E4053" }}>
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                <div style={{ fontSize: "0.9rem", color: "#AAB7B8", marginBottom: 6 }}>
                  {selectedStudent.email}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{
                    fontSize: "0.8rem", padding: "2px 10px", borderRadius: 12,
                    background: academicStatusColor(selectedStudent.academicStatus), color: "white",
                  }}>
                    {selectedStudent.academicStatus}
                  </span>
                  {selectedStudent.degreeProgram && (
                    <span style={{ fontSize: "0.9rem", color: "#AAB7B8" }}>
                      {selectedStudent.degreeProgram.programName}
                    </span>
                  )}
                </div>
              </div>

              {/* Degree Progress */}
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#2E4053" }}>Degree Progress</h3>
                {!audit ? (
                  <p style={{ color: "#AAB7B8", fontSize: "0.9rem" }}>Loading...</p>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                      <div style={{ flex: 1, background: "#BFC9CA", borderRadius: 8, height: 20, overflow: "hidden" }}>
                        <div style={{
                          background: "#F1C40F", height: "100%", borderRadius: 8,
                          width: `${progressPct}%`, transition: "width 0.6s ease",
                        }} />
                      </div>
                      <span style={{ fontSize: "0.9rem", whiteSpace: "nowrap", color: "#AAB7B8" }}>
                        {audit.creditsCompleted} / {audit.totalCreditsRequired} credits
                      </span>
                    </div>
                    {audit.remainingCourses.length > 0 && (
                      <>
                        <div style={{ fontSize: "0.85rem", color: "#AAB7B8", marginBottom: 8 }}>
                          Remaining required courses:
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {audit.remainingCourses.map((c) => (
                            <span key={c.id} style={{
                              fontSize: "0.8rem", padding: "3px 10px", borderRadius: 12,
                              background: "#D5D8DC", color: "#2E4053", border: "1px solid #BFC9CA",
                            }}>
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

              {/* Change Requests */}
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#2E4053" }}>Change Requests</h3>
                {studentRequests.length === 0 ? (
                  <p style={{ color: "#AAB7B8", fontSize: "0.9rem" }}>No change requests.</p>
                ) : (
                  studentRequests.map((r) => (
                    <div key={r.id} style={{
                      padding: "12px 14px", marginBottom: 10, borderRadius: 6,
                      background: "#fafafa", border: "1px solid #BFC9CA",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#2E4053" }}>
                          {r.requestType.replace("_", " ")}
                        </div>
                        <span style={{
                          fontSize: "0.78rem", padding: "2px 9px", borderRadius: 12,
                          background: requestStatusColor(r.status),
                          color: requestStatusTextColor(r.status),
                          fontWeight: "600",
                        }}>
                          {r.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#AAB7B8", marginTop: 6 }}>
                        <span style={{ color: "#BFC9CA" }}>From:</span> {r.currentValue}
                        <span style={{ margin: "0 8px", color: "#BFC9CA" }}>→</span>
                        {r.proposedValue}
                      </div>
                      {r.advisorNotes && (
                        <div style={{ fontSize: "0.82rem", color: "#AAB7B8", marginTop: 6, fontStyle: "italic" }}>
                          Note: {r.advisorNotes}
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: "#BFC9CA", marginTop: 6 }}>
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
                  <p style={{ color: "#AAB7B8", fontSize: "0.9rem" }}>No notes yet.</p>
                )}
                {notes.map((n) => (
                  <div key={n.id} style={{
                    padding: "10px 14px", marginBottom: 10, borderRadius: 6,
                    background: "#fafafa", border: "1px solid #BFC9CA",
                  }}>
                    <div style={{ fontSize: "0.9rem", color: "#2E4053" }}>{n.note}</div>
                    <div style={{ fontSize: "0.78rem", color: "#BFC9CA", marginTop: 6 }}>
                      {formatDate(n.createdAt)}
                    </div>
                  </div>
                ))}
                {noteError && (
                  <p style={{ color: "#c62828", fontSize: "0.85rem" }}>{noteError}</p>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNote()}
                    placeholder="Add a note..."
                    style={{
                      flex: 1, fontSize: "0.95rem", padding: "9px 12px",
                      borderRadius: 6, border: "1px solid #BFC9CA", outline: "none",
                    }}
                  />
                  <button
                    onClick={addNote}
                    style={{
                      fontSize: "0.95rem", padding: "9px 18px", cursor: "pointer",
                      background: "#F1C40F", color: "#2E4053", border: "none",
                      borderRadius: 6, fontWeight: "700",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdvisorDashboard;
