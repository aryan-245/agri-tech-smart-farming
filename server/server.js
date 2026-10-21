
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Crop = require("./Crop");
const Irrigation = require("./Irrigation");
const app = express();

app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Agri-Tech Backend is Running!"
  });
});

// Health check
app.get("/api/health", (req, res) => {
    app.get("/test-route", (req, res) => {
  res.send("Test route is working");
});
  res.json({
    success: true,
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected"
  });
});

// Get all crops
app.get("/api/crops", async (req, res) => {
  try {
    const crops = await Crop.find().sort({ createdAt: -1 });
    res.json({ success: true, crops });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not fetch crops"
    });
  }
});

// Add a crop
app.post("/api/crops", async (req, res) => {
  try {
    const { name, area, stage } = req.body;
console.log("Received crop data:", req.body);

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Crop name is required"
      });
    }

    const crop = await Crop.create({
  name: name.trim(),
  area: Number(area),
  stage: stage
});

    res.status(201).json({
      success: true,
      crop
    });
    } catch (error) {
    console.error("ADD CROP ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Could not add crop"
    });
  }
});

// Delete a crop
app.delete("/api/crops/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID"
      });
    }

    const crop = await Crop.findByIdAndDelete(req.params.id);

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found"
      });
    }

    res.json({
      success: true,
      message: "Crop deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not delete crop"
    });
  }
});

app.get("/api/irrigation", async (req, res) => {
  try {
    const records = await Irrigation.find().sort({ createdAt: -1 });
    res.json({ success: true, records });
  } catch (error) {
    console.error("GET IRRIGATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Could not load irrigation records",
    });
  }
});

app.post("/api/irrigation", async (req, res) => {
  try {
    const { cropId, moisture, recommendation } = req.body;

    if (!cropId || moisture === undefined || !recommendation) {
      return res.status(400).json({
        success: false,
        message: "Crop, moisture and recommendation are required",
      });
    }

    const moistureValue = Number(moisture);

    if (
      !Number.isFinite(moistureValue) ||
      moistureValue < 0 ||
      moistureValue > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Moisture must be between 0 and 100",
      });
    }

    if (!mongoose.isValidObjectId(cropId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID",
      });
    }

    const crop = await Crop.findById(cropId);

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found",
      });
    }

    const record = await Irrigation.create({
      cropId: crop._id,
      cropName: crop.name,
      moisture: moistureValue,
      recommendation: recommendation.trim(),
      action: "Pending",
    });

    res.status(201).json({ success: true, record });
  
  } catch (error) {
    console.error("UPDATE IRRIGATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Could not update irrigation status",
    });
  }

});
app.get("/api/test-route", (req, res) => {
  res.json({ success: true, message: "Test route works" });
});
app.patch("/api/irrigation/:id", async (req, res) => {
  try {
    const { action } = req.body;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid irrigation record ID",
      });
    }

    if (!["Pending", "Irrigated", "Skipped"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid irrigation action",
      });
    }

    const record = await Irrigation.findByIdAndUpdate(
      id,
      { action },
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Irrigation record not found",
      });
    }

    res.json({
      success: true,
      message: "Irrigation status updated successfully",
      record,
    });
  } catch (error) {
    console.error("UPDATE IRRIGATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Could not update irrigation status",
    });
  }
});

// Start server after MongoDB connects
async function startServer() {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri || uri.includes("PASTE_YOUR")) {
      throw new Error("Please configure MONGODB_URI in .env");
    }

    await mongoose.connect(uri);
    console.log("MongoDB Atlas connected successfully");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(
        `Agri-Tech server running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Startup error:", error.message);
  }
}

startServer();
