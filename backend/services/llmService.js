const axios = require("axios");
const ChatInteraction = require("../models/chatInteraction");
const { calculateDegreeAudit } = require("./degreeAuditService");
const Enrollment = require("../models/enrollment");

async function askLLM(studentId, question) {
  try {
     const intentResponse = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "gemma3:1b",
        prompt: `
        You are an academic advising assistant.

        If the question relates to:
        - degree progress or remaining courses → return DEGREE_AUDIT
        - enrollment status or enrolled courses → return ENROLLMENTS
        - graduation eligibility → return GRADUATION_STATUS
        - anything else → return GENERAL

        Only return ONE of these labels exactly:
        DEGREE_AUDIT
        ENROLLMENTS
        GRADUATION_STATUS
        GENERAL

        Do not explain. Do not add punctuation.

        Question: "${question}"
        `,
        stream: false,
      }
    );

    const rawIntent = intentResponse.data.response;
    const intent = rawIntent.trim().toUpperCase();

    let systemResponse;

    if (intent === "DEGREE_AUDIT") {
        
      const audit = await calculateDegreeAudit(studentId);

      systemResponse = `
        Credits Completed: ${audit.creditsCompleted}
        Credits Remaining: ${audit.creditsRemaining}
        Remaining Courses:
        ${audit.remainingCourses.map(c => c.courseName).join(", ")}
      `;

    } 
    else if (intent === "ENROLLMENTS") {

      const enrollments = await Enrollment.find({ studentId }).populate("courseId");
      systemResponse = enrollments
        .map(e => `${e.courseId.courseName} (${e.status})`)
        .join("\n");

    } else if (intent === "GRADUATION_STATUS") {

      const audit = await calculateDegreeAudit(studentId);

      systemResponse = audit.creditsRemaining === 0 ? "You are eligible to graduate!"
          : `You still need ${audit.creditsRemaining} credits to graduate.`;

    } else {

      systemResponse = `
        I can help with:
        • Degree progress
        • Enrollment status
        • Graduation eligibility

        Try asking:
        - "What courses do I still need?"
        - "Am I eligible to graduate?"
        - "What am I enrolled in?"
    `;
    }

    await ChatInteraction.create({
      studentId,
      question,
      response: systemResponse,
    });

    return systemResponse;

    } catch (error) {
        // console.error("FULL OLLAMA ERROR:");
        // console.error(error);
        // console.error("RESPONSE DATA:", error.response?.data);
        // console.error("STATUS:", error.response?.status);
        // console.error("MESSAGE:", error.message);
        console.error("Ollama Error:", error.message);
        throw new Error("LLM service unavailable or failed.");
    }
}

module.exports = { askLLM };