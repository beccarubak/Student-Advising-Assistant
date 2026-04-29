const mongoose = require("mongoose");

const degreeProgramSchema = new mongoose.Schema({
  programName: { type: String, required: true },
  totalCreditsRequired: { type: Number, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  requiredCourses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
  ],
});

module.exports = mongoose.model("DegreeProgram", degreeProgramSchema);
