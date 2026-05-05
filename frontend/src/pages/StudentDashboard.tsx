import React, { useState, useEffect } from "react";
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

interface MyChangeRequest {
  id: string;
  requestType: string;
  currentValue: string;
  proposedValue: string;
  status: string;
  advisorNotes: string | null;
  createdAt: string;
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

function statusStyle(status: string): React.CSSProperties {
  if (status === "Completed")
    return { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" };
  if (status === "Enrolled")
    return { background: "#e3f2fd", color: "#1565c0", border: "1px solid #90caf9" };
  return { background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" };
}

function StudentDashboard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [audit, setAudit] = useState<DegreeAudit | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [myRequests, setMyRequests] = useState<MyChangeRequest[]>([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ user: string; bot: string }[]>([]);
  const [chatError, setChatError] = useState("");

  const userId = getStudentIdFromToken();

  const fetchMyRequests = () => {
    graphqlRequest<{ getMyChangeRequests: MyChangeRequest[] }>(
      `query {
        getMyChangeRequests {
          id requestType currentValue proposedValue status advisorNotes createdAt
        }
      }`,
    )
      .then((d) => setMyRequests(d.getMyChangeRequests))
      .catch(console.error);
  };

  useEffect(() => {
    fetchMyRequests();
    graphqlRequest<{ getStudent: Student }>(
      `query GetStudent($id: ID!) {
        getStudent(id: $id) {
          firstName lastName
          degreeProgram { programName }
        }
      }`,
      { id: userId },
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
      { studentId: userId },
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
      { studentId: userId },
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
        { question },
      );
      setMessages((prev) => [
        ...prev,
        { user: question, bot: data.askQuestion },
      ]);
      setQuestion("");
      // Refresh requests in case an enrollment request was just created
      fetchMyRequests();
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#D5D8DC",
      }}
    >
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
            fontSize: "1.8rem",
            fontWeight: "bold",
          }}
        >
          Academic Advising Portal
        </span>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 20,
          }}
        >
          {student && (
            <span style={{ fontSize: "1.5rem", fontWeight: "500" }}>
              {student.firstName} {student.lastName}
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

      {/* Progress Bar */}
      <div
        style={{
          padding: "20px 32px",
          background: "white",
          borderBottom: "1px solid #BFC9CA",
        }}
      >
        <div
          style={{
            fontWeight: "600",
            fontSize: "1.2rem",
            marginBottom: 8,
            color: "#2E4053",
          }}
        >
          Program:{" "}
          {student?.degreeProgram?.programName ?? "Loading degree program..."}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              flex: 1,
              background: "#BFC9CA",
              borderRadius: 8,
              height: 22,
              overflow: "hidden",
            }}
          >
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
          <span
            style={{
              fontSize: "1rem",
              whiteSpace: "nowrap",
              color: "#566573",
              minWidth: 130,
            }}
          >
            {audit
              ? `${audit.creditsCompleted} / ${audit.totalCreditsRequired} credits completed`
              : "Loading..."}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flex: 1, padding: 24, gap: 20 }}>
        {/* Left: Courses */}
        <div
          style={{
            flex: "0 0 35%",
            background: "white",
            borderRadius: 10,
            boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
            padding: "24px 20px",
            overflowY: "auto",
            maxHeight: "calc(100vh - 160px)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 20,
              fontSize: "1.4rem",
              fontWeight: "700",
              color: "#1a1a1a",
            }}
          >
            My Courses
          </h3>
          {enrollments.length === 0 && (
            <p style={{ color: "#888", fontSize: "1rem" }}>
              No enrollments found.
            </p>
          )}
          {enrollments.map((e) => (
            <div
              key={e.id}
              style={{
                padding: "14px 16px",
                marginBottom: 12,
                borderRadius: 8,
                background: "white",
                border: "1px solid #e8eaed",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "1rem", color: "#1a1a1a" }}>
                {e.course.courseName}
              </div>
              <div
                style={{ fontSize: "0.85rem", color: "#888", marginTop: 4 }}
              >
                {e.course.courseCode} &middot; {e.term}
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    padding: "3px 10px",
                    borderRadius: 12,
                    fontWeight: "500",
                    ...statusStyle(e.status),
                  }}
                >
                  {e.status}
                </span>
                {e.grade && (
                  <span style={{ fontSize: "0.85rem", color: "#555" }}>
                    Grade: {e.grade}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* My Requests */}
          <div style={{ borderTop: "1px solid #e8eaed", marginTop: 8, paddingTop: 20 }}>
            <h3
              style={{
                marginTop: 0,
                marginBottom: 16,
                fontSize: "1.2rem",
                fontWeight: "700",
                color: "#1a1a1a",
              }}
            >
              My Requests
            </h3>
            {myRequests.length === 0 && (
              <p style={{ color: "#888", fontSize: "0.9rem" }}>No requests yet.</p>
            )}
            {[...myRequests].reverse().map((r) => {
              const isPending = r.status === "pending";
              const isApproved = r.status === "approved";
              const badgeStyle: React.CSSProperties = isApproved
                ? { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" }
                : isPending
                ? { background: "#fff8e1", color: "#e65100", border: "1px solid #ffe082" }
                : { background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" };
              return (
                <div
                  key={r.id}
                  style={{
                    padding: "12px 14px",
                    marginBottom: 10,
                    borderRadius: 8,
                    background: "white",
                    border: "1px solid #e8eaed",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#1a1a1a" }}>
                      {r.requestType === "ENROLLMENT_REQUEST"
                        ? "Enrollment Request"
                        : r.requestType.replace(/_/g, " ")}
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 9px",
                        borderRadius: 10,
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                        ...badgeStyle,
                      }}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#666", marginTop: 4 }}>
                    {r.requestType === "ENROLLMENT_REQUEST"
                      ? <>Course: <strong>{r.proposedValue}</strong></>
                      : <>{r.currentValue} → {r.proposedValue}</>}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#999", marginTop: 4 }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                  </div>
                  {r.advisorNotes && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "#f0f4f8",
                        border: "1px solid #d0d7de",
                        fontSize: "0.82rem",
                        color: "#2E4053",
                        fontStyle: "italic",
                      }}
                    >
                      Advisor comment: {r.advisorNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Chat */}
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: 10,
            boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            maxHeight: "calc(100vh - 160px)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: "1.4rem",
              fontWeight: "700",
              color: "#1a1a1a",
            }}
          >
            Academic Advisor Chat
          </h3>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              border: "1px solid #e8eaed",
              borderRadius: 8,
              padding: 20,
              marginBottom: 16,
              background: "#f8f9fa",
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <p style={{ color: "#717D7E", fontSize: "1rem", margin: 0, textAlign: "center" }}>
                  Ask me anything about your academic progress
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontWeight: "bold",
                    color: "#2E4053",
                    marginBottom: 3,
                    fontSize: "1.05rem",
                  }}
                >
                  You
                </div>
                <div style={{ marginBottom: 10, fontSize: "1.05rem" }}>
                  {m.user}
                </div>
                <div
                  style={{
                    fontWeight: "bold",
                    color: "#566573",
                    marginBottom: 3,
                    fontSize: "1.05rem",
                  }}
                >
                  Advisor
                </div>
                <div style={{ whiteSpace: "pre-line", fontSize: "1.05rem" }}>
                  {m.bot}
                </div>
              </div>
            ))}
          </div>

          {chatError && (
            <p
              style={{ color: "#c62828", fontSize: "0.85rem", marginBottom: 8 }}
            >
              {chatError}
            </p>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                fontSize: "1rem",
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #e8eaed",
                outline: "none",
                background: "#f8f9fa",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                fontSize: "1rem",
                padding: "10px 24px",
                cursor: "pointer",
                background: "#F1C40F",
                color: "#2E4053",
                border: "none",
                borderRadius: 8,
                fontWeight: "700",
                fontFamily: "inherit",
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
