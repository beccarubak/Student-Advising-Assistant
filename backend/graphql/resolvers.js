const mongoose = require("mongoose");
const Student = require("../models/student");
const Course = require("../models/courses");
const DegreeProgram = require("../models/degreePrograms");
const Enrollment = require("../models/enrollment");
const Advisor = require("../models/advisor");
const AdvisingNote = require("../models/advisingNotes");
const { calculateDegreeAudit } = require("../services/degreeAuditService");
const { enrollStudentWithValidation, updateEnrollmentStatus } = require("../services/enrollmentService");
const { askLLM } = require("../services/llmService");
const jwt = require("jsonwebtoken");


const resolvers = {
  Query: {
    //student queries
    getStudents: async () => await Student.find(),
    getStudent: async (_, { id }) =>{
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid student ID");
      }
      return await Student.findById(id)},

    //course queries
    getCourses: async () => await Course.find(),

    //degree program queries  
    getDegreePrograms: async () => await DegreeProgram.find(),
    getDegreeProgram: async (_, { id }) =>{
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid degree program ID");
      }
      return await DegreeProgram.findById(id)
    },

    //advisor queries
    getAdvisors: async () => await Advisor.find(),
    getAdvisor: async (_, { id }) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid advisor ID");
      }
      return await Advisor.findById(id);
    },

    //enrollment queries
    getEnrollments: async () => await Enrollment.find(),
    getStudentEnrollments: async (_, { studentId }) => {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error("Invalid student ID");
      }
      return await Enrollment.find({ studentId });
    },

    //advising note queries
    getAdvisingNotes: async (_, { studentId }) => {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error("Invalid student ID");
      }
      return await AdvisingNote.find({ studentId });
    },

    //degree audit query
    getDegreeAudit: async (_, { studentId }) =>
      await calculateDegreeAudit(studentId),

    //students nearing graduation report
    getStudentsNearingGraduation: async (_, { threshold = 9 }) => {
      const results = await Student.aggregate([
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
        { $match: { creditsRemaining: { $lte: threshold, $gte: 0 } } },
        {
          $project: {
            studentId: "$_id",
            firstName: 1,
            lastName: 1,
            email: 1,
            programName: "$degreeProgram.programName",
            totalCreditsRequired: "$degreeProgram.totalCreditsRequired",
            creditsCompleted: 1,
            creditsRemaining: 1,
          },
        },
      ]);
      return results;
    },

    //course enrollement summary query
    getCourseEnrollmentSummary: async () => {
      const summary = await Enrollment.aggregate([
        //active enrollments
        { $match: { status: "Enrolled" } },
        //grouped by course
        {
          $group: {
            _id: "$courseId",
            totalEnrolled: { $sum: 1 },
          },
        },
        // Join with Course collection
        {
          $lookup: {
            from: "courses",
            localField: "_id",
            foreignField: "_id",
            as: "course",
          },
        },
        { $unwind: "$course" },
        {
          $project: {
            courseId: "$_id",
            courseName: "$course.courseName",
            totalEnrolled: 1,
          },
        },
      ]);
      return summary;
    },
  },

  Mutation: {
    //student mutations
    createStudent: async (_, { input }) => {
      const student = new Student(input);
      return await student.save();
    },
    updateStudent: async (_, { id, input }) =>{
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid student ID");
      }
      return await Student.findByIdAndUpdate(id, input, { new: true })
    },
    deleteStudent: async (_, { id }) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid student ID");
      }
      await Student.findByIdAndDelete(id);
      return true;
    },

    //course mutations
    createCourse: async (_, { courseCode, courseName, credits }) => {
      const course = new Course({ courseCode, courseName, credits });
      return await course.save();
    },
    addRequiredCourse: async (_, { programId, courseId }) => {
      if (!mongoose.Types.ObjectId.isValid(programId)) {
        throw new Error("Invalid degree program ID");
      }
      if (!mongoose.Types.ObjectId.isValid(courseId)) { 
        throw new Error("Invalid course ID");
      }

      const program = await DegreeProgram.findById(programId);
      if (!program) {
        throw new Error("Degree program not found");
      }

      if (!program.requiredCourses.some(id => id.toString() === courseId)) {
        program.requiredCourses.push(courseId);
      }

      return await program.save();
    },

    //degree program mutations
    createDegreeProgram: async (_, { programName, totalCreditsRequired }) => {
      const program = new DegreeProgram({
        programName,
        totalCreditsRequired,
      });
      return await program.save();
    },

    //enrollment mutations
    enrollStudent: async (_, { studentId, courseId, term }) =>
      await enrollStudentWithValidation(studentId, courseId, term),
    updateEnrollmentStatus: async (_, { enrollmentId, status, grade }) => {
      if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
        throw new Error("Invalid enrollment ID");
      }
      return await updateEnrollmentStatus(enrollmentId, status, grade);
    },

     //chat mutations
    askQuestion: async (_, { question }, context) => {
      if (!context.studentId) {
        throw new Error("Not authenticated");
      }
      
      return await askLLM(context.studentId, question);
    },

    //advisor mutations
    createAdvisor: async (_, { input }) => {
      const advisor = new Advisor(input);
      return await advisor.save();
    },
    updateAdvisor: async (_, { id, input }) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid advisor ID");
      }
      return await Advisor.findByIdAndUpdate(id, input, { new: true });
    },
    deleteAdvisor: async (_, { id }) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid advisor ID");
      }
      await Advisor.findByIdAndDelete(id);
      return true;
    },

    //advising note mutations
    createAdvisingNote: async (_, { studentId, advisorId, note }) => {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error("Invalid student ID");
      }
      if (!mongoose.Types.ObjectId.isValid(advisorId)) {
        throw new Error("Invalid advisor ID");
      }
      const student = await Student.findById(studentId);
      if (!student) throw new Error("Student not found");
      const advisor = await Advisor.findById(advisorId);
      if (!advisor) throw new Error("Advisor not found");

      const advisingNote = new AdvisingNote({ studentId, advisorId, note });
      return await advisingNote.save();
    },
    deleteAdvisingNote: async (_, { id }) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid advising note ID");
      }
      await AdvisingNote.findByIdAndDelete(id);
      return true;
    },

    //login mutation
    login: async (_, { email }) => {
      const student = await Student.findOne({ email });

      if (!student) {
        throw new Error("Student not found");
      }

      const token = jwt.sign(
        { studentId: student._id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      return { token };
    },
  },

  //resolvers for nested fields
  Student: {
    degreeProgram: async (parent) =>
      await DegreeProgram.findById(parent.degreeProgramId),
  },

  Enrollment: {
    student: async (parent) =>
      await Student.findById(parent.studentId),
    course: async (parent) =>
      await Course.findById(parent.courseId),
  },

  DegreeProgram: {
    requiredCourses: async (parent) =>
      await Course.find({ _id: { $in: parent.requiredCourses } }),
  },

  AdvisingNote: {
    student: async (parent) => await Student.findById(parent.studentId),
    advisor: async (parent) => await Advisor.findById(parent.advisorId),
  },
};

module.exports = { resolvers };
