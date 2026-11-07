import mongoose from "mongoose";
const claimSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  claimant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  explanation: { type: String, required: true, maxlength: 700 },
  answerCorrect: { type: Boolean, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { timestamps: true });
claimSchema.index({ item: 1, claimant: 1 });
export default mongoose.model("Claim", claimSchema);
