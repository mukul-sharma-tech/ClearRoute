import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
  {
    agent_id: { type: String },
    customer_id: { type: String },
    meetingCode: { type: String, required: true },
    startTime: { type: Date, default: Date.now, required: true },
    endTime: { type: Date },
    status: { type: String, enum: ['Active', 'Ended'], default: 'Active' },
    chatHistory: [{
      sender: String,
      message: String,
      timestamp: { type: Date, default: Date.now }
    }]
  }
)

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };