import { useState, useEffect } from "react";
import { graphqlRequest } from "../services/api";

interface Course {
  id: string;
  courseName: string;
  courseCode: string;
  credits: number;
}

interface Enrollment {
  id: string;
  course: Course;
  term: string;
  status: string;
  grade?: string;
}

interface DegreeAudit {
  totalCreditsRequired: number;
  creditsCompleted: number;
  creditsRemaining: number;
  remainingCourses: Course[];
}

interface Student {
  firstName: string;
  lastName: string;
  degreeProgram: { programName: string } | null;
}

function getStudentIdFromToken(): string {
  const token = localStorage.getItem("token")!;
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.userId;
}

function statusColor(status: string): string {
  if (status === "Enrolled") return "#2E4053";
  if (status === "Completed") return "#388e3c";
  return "#c62828";
}

function StudentDashboard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [audit, setAudit] = useState<DegreeAudit | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ user: string; bot: string }[]>([]);
  const [chatError, setChatError] = useState("");

  const userId = getStudentIdFromToken();

  useEffect(() => {
    graphqlRequest<{ getStudent: Student }>(
      `query GetStudent($id: ID!) {
        getStudent(id: $id) {
          firstName lastName
          degreeProgram { programName }
        }
      }`,
      { id: userId }
    )
      .then((d) => setStudent(d.getStudent))
      .catch(console.error);

    graphqlRequest<{ getDegreeAudit: DegreeAudit }>(
      `query GetDegreeAudit($studentId: ID!) {
        getDegreeAudit(studentId: $studentId) {
          totalCreditsRequired creditsCompleted creditsRemaining
          remainingCourses { id courseName courseCode credits }
        }
      }`,
      { studentId: userId }
    )
      .then((d) => setAudit(d.getDegreeAudit))
      .catch(console.error);

    graphqlRequest<{ getStudentEnrollments: Enrollment[] }>(
      `query GetEnrollments($studentId: ID!) {
        getStudentEnrollments(studentId: $studentId) {
          id term status grade
          course { id courseName courseCode credits }
        }
      }`,
      { studentId: userId }
    )
      .then((d) => setEnrollments(d.getStudentEnrollments))
      .catch(console.error);
  }, [userId]);

  const sendMessage = async () => {
    if (!question.trim()) return;
    setChatError("");
    try {
      const data = await graphqlRequest<{ askQuestion: string }>(
        `mutation Ask($question: String!) { askQuestion(question: $question) }`,
        { question }
      );
      setMessages((prev) => [...prev, { user: question, bot: data.askQuestion }]);
      setQuestion("");
    } catch (err: any) {
      setChatError(err.message);
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

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#D5D8DC" }}>

      {/* Navbar */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "14px 32px", background: "#2E4053", color: "white",
        position: "relative",
      }}>
        <div style={{ flex: 1 }} />
        <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: "1.3rem", fontWeight: "bold" }}>
          Academic Advising Portal
        </span>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 20 }}>
          {student && (
            <span style={{ fontSize: "1.2rem", fontWeight: "500" }}>
              {student.firstName} {student.lastName}
            </span>
          )}
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
      </div>

      {/* Progress Bar */}
      <div style={{ padding: "20px 32px", background: "white", borderBottom: "1px solid #BFC9CA" }}>
        <div style={{ fontWeight: "600", fontSize: "1rem", marginBottom: 8, color: "#2E4053" }}>
          {student?.degreeProgram?.programName ?? "Loading degree program..."}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1, background: "#BFC9CA", borderRadius: 8, height: 22, overflow: "hidden" }}>
            <div style={{
              background: "#43a047", height: "100%", borderRadius: 8,
              width: `${progressPct}%`, transition: "width 0.6s ease",
            }} />
          </div>
          <span style={{ fontSize: "0.95rem", whiteSpace: "nowrap", color: "#566573", minWidth: 130 }}>
            {audit
              ? `${audit.creditsCompleted} / ${audit.totalCreditsRequired} credits completed`
              : "Loading..."}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flex: 1, padding: 24, gap: 20 }}>

        {/* Left: Courses */}
        <div style={{
          flex: "0 0 28%", background: "white", borderRadius: 8,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 20,
          overflowY: "auto", maxHeight: "calc(100vh - 160px)",
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: "1rem", color: "#2E4053" }}>
            My Courses
          </h3>
          {enrollments.length === 0 && (
            <p style={{ color: "#566573", fontSize: "0.9rem" }}>No enrollments found.</p>
          )}
          {enrollments.map((e) => (
            <div key={e.id} style={{
              padding: "10px 12px", marginBottom: 10, borderRadius: 6,
              background: "#fafafa", border: "1px solid #BFC9CA",
            }}>
              <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{e.course.courseName}</div>
              <div style={{ fontSize: "0.82rem", color: "#566573", marginTop: 3 }}>
                {e.course.courseCode} &middot; {e.term}
              </div>
              <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: "0.78rem", padding: "2px 9px", borderRadius: 12,
                  background: statusColor(e.status), color: "white",
                }}>
                  {e.status}
                </span>
                {e.grade && (
                  <span style={{ fontSize: "0.82rem", color: "#566573" }}>Grade: {e.grade}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Chat */}
        <div style={{
          flex: 1, background: "white", borderRadius: 8,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 20,
          display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 160px)",
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: "1rem", color: "#2E4053" }}>
            Academic Advisor Chat
          </h3>

          <div style={{
            flex: 1, overflowY: "auto", border: "1px solid #BFC9CA",
            borderRadius: 6, padding: 16, marginBottom: 16, background: "#fafafa",
          }}>
            {messages.length === 0 && (
              <p style={{ color: "#717D7E", fontSize: "1rem", margin: 0 }}>
                Ask about your degree progress, course eligibility, or graduation status.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: "bold", color: "#2E4053", marginBottom: 3, fontSize: "1.05rem" }}>You</div>
                <div style={{ marginBottom: 10, fontSize: "1.05rem" }}>{m.user}</div>
                <div style={{ fontWeight: "bold", color: "#566573", marginBottom: 3, fontSize: "1.05rem" }}>Advisor</div>
                <div style={{ whiteSpace: "pre-line", fontSize: "1.05rem" }}>{m.bot}</div>
              </div>
            ))}
          </div>

          {chatError && (
            <p style={{ color: "#c62828", fontSize: "0.85rem", marginBottom: 8 }}>{chatError}</p>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask a question..."
              style={{
                flex: 1, fontSize: "1rem", padding: "10px 14px",
                borderRadius: 6, border: "1px solid #BFC9CA", outline: "none",
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                fontSize: "1rem", padding: "10px 22px", cursor: "pointer",
                background: "#F1C40F", color: "#2E4053", border: "none",
                borderRadius: 6, fontWeight: "700",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
