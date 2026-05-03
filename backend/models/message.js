const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  changeRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChangeRequest",
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  senderRole: {
    type: String,
    enum: ["student", "advisor"],
    required: true,
  },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);
