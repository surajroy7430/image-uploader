const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL;
const MONGO_URI = process.env.MONGO_URI;

// AWS S3 Configuration (SDK v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const getFormattedDate = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  const randomNum = String(Math.floor(100000 + Math.random() * 900000)); // Generates 6-digit random number

  return `${year}${month}${day}${randomNum}`;
};

// Multer Storage for AWS S3
const upload = multer({
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif|tiff|tif|bmp|pdf|ico/;
    const mimetype = fileTypes.test(file.mimetype);
    const extname = fileTypes.test(file.originalname.toLowerCase());

    if (mimetype && extname) {
      return cb(null, true); // Accept the file
    } else {
      return cb(
        new Error("Only image files (jpg, jpeg, png, gif) are allowed!"),
        false
      );
    }
  },
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE, // Auto-detect content type
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const filename = `${file.originalname
        .split("-")
        .slice(0, -2)
        .join("-")}-${getFormattedDate()}`;
      cb(null, filename);
    },
  }),
});

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
}
connectDB();

// MongoDB Schema
const FileSchema = new mongoose.Schema({
  filename: String,
  fileUrl: String,
  uploadedAt: { type: Date, default: Date.now },
});
const File = mongoose.model("File", FileSchema);

// Upload File Route
app.post("/upload", upload.array("files"), async (req, res) => {
  if (!req.files) {
    return res.status(400).json({ error: "File upload failed" });
  }

  try {
    const newFiles = req.files.map((file) => {
      return {
        filename: file.originalname.split("-").slice(0, -2).join("-"),
        fileUrl: file.location, // AWS S3 URL
      };
    });

    const savedFiles = await File.insertMany(newFiles);

    res.json({
      message: "Files uploaded successfully!",
      files: savedFiles,
    });
  } catch (error) {
    console.error("Error saving file metadata to MongoDB:", error);
    res.status(500).json({ error: "Error saving file metadata" });
  }
});

// Get all files
app.get("/files", async (req, res) => {
  try {
    const files = await File.find();
    res.json(files);
  } catch (error) {
    console.error("Error fetching files from DB:", error);
    res.status(500).json({ error: "Error fetching files" });
  }
});

// Delete File
app.delete("/files/:id", async (req, res) => {
  const file = await File.findById(req.params.id);
  if (!file) return res.status(404).json({ error: "File not found" });

  const fileKey = file.fileUrl.split("/").pop();

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
      })
    );

    await File.findByIdAndDelete(req.params.id);
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    res.status(500).json({ error: "Error deleting file" });
  }
});

app.use((req, res) => res.send(`Server running on - ${BASE_URL}`));
app.listen(PORT, () => console.log(`Server running on port - ${PORT}`));

module.exports = app;