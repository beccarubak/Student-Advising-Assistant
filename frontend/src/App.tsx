import { useState } from "react";
import Login from "./pages/Login";
import Chat from "./pages/Chat";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  return (
    <div style={{ padding: 40, alignItems: "center", textAlign: "center" }}>
      <h1 style={{fontSize: "3rem", textAlign: "center", }}>Student Advising System</h1>

      {isAuthenticated ? (
        <Chat />
      ) : (
        <Login onLogin={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}

export default App;