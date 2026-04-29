const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true },
  credits: { type: Number, required: true, min: 1 },
  prerequisites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
  ],
});

module.exports = mongoose.model("Course", courseSchema);
