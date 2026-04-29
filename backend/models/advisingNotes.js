const mongoose = require("mongoose");

const advisingNoteSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  advisorName: { type: String, required: true },
  note: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AdvisingNote", advisingNoteSchema);