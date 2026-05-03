import { useState } from "react";
import { graphqlRequest } from "../services/api";

function Login({ onLogin }: { onLogin: (role: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const data = await graphqlRequest<{ login: { token: string; role: string } }>(
        `
        mutation Login($email: String!) {
          login(email: $email) {
            token
            role
          }
        }
        `,
        { email }
      );

      localStorage.setItem("token", data.login.token);
      localStorage.setItem("role", data.login.role);
      onLogin(data.login.role);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#D5D8DC",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Navbar */}
      <div style={{
        background: "#2E4053",
        padding: "20px 32px",
        color: "white",
        fontSize: "2rem",
        fontWeight: "bold",
        textAlign: "center",
      }}>
        Academic Advising Portal
      </div>

      {/* Login Card */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: "white",
          borderRadius: 8,
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          padding: "48px 40px",
          width: 360,
          textAlign: "center",
        }}>
          <h2 style={{
            margin: "0 0 8px 0",
            fontSize: "1.6rem",
            color: "#2E4053",
            fontWeight: "700",
          }}>
            Welcome
          </h2>
          <p style={{ margin: "0 0 32px 0", color: "#AAB7B8", fontSize: "0.95rem" }}>
            Sign in to your account
          </p>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              fontSize: "1rem",
              padding: "10px 14px",
              borderRadius: 6,
              border: "1px solid #BFC9CA",
              marginBottom: 16,
              boxSizing: "border-box",
              outline: "none",
            }}
          />

          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              fontSize: "1rem",
              padding: "11px",
              cursor: "pointer",
              background: "#F1C40F",
              color: "#2E4053",
              border: "none",
              borderRadius: 6,
              fontWeight: "700",
            }}
          >
            Login
          </button>

          {error && (
            <p style={{ color: "#c62828", marginTop: 16, fontSize: "0.9rem" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
