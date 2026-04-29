const Student = require("../models/student");
const Course = require("../models/courses");
const Enrollment = require("../models/enrollment");

async function enrollStudentWithValidation(studentId, courseId, term) {
  if (!term || term.trim() === ""){
    throw new Error("Term is required");
  }
  
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  if (student.academicStatus !== "Active") {
    throw new Error(
      `Cannot enroll student with status: ${student.academicStatus}`
    );
  }

  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error("Course not found");
  }

  const existingEnrollment = await Enrollment.findOne({
    studentId,
    courseId,
    term,
  });

  if (existingEnrollment) {
    throw new Error("Student already enrolled in this course for this term");
  }

  const completedEnrollment = await Enrollment.findOne({
    studentId,
    courseId,
    status: "Completed",
  });

  if (completedEnrollment) {
    throw new Error("Student has already completed this course");
  }

  const enrollment = new Enrollment({
    studentId,
    courseId,
    term,
  });

  return await enrollment.save();
}

async function updateEnrollmentStatus(enrollmentId, status, grade) {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  const validTransitions = {
    Enrolled: ["Completed", "Dropped"],
    Completed: [],
    Dropped: [],
  };
  if (!validTransitions[enrollment.status].includes(status)) {
    throw new Error(
      `Invalid enrollment status change from ${enrollment.status} to ${status}`
    );
  }

  if (enrollment.status === "Completed") {
    throw new Error("Cannot modify a completed enrollment");
  }
  if (enrollment.status === "Dropped") {
    throw new Error("Cannot modify a dropped enrollment");
  }

  if (status === "Completed") {
    if (!grade) {
      throw new Error("Grade is required when completing a course");
    }
    enrollment.grade = grade;
  }
  enrollment.status = status;

  return await enrollment.save();
}

module.exports = {
  enrollStudentWithValidation,
  updateEnrollmentStatus,
};