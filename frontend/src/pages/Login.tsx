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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "70vh",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "2.5rem", marginBottom: "50px" }}>
        Login
      </h2>

      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          fontSize: "1.2rem",
          padding: "10px",
          width: "300px",
          marginBottom: "15px",
        }}
      />

      <button
        onClick={handleLogin}
        style={{
          fontSize: "1.2rem",
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        Login
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "15px", fontSize: "1.1rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default Login;