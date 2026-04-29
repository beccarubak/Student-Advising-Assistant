import { useState } from "react";
import { graphqlRequest } from "../services/api";

interface Message {
  user: string;
  bot: string;
}

function Chat() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");

  const sendMessage = async () => {
    try {
      const data = await graphqlRequest<{ askQuestion: string }>(
        `
        mutation Ask($question: String!) {
          askQuestion(question: $question)
        }
        `,
        { question }
      );

      setMessages([
        ...messages,
        { user: question, bot: data.askQuestion },
      ]);

      setQuestion("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "80vh",
        paddingTop: "40px",
        position: "relative",
      }}
    >
      {/* Logout Button Top Right */}
      <button
        onClick={logout}
        style={{
          position: "absolute",
          top: "20px",
          right: "30px",
          fontSize: "1rem",
          padding: "6px 14px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>

      <h2 style={{ fontSize: "2.5rem", marginBottom: "30px" }}>
        Academic Advisor Chat
      </h2>

      {/* Chat Window */}
      <div
        style={{
          width: "550px",
          maxHeight: "350px",
          overflowY: "auto",
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
          backgroundColor: "#f9f9f9",
          textAlign: "left",
        }}
      >
        {messages.map((m, index) => (
          <div key={index} style={{ marginBottom: "20px" }}>
            <div style={{ fontWeight: "bold" }}>You:</div>
            <div style={{ marginBottom: "8px" }}>{m.user}</div>

            <div style={{ fontWeight: "bold" }}>Advisor:</div>
            <div>{m.bot}</div>
          </div>
        ))}
      </div>

      {/* Input Row */}
      <div
        style={{
          display: "flex",
          gap: "10px",
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          style={{
            fontSize: "1.2rem",
            padding: "10px",
            width: "350px",
          }}
        />

        <button
          onClick={sendMessage}
          style={{
            fontSize: "1.2rem",
            padding: "10px 20px",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>

      {error && (
        <p style={{ color: "red", marginTop: "15px", fontSize: "1.1rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default Chat;