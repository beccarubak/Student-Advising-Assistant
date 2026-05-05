const mongoose = require("mongoose");
const Student = require("../models/student");
const Course = require("../models/courses");
const DegreeProgram = require("../models/degreePrograms");
const Enrollment = require("../models/enrollment");
const Advisor = require("../models/advisor");
const AdvisingNote = require("../models/advisingNotes");
const ChangeRequest = require("../models/changeRequest");
const Message = require("../models/message");
const { calculateDegreeAudit } = require("../services/degreeAuditService");
const { enrollStudentWithValidation, updateEnrollmentStatus } = require("../services/enrollmentService");
const { askLLM, askAdvisorLLM } = require("../services/llmService");
const { requireRole } = require("../services/authService");
const jwt = require("jsonwebtoken");


const resolvers = {
  Query: {
    //student queries
    getStudents: async (_, __, context) => {
      requireRole(context, "advisor");
      return await Student.find();
    },
    getStudent: async (_, { id }, context) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid student ID");
      }
      if (context.role === "student" && context.userId !== id) {
        throw new Error("Unauthorized");
      }
      if (!context.role) throw new Error("Unauthorized");
      return await Student.findById(id);
    },

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
    getAdvisors: async (_, __, context) => {
      requireRole(context, "advisor");
      return await Advisor.find();
    },
    getAdvisor: async (_, { id }, context) => {
      if (!context.role) throw new Error("Unauthorized");
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid advisor ID");
      }
      return await Advisor.findById(id);
    },

    //enrollment queries
    getEnrollments: async (_, __, context) => {
      requireRole(context, "advisor");
      return await Enrollment.find();
    },
    getStudentEnrollments: async (_, { studentId }, context) => {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error("Invalid student ID");
      }
      if (context.role === "student" && context.userId !== studentId) {
        throw new Error("Unauthorized");
      }
      if (!context.role) throw new Error("Unauthorized");
      return await Enrollment.find({ studentId });
    },

    //advising note queries
    getAdvisingNotes: async (_, { studentId }, context) => {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error("Invalid student ID");
      }
      if (context.role === "student" && context.userId !== studentId) {
        throw new Error("Unauthorized");
      }
      if (!context.role) throw new Error("Unauthorized");
      return await AdvisingNote.find({ studentId });
    },

    //change request queries
    getChangeRequest: async (_, { id }, context) => {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid ID");
      const request = await ChangeRequest.findById(id);
      if (!request) throw new Error("Change request not found");
      const isOwner = context.role === "student" && request.studentId.toString() === context.userId;
      const isAdvisor = context.role === "advisor" && request.advisorId.toString() === context.userId;
      if (!isOwner && !isAdvisor) throw new Error("Unauthorized");
      return request;
    },
    getMyChangeRequests: async (_, __, context) => {
      requireRole(context, "student");
      return await ChangeRequest.find({ studentId: context.userId });
    },
    getPendingChangeRequests: async (_, __, context) => {
      requireRole(context, "advisor");
      return await ChangeRequest.find({ advisorId: context.userId, status: "pending" });
    },
    getAdvisorRequestSummary: async (_, __, context) => {
      requireRole(context, "advisor");
      return await ChangeRequest.find({ advisorId: context.userId }).sort({ createdAt: -1 });
    },

    //degree audit query
    getDegreeAudit: async (_, { studentId }, context) => {
      if (context.role === "student" && context.userId !== studentId) {
        throw new Error("Unauthorized");
      }
      if (!context.role) throw new Error("Unauthorized");
      return await calculateDegreeAudit(studentId);
    },

    //students nearing graduation report
    getStudentsNearingGraduation: async (_, { threshold = 9 }, context) => {
      requireRole(context, "advisor");
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
    getCourseEnrollmentSummary: async (_, __, context) => {
      requireRole(context, "advisor");
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
    createStudent: async (_, { input }, context) => {
      requireRole(context, "advisor");
      const student = new Student(input);
      return await student.save();
    },
    updateStudent: async (_, { id, input }, context) => {
      requireRole(context, "advisor");
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid student ID");
      }
      return await Student.findByIdAndUpdate(id, input, { new: true });
    },
    deleteStudent: async (_, { id }, context) => {
      requireRole(context, "advisor");
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid student ID");
      }
      await Student.findByIdAndDelete(id);
      return true;
    },

    //course mutations
    createCourse: async (_, { courseCode, courseName, credits }, context) => {
      requireRole(context, "advisor");
      const course = new Course({ courseCode, courseName, credits });
      return await course.save();
    },
    addRequiredCourse: async (_, { programId, courseId }, context) => {
      requireRole(context, "advisor");
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
    createDegreeProgram: async (_, { programName, totalCreditsRequired }, context) => {
      requireRole(context, "advisor");
      const program = new DegreeProgram({
        programName,
        totalCreditsRequired,
      });
      return await program.save();
    },

    //enrollment mutations
    enrollStudent: async (_, { studentId, courseId, term }, context) => {
      requireRole(context, "advisor");
      return await enrollStudentWithValidation(studentId, courseId, term);
    },
    updateEnrollmentStatus: async (_, { enrollmentId, status, grade }, context) => {
      requireRole(context, "advisor");
      if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
        throw new Error("Invalid enrollment ID");
      }
      return await updateEnrollmentStatus(enrollmentId, status, grade);
    },

     //chat mutations
    askQuestion: async (_, { question }, context) => {
      requireRole(context, "student");
      return await askLLM(context.studentId, question);
    },
    askAdvisorQuestion: async (_, { question }, context) => {
      requireRole(context, "advisor");
      return await askAdvisorLLM(context.userId, question);
    },
    askAdvisorStudentQuestion: async (_, { studentId, question }, context) => {
      requireRole(context, "advisor");
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error("Invalid student ID");
      }
      return await askLLM(studentId, question);
    },

    //advisor mutations
    createAdvisor: async (_, { input }, context) => {
      requireRole(context, "advisor");
      const advisor = new Advisor(input);
      return await advisor.save();
    },
    updateAdvisor: async (_, { id, input }, context) => {
      requireRole(context, "advisor");
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid advisor ID");
      }
      return await Advisor.findByIdAndUpdate(id, input, { new: true });
    },
    deleteAdvisor: async (_, { id }, context) => {
      requireRole(context, "advisor");
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid advisor ID");
      }
      await Advisor.findByIdAndDelete(id);
      return true;
    },

    //student-advisor assignment
    assignAdvisor: async (_, { studentId, advisorId }, context) => {
      requireRole(context, "advisor");
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error("Invalid student ID");
      }
      if (!mongoose.Types.ObjectId.isValid(advisorId)) {
        throw new Error("Invalid advisor ID");
      }
      const advisor = await Advisor.findById(advisorId);
      if (!advisor) throw new Error("Advisor not found");
      return await Student.findByIdAndUpdate(
        studentId,
        { advisorId },
        { new: true }
      );
    },

    //advising note mutations
    createAdvisingNote: async (_, { studentId, advisorId, note }, context) => {
      requireRole(context, "advisor");
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
    deleteAdvisingNote: async (_, { id }, context) => {
      requireRole(context, "advisor");
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid advising note ID");
      }
      await AdvisingNote.findByIdAndDelete(id);
      return true;
    },

    //communication mutations
    submitChangeRequest: async (_, { advisorId, requestType, currentValue, proposedValue }, context) => {
      requireRole(context, "student");
      if (!mongoose.Types.ObjectId.isValid(advisorId)) throw new Error("Invalid advisor ID");
      const advisor = await Advisor.findById(advisorId);
      if (!advisor) throw new Error("Advisor not found");
      return await ChangeRequest.create({
        studentId: context.userId,
        advisorId,
        requestType,
        currentValue,
        proposedValue,
      });
    },
    sendMessage: async (_, { changeRequestId, content }, context) => {
      requireRole(context, "student", "advisor");
      if (!mongoose.Types.ObjectId.isValid(changeRequestId)) throw new Error("Invalid change request ID");
      const request = await ChangeRequest.findById(changeRequestId);
      if (!request) throw new Error("Change request not found");
      const isParty =
        (context.role === "student" && request.studentId.toString() === context.userId) ||
        (context.role === "advisor" && request.advisorId.toString() === context.userId);
      if (!isParty) throw new Error("Unauthorized");
      return await Message.create({
        changeRequestId,
        senderId: context.userId,
        senderRole: context.role,
        content,
      });
    },
    resolveChangeRequest: async (_, { id, status, advisorNotes }, context) => {
      requireRole(context, "advisor");
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid ID");
      const request = await ChangeRequest.findById(id);
      if (!request) throw new Error("Change request not found");
      if (request.advisorId.toString() !== context.userId) throw new Error("Unauthorized");
      if (request.status !== "pending") throw new Error("Request is already resolved");
      return await ChangeRequest.findByIdAndUpdate(
        id,
        { status, advisorNotes: advisorNotes || null, resolvedAt: new Date() },
        { new: true }
      );
    },

    //login mutation
    login: async (_, { email }) => {
      const student = await Student.findOne({ email });
      if (student) {
        const token = jwt.sign(
          { userId: student._id, role: "student" },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
        return { token, role: "student" };
      }

      const advisor = await Advisor.findOne({ email });
      if (advisor) {
        const token = jwt.sign(
          { userId: advisor._id, role: "advisor" },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
        return { token, role: "advisor" };
      }

      throw new Error("No account found with that email");
    },
  },

  //resolvers for nested fields
  Student: {
    degreeProgram: async (parent) =>
      await DegreeProgram.findById(parent.degreeProgramId),
    advisor: async (parent) =>
      parent.advisorId ? await Advisor.findById(parent.advisorId) : null,
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

  ChangeRequest: {
    student: async (parent) => await Student.findById(parent.studentId),
    advisor: async (parent) => await Advisor.findById(parent.advisorId),
    messages: async (parent) => await Message.find({ changeRequestId: parent._id }).sort({ createdAt: 1 }),
  },

  Message: {
    changeRequest: async (parent) => await ChangeRequest.findById(parent.changeRequestId),
  },
};

module.exports = { resolvers };
