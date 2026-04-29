const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },

  degreeProgramId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DegreeProgram",
  },

  academicStatus: { type: String, enum: ["Active", "Graduated", "Suspended"],default: "Active" },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Student", studentSchema);
