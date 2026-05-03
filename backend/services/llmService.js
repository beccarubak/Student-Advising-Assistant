const axios = require("axios");
const ChatInteraction = require("../models/chatInteraction");
const { calculateDegreeAudit } = require("./degreeAuditService");
const Enrollment = require("../models/enrollment");
const Course = require("../models/courses");

async function askLLM(studentId, question) {
  try {
     const intentResponse = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: process.env.OLLAMA_MODEL,
        prompt: `
        You are an academic advising assistant.

        If the question relates to:
        - degree progress or remaining courses → return DEGREE_AUDIT
        - enrollment status or enrolled courses → return ENROLLMENTS
        - graduation eligibility → return GRADUATION_STATUS
        - whether a student can enroll in a specific course, course eligibility, or prerequisites → return COURSE_ELIGIBILITY
        - anything else → return GENERAL

        Only return ONE of these labels exactly:
        DEGREE_AUDIT
        ENROLLMENTS
        GRADUATION_STATUS
        COURSE_ELIGIBILITY
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

    } else if (intent === "COURSE_ELIGIBILITY") {

      const completedEnrollments = await Enrollment.find({
        studentId,
        status: "Completed",
      }).select("courseId");
      const completedIds = new Set(completedEnrollments.map((e) => e.courseId.toString()));

      const allCourses = await Course.find().populate("prerequisites");
      const eligible = [];
      const blocked = [];

      for (const course of allCourses) {
        if (completedIds.has(course._id.toString())) continue;
        const unmet = course.prerequisites.filter((p) => !completedIds.has(p._id.toString()));
        if (unmet.length === 0) {
          eligible.push(course.courseName);
        } else {
          blocked.push(`${course.courseName} (needs: ${unmet.map((p) => p.courseName).join(", ")})`);
        }
      }

      systemResponse = `Courses you are eligible to enroll in:\n${eligible.join("\n") || "None"}\n\nCourses with unmet prerequisites:\n${blocked.join("\n") || "None"}`;

    } else {

      systemResponse = `
        I can help with:
        • Degree progress
        • Enrollment status
        • Graduation eligibility
        • Course eligibility and prerequisites

        Try asking:
        - "What courses do I still need?"
        - "Am I eligible to graduate?"
        - "What am I enrolled in?"
        - "Which courses can I enroll in?"
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