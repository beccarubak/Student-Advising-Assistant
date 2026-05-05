const mongoose = require("mongoose");

const changeRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  advisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Advisor",
    required: true,
  },
  requestType: {
    type: String,
    enum: ["MAJOR_CHANGE", "STUDY_PLAN_ADJUSTMENT", "ENROLLMENT_REQUEST"],
    required: true,
  },
  currentValue: { type: String, required: true },
  proposedValue: { type: String, required: true },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    default: null,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "denied"],
    default: "pending",
  },
  advisorNotes: { type: String, default: null },
  resolvedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChangeRequest", changeRequestSchema);
