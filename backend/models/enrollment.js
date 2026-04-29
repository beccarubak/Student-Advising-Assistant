const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  term: {type: String, required: true},
  grade: String,
  status: {
    type: String,
    enum: ["Enrolled", "Completed", "Dropped"],
    default: "Enrolled",
  },
});

module.exports = mongoose.model("Enrollment", enrollmentSchema);
