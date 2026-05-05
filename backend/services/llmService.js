const axios = require("axios");
const ChatInteraction = require("../models/chatInteraction");
const { calculateDegreeAudit } = require("./degreeAuditService");
const { enrollStudentWithValidation } = require("./enrollmentService");
const Enrollment = require("../models/enrollment");
const Course = require("../models/courses");
const Student = require("../models/student");
const DegreeProgram = require("../models/degreePrograms");

function currentTerm() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 1 && month <= 5) return `Spring ${year}`;
  if (month >= 6 && month <= 7) return `Summer ${year}`;
  return `Fall ${year}`;
}

async function extractCourseName(question, availableCourseNames) {
  const courseList = availableCourseNames.join(", ");
  const res = await axios.post("http://localhost:11434/api/generate", {
    model: process.env.OLLAMA_MODEL,
    prompt: `From the enrollment request below, identify which course the student wants to enroll in.\n\nAvailable courses: ${courseList}\n\nReturn ONLY the exact course name from the available courses list that best matches the request. If no course matches, return UNKNOWN. Do not explain.\n\nRequest: "${question}"`,
    stream: false,
  });
  return res.data.response.trim();
}

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
        - a request to actually enroll in or sign up for a course (e.g. "enroll me in X", "I want to enroll in X", "sign me up for X", "register me for X") → return ENROLL_COURSE
        - anything else → return GENERAL

        Only return ONE of these labels exactly:
        DEGREE_AUDIT
        ENROLLMENTS
        GRADUATION_STATUS
        COURSE_ELIGIBILITY
        ENROLL_COURSE
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

      try {
        const audit = await calculateDegreeAudit(studentId);
        const remaining = audit.remainingCourses.length > 0
          ? audit.remainingCourses.map((c) => `• ${c.courseName}`).join("\n")
          : "None — all required courses completed!";
        systemResponse = `Degree Progress:\n\nCredits Completed: ${audit.creditsCompleted} / ${audit.totalCreditsRequired}\nCredits Remaining: ${audit.creditsRemaining}\n\nRemaining Required Courses:\n${remaining}`;
      } catch (err) {
        systemResponse = `Could not load degree progress: ${err.message}`;
      }

    } else if (intent === "ENROLLMENTS") {

      const enrollments = await Enrollment.find({ studentId }).populate("courseId");

      if (enrollments.length === 0) {
        systemResponse = "You have no enrollments on record.";
      } else {
        const active = enrollments.filter((e) => e.status === "Enrolled");
        const completed = enrollments.filter((e) => e.status === "Completed");
        const dropped = enrollments.filter((e) => e.status === "Dropped");
        const lines = [];
        if (active.length > 0) {
          lines.push("Currently Enrolled:");
          active.forEach((e) => lines.push(`• ${e.courseId.courseName} (${e.courseId.courseCode})`));
        }
        if (completed.length > 0) {
          if (lines.length > 0) lines.push("");
          lines.push("Completed:");
          completed.forEach((e) => lines.push(`• ${e.courseId.courseName}${e.grade ? ` — Grade: ${e.grade}` : ""}`));
        }
        if (dropped.length > 0) {
          if (lines.length > 0) lines.push("");
          lines.push("Dropped:");
          dropped.forEach((e) => lines.push(`• ${e.courseId.courseName}`));
        }
        systemResponse = lines.join("\n");
      }

    } else if (intent === "GRADUATION_STATUS") {

      try {
        const audit = await calculateDegreeAudit(studentId);
        if (audit.creditsRemaining === 0) {
          systemResponse = "You are eligible to graduate! All required courses are completed.";
        } else {
          const courseWord = audit.remainingCourses.length === 1 ? "course" : "courses";
          systemResponse = `You are not yet eligible to graduate.\n\nYou still need ${audit.creditsRemaining} more credits (${audit.remainingCourses.length} ${courseWord} remaining).`;
        }
      } catch (err) {
        systemResponse = `Could not check graduation status: ${err.message}`;
      }

    } else if (intent === "COURSE_ELIGIBILITY") {

      const [completedEnrollments, activeEnrollments] = await Promise.all([
        Enrollment.find({ studentId, status: "Completed" }).select("courseId"),
        Enrollment.find({ studentId, status: "Enrolled" }).select("courseId"),
      ]);
      const completedIds = new Set(completedEnrollments.map((e) => e.courseId.toString()));
      const enrolledIds = new Set(activeEnrollments.map((e) => e.courseId.toString()));

      const allCourses = await Course.find().populate("prerequisites");
      const eligible = [];
      const alreadyEnrolled = [];
      const blocked = [];

      for (const course of allCourses) {
        if (completedIds.has(course._id.toString())) continue;
        if (enrolledIds.has(course._id.toString())) {
          alreadyEnrolled.push(course.courseName);
          continue;
        }
        const unmet = course.prerequisites.filter((p) => !completedIds.has(p._id.toString()));
        if (unmet.length === 0) {
          eligible.push(course.courseName);
        } else {
          blocked.push(`${course.courseName} (needs: ${unmet.map((p) => p.courseName).join(", ")})`);
        }
      }

      const lines = [];
      if (eligible.length > 0) {
        lines.push("Eligible to enroll in:");
        eligible.forEach((n) => lines.push(`• ${n}`));
      }
      if (alreadyEnrolled.length > 0) {
        if (lines.length > 0) lines.push("");
        lines.push("Already enrolled in:");
        alreadyEnrolled.forEach((n) => lines.push(`• ${n}`));
      }
      if (blocked.length > 0) {
        if (lines.length > 0) lines.push("");
        lines.push("Prerequisites not yet met:");
        blocked.forEach((n) => lines.push(`• ${n}`));
      }
      systemResponse = lines.length > 0 ? lines.join("\n") : "No available courses found.";

    } else if (intent === "ENROLL_COURSE") {

      const allCourses = await Course.find().select("courseName courseCode");
      const courseName = await extractCourseName(question, allCourses.map((c) => c.courseName));

      if (courseName === "UNKNOWN") {
        systemResponse = "I couldn't identify which course you'd like to enroll in. Please include the course name, e.g. \"Enroll me in Algorithms\".";
      } else {
        // Try exact match first, then partial match as fallback
        let course = await Course.findOne({
          courseName: { $regex: new RegExp(`^${courseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        });
        if (!course) {
          course = await Course.findOne({
            courseName: { $regex: new RegExp(courseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          });
        }

        if (!course) {
          const names = allCourses.map((c) => c.courseName).join(", ");
          systemResponse = `I couldn't find a course named "${courseName}". Available courses: ${names}.`;
        } else {
          try {
            const term = currentTerm();
            await enrollStudentWithValidation(studentId, course._id, term);
            systemResponse = `You have been successfully enrolled in ${course.courseName} for ${term}.`;
          } catch (err) {
            systemResponse = `Could not enroll you in ${course.courseName}: ${err.message}`;
          }
        }
      }

    } else {

      systemResponse = `Here's everything I can help you with:

Degree Progress
- "What courses do I still need to complete?"
- "Show me my degree audit"

Current Enrollments
- "What am I currently enrolled in?"
- "Show my enrollment status"

Graduation Eligibility
- "Am I eligible to graduate?"
- "How many credits do I have left?"

Course Eligibility & Prerequisites
- "Which courses can I enroll in next?"
- "What courses am I eligible for?"

Enroll in a Course
- "Enroll me in Algorithms"
- "Sign me up for [course name]"`;
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

async function askAdvisorLLM(advisorId, question) {
  try {
    const intentResponse = await axios.post("http://localhost:11434/api/generate", {
      model: process.env.OLLAMA_MODEL,
      prompt: `
      You are an academic advising assistant helping an advisor query aggregate student data.

      If the question relates to:
      - students close to or nearing graduation → return STUDENTS_NEARING_GRADUATION
      - course enrollment counts or how many students are enrolled per course → return COURSE_ENROLLMENT_SUMMARY
      - total number of students or student counts by academic status → return STUDENT_COUNT
      - how many students are in each degree program → return PROGRAM_SUMMARY
      - anything else → return GENERAL

      Only return ONE of these labels exactly:
      STUDENTS_NEARING_GRADUATION
      COURSE_ENROLLMENT_SUMMARY
      STUDENT_COUNT
      PROGRAM_SUMMARY
      GENERAL

      Do not explain. Do not add punctuation.

      Question: "${question}"
      `,
      stream: false,
    });

    const intent = intentResponse.data.response.trim().toUpperCase();
    let systemResponse;

    if (intent === "STUDENTS_NEARING_GRADUATION") {
      const students = await Student.aggregate([
        { $match: { academicStatus: "Active" } },
        {
          $lookup: {
            from: "enrollments",
            let: { sid: "$_id" },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ["$studentId", "$$sid"] }, { $eq: ["$status", "Completed"] }] } } },
              { $lookup: { from: "courses", localField: "courseId", foreignField: "_id", as: "course" } },
              { $unwind: "$course" },
              { $project: { credits: "$course.credits" } },
            ],
            as: "completedEnrollments",
          },
        },
        { $addFields: { creditsCompleted: { $sum: "$completedEnrollments.credits" } } },
        { $lookup: { from: "degreeprograms", localField: "degreeProgramId", foreignField: "_id", as: "degreeProgram" } },
        { $unwind: "$degreeProgram" },
        { $addFields: { creditsRemaining: { $subtract: ["$degreeProgram.totalCreditsRequired", "$creditsCompleted"] } } },
        { $match: { creditsRemaining: { $lte: 9, $gte: 0 } } },
        { $project: { firstName: 1, lastName: 1, programName: "$degreeProgram.programName", creditsCompleted: 1, creditsRemaining: 1 } },
        { $sort: { creditsRemaining: 1 } },
      ]);

      if (students.length === 0) {
        systemResponse = "No active students are currently within 9 credits of graduation.";
      } else {
        systemResponse = `Students nearing graduation (≤9 credits remaining):\n\n` +
          students.map(s =>
            `• ${s.firstName} ${s.lastName} — ${s.programName}: ${s.creditsCompleted} credits completed, ${s.creditsRemaining} remaining`
          ).join("\n");
      }

    } else if (intent === "COURSE_ENROLLMENT_SUMMARY") {
      const summary = await Enrollment.aggregate([
        { $match: { status: "Enrolled" } },
        { $group: { _id: "$courseId", totalEnrolled: { $sum: 1 } } },
        { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } },
        { $unwind: "$course" },
        { $project: { courseName: "$course.courseName", courseCode: "$course.courseCode", totalEnrolled: 1 } },
        { $sort: { totalEnrolled: -1 } },
      ]);

      if (summary.length === 0) {
        systemResponse = "No active enrollments found.";
      } else {
        systemResponse = `Current course enrollment counts:\n\n` +
          summary.map(c =>
            `• ${c.courseName} (${c.courseCode}): ${c.totalEnrolled} student${c.totalEnrolled !== 1 ? "s" : ""}`
          ).join("\n");
      }

    } else if (intent === "STUDENT_COUNT") {
      const [active, inactive, graduated] = await Promise.all([
        Student.countDocuments({ academicStatus: "Active" }),
        Student.countDocuments({ academicStatus: "Inactive" }),
        Student.countDocuments({ academicStatus: "Graduated" }),
      ]);
      const total = active + inactive + graduated;
      systemResponse = `Student counts:\n\n• Total: ${total}\n• Active: ${active}\n• Inactive: ${inactive}\n• Graduated: ${graduated}`;

    } else if (intent === "PROGRAM_SUMMARY") {
      const programs = await DegreeProgram.find();
      const lines = await Promise.all(
        programs.map(async (p) => {
          const count = await Student.countDocuments({ degreeProgramId: p._id, academicStatus: "Active" });
          return `• ${p.programName}: ${count} active student${count !== 1 ? "s" : ""}`;
        })
      );
      systemResponse = `Active students per degree program:\n\n` + lines.join("\n");

    } else {
      systemResponse = `I can help you query aggregate student data. Try asking:
• "Which students are nearing graduation?"
• "Show course enrollment counts"
• "How many students do we have?"
• "How many students are in each program?"`;
    }

    return systemResponse;

  } catch (error) {
    console.error("Ollama Error (advisor):", error.message);
    throw new Error("LLM service unavailable or failed.");
  }
}

module.exports = { askLLM, askAdvisorLLM };