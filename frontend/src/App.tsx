import { useState } from "react";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";

function App() {
  const [role, setRole] = useState(localStorage.getItem("role"));

  const handleLogin = (r: string) => setRole(r);

  if (role === "student") return <StudentDashboard />;

  if (role === "advisor") return <div style={{ padding: 40, textAlign: "center" }}><h2>Advisor dashboard coming soon</h2></div>;

  return (
    <div style={{ padding: 40, alignItems: "center", textAlign: "center" }}>
      <h1 style={{ fontSize: "3rem", textAlign: "center" }}>Student Advising System</h1>
      <Login onLogin={handleLogin} />
    </div>
  );
}

export default App;
