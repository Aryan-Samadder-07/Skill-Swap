import express from "express";
import multer from "multer";
import { Storage } from "megajs";
import { supabase } from "./supabase.js";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch"; // scoped for MEGA only

dotenv.config();

const app = express();
const upload = multer();

// ✅ Allow requests from your frontend origin
app.use(
  cors({
    origin: "http://127.0.0.1:5500", // local frontend
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.post(
  "/upload",
  upload.fields([{ name: "file" }, { name: "thumbnail" }]),
  async (req, res) => {
    try {
      console.log("Incoming files:", req.files);
      console.log("Incoming body:", req.body);

      const file = req.files.file?.[0];
      const thumbnail = req.files.thumbnail?.[0];
      const videoId = req.body.videoId;

      if (!file || !videoId) {
        return res
          .status(400)
          .json({ success: false, error: "Missing file or videoId" });
      }

      // ✅ Login to MEGA (scoped fetch)
      const mega = new Storage({
        email: process.env.MEGA_EMAIL,
        password: process.env.MEGA_PASSWORD,
        fetch, // only MEGA uses node-fetch
      });

      await new Promise((resolve, reject) => {
        mega.on("ready", resolve);
        mega.on("error", reject);
      });

      // ✅ Upload video
      const uploadVideo = mega.upload(file.originalname, file.buffer);
      const megaFileUrl = await new Promise((resolve, reject) => {
        uploadVideo.on("complete", (uploadedFile) => {
          uploadedFile.link((err, url) => {
            if (err) return reject(err);
            resolve(url);
          });
        });
        uploadVideo.on("error", reject);
      });

      // ✅ Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnail) {
        const uploadThumb = mega.upload(
          thumbnail.originalname,
          thumbnail.buffer,
        );
        thumbnailUrl = await new Promise((resolve, reject) => {
          uploadThumb.on("complete", (uploadedFile) => {
            uploadedFile.link((err, url) => {
              if (err) return reject(err);
              resolve(url);
            });
          });
          uploadThumb.on("error", reject);
        });
      }

      // ✅ Update Supabase metadata
      const { error } = await supabase
        .from("videos")
        .update({
          video_url: megaFileUrl,
          mega_file_url: megaFileUrl,
          thumbnail_url: thumbnailUrl || "placeholder-thumbnail-url",
          status: "ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", videoId);

      if (error) {
        console.error("Supabase update error:", error);
        return res.status(500).json({ success: false, error });
      }

      res.json({
        success: true,
        message: "Upload to MEGA successful",
        videoId,
        mega_file_url: megaFileUrl,
        thumbnail_url: thumbnailUrl,
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      res.status(500).json({
        success: false,
        error: err.message || JSON.stringify(err, null, 2),
      });
    }
  },
);

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`MEGA upload service running on port ${port}`),
);
