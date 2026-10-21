
const mongoose = require("mongoose");

const irrigationSchema = new mongoose.Schema(
  {
    cropId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Crop",
      required: true,
    },
    cropName: {
      type: String,
      required: true,
      trim: true,
    },
    moisture: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    recommendation: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ["Pending", "Irrigated", "Skipped"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Irrigation", irrigationSchema);
