import { useState } from "react";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import AdvisorDashboard from "./pages/AdvisorDashboard";

function App() {
  const [role, setRole] = useState(localStorage.getItem("role"));

  const handleLogin = (r: string) => setRole(r);

  if (role === "student") return <StudentDashboard />;

  if (role === "advisor") return <AdvisorDashboard />;

  return <Login onLogin={handleLogin} />;
}

export default App;
