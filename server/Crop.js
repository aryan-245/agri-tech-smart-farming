
const mongoose = require("mongoose");

const cropSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    area: {
      type: Number,
      required: true,
      min: 0.1
    },
    stage: {
      type: String,
      enum: ["Seedling", "Growing", "Flowering", "Harvesting"],
      default: "Seedling"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Crop", cropSchema);
