require("dotenv").config();
const mongoose = require("mongoose");

const Student = require("./models/student");
const Course = require("./models/courses");
const DegreeProgram = require("./models/degreePrograms");
const Enrollment = require("./models/enrollment");

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Clear existing data
  await Student.deleteMany({});
  await Course.deleteMany({});
  await DegreeProgram.deleteMany({});
  await Enrollment.deleteMany({});

  console.log("Cleared old data");

  // Create courses
  const intro = await Course.create({
    courseCode: "CS101",
    courseName: "Intro to Programming",
    credits: 3,
  });

  const ds = await Course.create({
    courseCode: "CS201",
    courseName: "Data Structures",
    credits: 3,
    prerequisites: [intro._id],
  });

  const algo = await Course.create({
    courseCode: "CS301",
    courseName: "Algorithms",
    credits: 3,
    prerequisites: [ds._id],
  });

  const db = await Course.create({
    courseCode: "CS401",
    courseName: "Databases",
    credits: 3,
    prerequisites: [ds._id],
  });

  const ml = await Course.create({
    courseCode: "CS450",
    courseName: "Machine Learning",
    credits: 3,
    prerequisites: [algo._id],
  });

  console.log("Courses created");

  // Create degree program
  const program = await DegreeProgram.create({
    programName: "B.S. Computer Science",
    totalCreditsRequired: 15,
    requiredCourses: [intro._id, ds._id, algo._id, db._id, ml._id],
  });

  console.log("Degree program created");

  // Create students
  const student1 = await Student.create({
    firstName: "Alice",
    lastName: "Johnson",
    email: "alice@example.com",
    degreeProgramId: program._id,
  });

  const student2 = await Student.create({
    firstName: "Bob",
    lastName: "Smith",
    email: "bob@example.com",
    degreeProgramId: program._id,
  });

  console.log("Students created");

  // Enrollments for Alice (mid-progress)
  await Enrollment.create([
    {
      studentId: student1._id,
      courseId: intro._id,
      term: "Fall 2024",
      status: "Completed",
      grade: "A",
    },
    {
      studentId: student1._id,
      courseId: ds._id,
      term: "Spring 2025",
      status: "Completed",
      grade: "B",
    },
    {
      studentId: student1._id,
      courseId: algo._id,
      term: "Fall 2025",
      status: "Enrolled",
    },
  ]);

  // Enrollments for Bob (almost graduated)
  await Enrollment.create([
    {
      studentId: student2._id,
      courseId: intro._id,
      term: "Fall 2023",
      status: "Completed",
      grade: "A",
    },
    {
      studentId: student2._id,
      courseId: ds._id,
      term: "Spring 2024",
      status: "Completed",
      grade: "A",
    },
    {
      studentId: student2._id,
      courseId: algo._id,
      term: "Fall 2024",
      status: "Completed",
      grade: "B",
    },
    {
      studentId: student2._id,
      courseId: db._id,
      term: "Spring 2025",
      status: "Completed",
      grade: "A",
    },
  ]);

  console.log("Enrollments created");

  console.log("Seed complete!");
  mongoose.disconnect();
}

seed();