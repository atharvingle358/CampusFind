import mongoose from "mongoose";
const itemSchema = new mongoose.Schema({
  type: { type: String, enum: ["lost", "found"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 1200 },
  category: { type: String, required: true },
  location: { type: String, required: true, maxlength: 120 },
  dateOccurred: { type: Date, required: true },
  imageUrl: { type: String, default: "" },
  status: { type: String, enum: ["open", "pending", "claimed", "closed"], default: "open" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  verificationQuestion: { type: String, required: true, maxlength: 240 },
  verificationAnswerHash: { type: String, required: true }
}, { timestamps: true });
itemSchema.index({ title: "text", description: "text", location: "text" });
export default mongoose.model("Item", itemSchema);
