const express = require("express");
const ytDlp = require("yt-dlp-exec");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");
// Note: Node 18+ mein fetch built-in hota hai, agar purana hai toh require karein
// const fetch = require('node-fetch'); 

const app = express();
const PORT = process.env.PORT || 3000;

// FFmpeg setup
ffmpeg.setFfmpegPath(ffmpegPath);

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// --- 1. SUGGESTION ROUTE ---
app.get("/suggest", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);

    try {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&gl=IN&q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const ignoreWords = ["reaction", "review", "roast", "news", "gameplay", "trailer", "explained"];
        const cleanSuggestions = (data[1] || []).filter(item => {
            const lowerItem = item.toLowerCase();
            return !ignoreWords.some(badWord => lowerItem.includes(badWord));
        });

        res.json(cleanSuggestions.slice(0, 7)); 
    } catch (err) {
        console.error("Suggestion Error:", err.message);
        res.json([]);
    }
});

// --- Helper Function for yt-dlp flags ---
const getYtOptions = () => ({
    o: '-',
    f: 'bestaudio',
    noPlaylist: true,
    q: '',
    noWarnings: true,
    // User Agent spoofing to bypass simple blocks
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
});

// --- 2. PLAY STREAM ROUTE ---
app.get("/play", (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).send("No song provided");

    console.log(`🎧 Streaming: ${query}`);

    try {
        // Headers set karein taaki browser wait kare
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Transfer-Encoding", "chunked");

        const ytProcess = ytDlp.exec(`ytsearch1:${query}`, getYtOptions(), { 
            stdio: ['ignore', 'pipe', 'ignore'] 
        });

        if (!ytProcess.stdout) {
            console.error("❌ Process stdout is null");
            return res.end();
        }

        ffmpeg(ytProcess.stdout)
            .audioCodec("libmp3lame")
            .audioBitrate(128)
            .format("mp3")
            .on("error", (err) => {
                // Sirf log karein, crash na karein
                if (err.message !== 'Output stream closed') {
                    console.error("FFmpeg Error:", err.message);
                }
            })
            .pipe(res, { end: true });

    } catch (err) {
        console.error("❌ Critical Stream Error:", err.message);
        res.end();
    }
});

// --- 3. DOWNLOAD ROUTE ---
app.get("/download", (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).send("No song provided");

    console.log(`⬇️ Downloading: ${query}`);

    try {
        const safeFilename = query.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.mp3"`);
        res.setHeader("Content-Type", "audio/mpeg");

        const ytProcess = ytDlp.exec(`ytsearch1:${query}`, getYtOptions(), { 
            stdio: ['ignore', 'pipe', 'ignore'] 
        });

        ffmpeg(ytProcess.stdout)
            .audioCodec("libmp3lame")
            .audioBitrate(128)
            .format("mp3")
            .on("error", () => {})
            .pipe(res, { end: true });

    } catch (err) {
        console.error("Download Error:", err.message);
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
