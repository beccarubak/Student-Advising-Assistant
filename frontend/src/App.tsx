import { useState } from "react";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import AdvisorDashboard from "./pages/AdvisorDashboard";

function App() {
  const [role, setRole] = useState(localStorage.getItem("role"));

  const handleLogin = (r: string) => setRole(r);

  if (role === "student") return <StudentDashboard />;

  if (role === "advisor") return <AdvisorDashboard />;

  return (
    <div style={{ padding: 40, alignItems: "center", textAlign: "center" }}>
      <h1 style={{ fontSize: "3rem", textAlign: "center" }}>Student Advising System</h1>
      <Login onLogin={handleLogin} />
    </div>
  );
}

export default App;
