const express = require("express");
const ytDlp = require("yt-dlp-exec");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");

const app = express();
const PORT = 3000;

// FFmpeg path set
ffmpeg.setFfmpegPath(ffmpegPath);

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// 🎧 STREAM ROUTE (NO SAVE)
app.get("/play", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).send("No song provided");

    console.log(`🔍 Streaming: ${query}`);

    try {
        const ytProcess = ytDlp.exec(
            `ytsearch1:${query}`,
            {
                o: "-",
                f: "bestaudio",
                noPlaylist: true,
                q: ""
            },
            { stdio: ["ignore", "pipe", "ignore"] }
        );

        if (!ytProcess.stdout) {
            return res.status(500).send("YouTube stream failed");
        }

        res.setHeader("Content-Type", "audio/mpeg");

        ffmpeg(ytProcess.stdout)
            .audioCodec("libmp3lame")
            .audioBitrate(128)
            .format("mp3")
            .on("error", err => {
                console.error("❌ FFmpeg Error:", err.message);
                res.end();
            })
            .pipe(res, { end: true });

    } catch (err) {
        console.error("❌ Error:", err.message);
        res.status(500).send("Streaming error");
    }
});


app.get("/download", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).send("No song provided");

    console.log(`⬇️ Downloading: ${query}`);

    try {
        const ytProcess = ytDlp.exec(
            `ytsearch1:${query}`,
            {
                o: "-",
                f: "bestaudio",
                noPlaylist: true,
                q: ""
            },
            { stdio: ["ignore", "pipe", "ignore"] }
        );

        if (!ytProcess.stdout) {
            return res.status(500).send("YouTube stream failed");
        }

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${query.replace(/\s+/g, "_")}.mp3"`
        );
        res.setHeader("Content-Type", "audio/mpeg");

        ffmpeg(ytProcess.stdout)
            .audioCodec("libmp3lame")
            .audioBitrate(128)
            .format("mp3")
            .on("error", err => {
                console.error("❌ FFmpeg Error:", err.message);
                res.end();
            })
            .pipe(res, { end: true });

    } catch (err) {
        console.error("❌ Download Error:", err.message);
        res.status(500).send("Download failed");
    }
});




app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
