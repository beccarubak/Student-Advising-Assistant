const Student = require("../models/student");
const DegreeProgram = require("../models/degreePrograms");
const Enrollment = require("../models/enrollment");

async function calculateDegreeAudit(studentId) {
  const student = await Student.findById(studentId);

  if (!student) {
    throw new Error("Student not found");
  }

  if (!student.degreeProgramId) {
    throw new Error("Student has no degree program assigned");
  }

  const program = await DegreeProgram.findById(
    student.degreeProgramId
  ).populate("requiredCourses");

  if (!program) {
    throw new Error("Degree program not found");
  }

  const completedEnrollments = await Enrollment.find({
    studentId,
    status: "Completed",
  }).populate("courseId");

  const completedCourses = completedEnrollments.map(e => e.courseId);

  const completedCourseIds = completedCourses.map(c =>
    c._id.toString()
  );

  const remainingCourses = program.requiredCourses.filter(
    course => !completedCourseIds.includes(course._id.toString())
  );

  const creditsCompleted = completedCourses.reduce(
    (sum, course) => sum + course.credits,
    0
  );

  const creditsRemaining = Math.max(program.totalCreditsRequired - creditsCompleted, 0);

  return {
    totalCreditsRequired: program.totalCreditsRequired,
    creditsCompleted,
    creditsRemaining,
    completedCourses,
    remainingCourses,
  };
}

module.exports = { calculateDegreeAudit };