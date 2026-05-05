require("dotenv").config();
const mongoose = require("mongoose");

const Student = require("./models/student");
const Course = require("./models/courses");
const DegreeProgram = require("./models/degreePrograms");
const Enrollment = require("./models/enrollment");
const Advisor = require("./models/advisor");
const AdvisingNote = require("./models/advisingNotes");
const ChangeRequest = require("./models/changeRequest");
const Message = require("./models/message");

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // ── Clear all collections ─────────────────────────────────
  await Promise.all([
    Student.deleteMany({}),
    Course.deleteMany({}),
    DegreeProgram.deleteMany({}),
    Enrollment.deleteMany({}),
    Advisor.deleteMany({}),
    AdvisingNote.deleteMany({}),
    ChangeRequest.deleteMany({}),
    Message.deleteMany({}),
  ]);
  console.log("Cleared all collections");

  // ── Courses ───────────────────────────────────────────────
  // B.S. Computer Science courses
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

  // B.S. Data Science courses
  const calc = await Course.create({
    courseCode: "MATH101",
    courseName: "Calculus I",
    credits: 3,
  });
  const stats = await Course.create({
    courseCode: "MATH201",
    courseName: "Statistics",
    credits: 3,
    prerequisites: [calc._id],
  });
  const da = await Course.create({
    courseCode: "DS201",
    courseName: "Data Analysis",
    credits: 3,
    prerequisites: [calc._id],
  });
  const dv = await Course.create({
    courseCode: "DS301",
    courseName: "Data Visualization",
    credits: 3,
    prerequisites: [da._id],
  });
  const ads = await Course.create({
    courseCode: "DS401",
    courseName: "Advanced Data Science",
    credits: 3,
    prerequisites: [stats._id, dv._id],
  });

  console.log("Courses created");

  // ── Degree Programs ───────────────────────────────────────
  const csProgram = await DegreeProgram.create({
    programName: "B.S. Computer Science",
    totalCreditsRequired: 15,
    requiredCourses: [intro._id, ds._id, algo._id, db._id, ml._id],
  });

  const dsProgram = await DegreeProgram.create({
    programName: "B.S. Data Science",
    totalCreditsRequired: 15,
    requiredCourses: [calc._id, stats._id, da._id, dv._id, ads._id],
  });

  console.log("Degree programs created");

  // ── Advisors ──────────────────────────────────────────────
  const sarah = await Advisor.create({
    firstName: "Sarah",
    lastName: "Mitchell",
    email: "sarah.mitchell@university.edu",
  });

  const james = await Advisor.create({
    firstName: "James",
    lastName: "Carter",
    email: "james.carter@university.edu",
  });

  console.log("Advisors created");

  // ── Students ──────────────────────────────────────────────
  // Alice: CS, mid-progress — 2 courses done, 1 active, eligible for Databases
  const alice = await Student.create({
    firstName: "Alice",
    lastName: "Johnson",
    email: "alice@example.com",
    degreeProgramId: csProgram._id,
    advisorId: sarah._id,
    academicStatus: "Active",
  });

  // Bob: CS, near graduation — 4 of 5 courses done, only needs Machine Learning
  const bob = await Student.create({
    firstName: "Bob",
    lastName: "Smith",
    email: "bob@example.com",
    degreeProgramId: csProgram._id,
    advisorId: sarah._id,
    academicStatus: "Active",
  });

  // Carol: Data Science, mid-progress — eligible to request Data Visualization
  const carol = await Student.create({
    firstName: "Carol",
    lastName: "Davis",
    email: "carol@example.com",
    degreeProgramId: dsProgram._id,
    advisorId: james._id,
    academicStatus: "Active",
  });

  // David: CS, early stage — only CS101 done, eligible for Data Structures
  const david = await Student.create({
    firstName: "David",
    lastName: "Lee",
    email: "david@example.com",
    degreeProgramId: csProgram._id,
    advisorId: james._id,
    academicStatus: "Active",
  });

  // Emma: CS, fully completed — good demo of graduation eligibility check
  const emma = await Student.create({
    firstName: "Emma",
    lastName: "Wilson",
    email: "emma@example.com",
    degreeProgramId: csProgram._id,
    advisorId: sarah._id,
    academicStatus: "Graduated",
  });

  // Frank: CS, suspended — demonstrates non-Active status blocking enrollment requests
  const frank = await Student.create({
    firstName: "Frank",
    lastName: "Torres",
    email: "frank@example.com",
    degreeProgramId: csProgram._id,
    advisorId: james._id,
    academicStatus: "Suspended",
  });

  console.log("Students created");

  // ── Enrollments ───────────────────────────────────────────
  // Alice: CS101 ✓, CS201 ✓, CS301 (active) — eligible for Databases next
  await Enrollment.create([
    { studentId: alice._id, courseId: intro._id, term: "Fall 2024",   status: "Completed", grade: "A" },
    { studentId: alice._id, courseId: ds._id,    term: "Spring 2025", status: "Completed", grade: "B" },
    { studentId: alice._id, courseId: algo._id,  term: "Fall 2025",   status: "Enrolled" },
  ]);

  // Bob: 4/5 CS courses done — only needs CS450 to graduate
  await Enrollment.create([
    { studentId: bob._id, courseId: intro._id, term: "Fall 2023",   status: "Completed", grade: "A" },
    { studentId: bob._id, courseId: ds._id,    term: "Spring 2024", status: "Completed", grade: "A" },
    { studentId: bob._id, courseId: algo._id,  term: "Fall 2024",   status: "Completed", grade: "B" },
    { studentId: bob._id, courseId: db._id,    term: "Spring 2025", status: "Completed", grade: "A" },
  ]);

  // Carol: MATH101 ✓, DS201 ✓, MATH201 (active) — eligible for Data Visualization next
  await Enrollment.create([
    { studentId: carol._id, courseId: calc._id,  term: "Fall 2024",   status: "Completed", grade: "A" },
    { studentId: carol._id, courseId: da._id,    term: "Spring 2025", status: "Completed", grade: "B" },
    { studentId: carol._id, courseId: stats._id, term: "Fall 2025",   status: "Enrolled" },
  ]);

  // David: CS101 ✓ only — just getting started, eligible for Data Structures
  await Enrollment.create([
    { studentId: david._id, courseId: intro._id, term: "Fall 2025", status: "Completed", grade: "B" },
  ]);

  // Emma: all 5 CS courses completed — eligible for graduation
  await Enrollment.create([
    { studentId: emma._id, courseId: intro._id, term: "Fall 2022",   status: "Completed", grade: "A" },
    { studentId: emma._id, courseId: ds._id,    term: "Spring 2023", status: "Completed", grade: "A" },
    { studentId: emma._id, courseId: algo._id,  term: "Fall 2023",   status: "Completed", grade: "A" },
    { studentId: emma._id, courseId: db._id,    term: "Spring 2024", status: "Completed", grade: "B" },
    { studentId: emma._id, courseId: ml._id,    term: "Fall 2024",   status: "Completed", grade: "A" },
  ]);

  // Frank: CS101 done, Data Structures dropped before suspension
  await Enrollment.create([
    { studentId: frank._id, courseId: intro._id, term: "Fall 2024",   status: "Completed", grade: "C" },
    { studentId: frank._id, courseId: ds._id,    term: "Spring 2025", status: "Dropped" },
  ]);

  console.log("Enrollments created");

  // ── Advising Notes ────────────────────────────────────────
  await AdvisingNote.create([
    {
      studentId: alice._id,
      advisorId: sarah._id,
      note: "Strong student showing great progress. Encourage research opportunities in AI/ML.",
      createdAt: new Date("2025-09-15"),
    },
    {
      studentId: alice._id,
      advisorId: sarah._id,
      note: "Reviewed Spring 2026 plan. Recommend enrolling in Databases once Algorithms is complete.",
      createdAt: new Date("2025-11-10"),
    },
    {
      studentId: bob._id,
      advisorId: sarah._id,
      note: "Bob is one course away from graduation. Submitted graduation application for Spring 2026. Pending Machine Learning enrollment.",
      createdAt: new Date("2025-10-20"),
    },
    {
      studentId: carol._id,
      advisorId: james._id,
      note: "First advising meeting. Reviewed Data Science roadmap — student is motivated and on track.",
      createdAt: new Date("2025-09-05"),
    },
    {
      studentId: david._id,
      advisorId: james._id,
      note: "Discussed long-term academic plan. Student interested in machine learning specialization — needs to complete prerequisites first.",
      createdAt: new Date("2025-11-01"),
    },
    {
      studentId: frank._id,
      advisorId: james._id,
      note: "Academic suspension issued due to failure to complete coursework. Reinstatement requires dean's office approval and academic improvement plan.",
      createdAt: new Date("2025-08-20"),
    },
  ]);

  console.log("Advising notes created");

  // ── Change Requests ───────────────────────────────────────
  // 1. Alice: pending enrollment request for Databases (good demo — approve to enroll her)
  const aliceEnrollReq = await ChangeRequest.create({
    studentId: alice._id,
    advisorId: sarah._id,
    requestType: "ENROLLMENT_REQUEST",
    currentValue: "Not enrolled",
    proposedValue: "Databases",
    courseId: db._id,
    status: "pending",
    createdAt: new Date("2025-12-01"),
  });

  // 2. Bob: pending enrollment request for Machine Learning (final course for graduation)
  const bobEnrollReq = await ChangeRequest.create({
    studentId: bob._id,
    advisorId: sarah._id,
    requestType: "ENROLLMENT_REQUEST",
    currentValue: "Not enrolled",
    proposedValue: "Machine Learning",
    courseId: ml._id,
    status: "pending",
    createdAt: new Date("2025-12-03"),
  });

  // 3. Carol: pending major change request
  const carolMajorReq = await ChangeRequest.create({
    studentId: carol._id,
    advisorId: james._id,
    requestType: "MAJOR_CHANGE",
    currentValue: "B.S. Data Science",
    proposedValue: "B.S. Computer Science",
    status: "pending",
    createdAt: new Date("2025-11-28"),
  });

  // 4. David: approved enrollment request (historical — shows what resolved looks like)
  await ChangeRequest.create({
    studentId: david._id,
    advisorId: james._id,
    requestType: "ENROLLMENT_REQUEST",
    currentValue: "Not enrolled",
    proposedValue: "Data Structures",
    courseId: ds._id,
    status: "approved",
    advisorNotes: "Prerequisites verified. Good luck in CS201!",
    resolvedAt: new Date("2025-11-05"),
    createdAt: new Date("2025-11-03"),
  });
  // Enrollment created when request was approved
  await Enrollment.create({
    studentId: david._id,
    courseId: ds._id,
    term: "Spring 2026",
    status: "Enrolled",
  });

  // 5. Frank: denied study plan adjustment (shows denial + advisor note to student)
  await ChangeRequest.create({
    studentId: frank._id,
    advisorId: james._id,
    requestType: "STUDY_PLAN_ADJUSTMENT",
    currentValue: "Standard CS track",
    proposedValue: "Part-time enrollment plan",
    status: "denied",
    advisorNotes: "Adjustment cannot be processed while academic suspension is active. Please resolve suspension with the dean's office first.",
    resolvedAt: new Date("2025-09-10"),
    createdAt: new Date("2025-09-05"),
  });

  console.log("Change requests created");

  // ── Messages ──────────────────────────────────────────────
  // Thread on Alice's enrollment request
  await Message.create([
    {
      changeRequestId: aliceEnrollReq._id,
      senderId: alice._id,
      senderRole: "student",
      content: "Hi Dr. Mitchell! I've finished Data Structures and am currently in Algorithms. Would love to take Databases next term.",
      createdAt: new Date("2025-12-01T10:00:00"),
    },
    {
      changeRequestId: aliceEnrollReq._id,
      senderId: sarah._id,
      senderRole: "advisor",
      content: "Hi Alice! Your prerequisites look good. I'll review and get back to you soon.",
      createdAt: new Date("2025-12-01T14:30:00"),
    },
  ]);

  // Thread on Carol's major change request
  await Message.create([
    {
      changeRequestId: carolMajorReq._id,
      senderId: carol._id,
      senderRole: "student",
      content: "I've been thinking about switching to Computer Science after my data analysis course. Would any of my credits transfer?",
      createdAt: new Date("2025-11-28T09:00:00"),
    },
    {
      changeRequestId: carolMajorReq._id,
      senderId: james._id,
      senderRole: "advisor",
      content: "Hi Carol, great question. Calculus I would transfer as a prerequisite for CS courses. Let's schedule a meeting to go over the full plan.",
      createdAt: new Date("2025-11-28T11:15:00"),
    },
    {
      changeRequestId: carolMajorReq._id,
      senderId: carol._id,
      senderRole: "student",
      content: "That would be great! I'm available Tuesday or Thursday afternoons.",
      createdAt: new Date("2025-11-28T11:45:00"),
    },
  ]);

  // Thread on Bob's enrollment request
  await Message.create([
    {
      changeRequestId: bobEnrollReq._id,
      senderId: bob._id,
      senderRole: "student",
      content: "Dr. Mitchell, Machine Learning is the last course I need to graduate. Hoping to get approved for Spring 2026!",
      createdAt: new Date("2025-12-03T09:30:00"),
    },
  ]);

  console.log("Messages created");

  // ── Summary ───────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────────");
  console.log("Seed complete! Login credentials:");
  console.log("\nAdvisors:");
  console.log("  sarah.mitchell@university.edu  (advises Alice, Bob, Emma)");
  console.log("  james.carter@university.edu    (advises Carol, David, Frank)");
  console.log("\nStudents:");
  console.log("  alice@example.com  — CS, Active,    mid-progress (9/15 cr), 1 pending enrollment request");
  console.log("  bob@example.com    — CS, Active,    near grad    (12/15 cr), 1 pending enrollment request");
  console.log("  carol@example.com  — DS, Active,    mid-progress (9/15 cr), 1 pending major change request");
  console.log("  david@example.com  — CS, Active,    early stage  (3/15 cr), 1 approved request (enrolled in CS201)");
  console.log("  emma@example.com   — CS, Graduated, all done     (15/15 cr)");
  console.log("  frank@example.com  — CS, Suspended, stalled      (3/15 cr), 1 denied request");
  console.log("─────────────────────────────────────────────────────────\n");

  mongoose.disconnect();
}

seed();
