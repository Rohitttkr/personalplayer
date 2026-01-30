const express = require("express");
const ytDlp = require("yt-dlp-exec");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Middleware
app.use(express.static(path.join(__dirname, "public")));

// 🟢 PLAY ROUTE
// 👉 Localhost = enabled
// 👉 Render = disabled (to avoid error)
app.get("/play", (req, res) => {
    const query = req.query.q;
    if (!query) return res.end();

    // Detect cloud (Render)
    if (process.env.RENDER) {
        return res
            .status(403)
            .send("Streaming disabled on cloud hosting");
    }

    try {
        const yt = ytDlp.exec(
            `ytsearch1:${query}`,
            {
                o: "-",
                f: "bestaudio",
                noPlaylist: true
            },
            { stdio: ["ignore", "pipe", "ignore"] }
        );

        res.setHeader("Content-Type", "audio/mpeg");

        ffmpeg(yt.stdout)
            .audioCodec("libmp3lame")
            .audioBitrate(128)
            .format("mp3")
            .on("error", () => res.end())
            .pipe(res);

    } catch (err) {
        res.end();
    }
});

// 🟢 DOWNLOAD ROUTE (works everywhere)
app.get("/download", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.end();

    try {
        const yt = ytDlp.exec(
            `ytsearch1:${query}`,
            {
                o: "-",
                f: "bestaudio",
                noPlaylist: true
            },
            { stdio: ["ignore", "pipe", "ignore"] }
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${query.replace(/\s+/g, "_")}.mp3"`
        );
        res.setHeader("Content-Type", "audio/mpeg");

        ffmpeg(yt.stdout)
            .audioCodec("libmp3lame")
            .audioBitrate(128)
            .format("mp3")
            .pipe(res);

    } catch (err) {
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
