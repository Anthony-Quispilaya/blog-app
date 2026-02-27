const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const app = express();
const upload = multer({ dest: path.join(process.cwd(), "tmp-audio") });

const WHISPER_CLI_PATH =
  process.env.WHISPER_CLI_PATH || "./whisper.cpp/build/bin/whisper-cli";
const WHISPER_MODEL_PATH =
  process.env.WHISPER_MODEL_PATH || "./whisper.cpp/models/ggml-base.en.bin";
const PORT = Number(process.env.PORT || 8787);

app.post("/transcribe", upload.single("audio"), (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) {
    return res.status(400).json({ error: "Missing audio file" });
  }

  const args = ["-m", WHISPER_MODEL_PATH, "-f", filePath, "-otxt", "-l", "en"];

  execFile(
    WHISPER_CLI_PATH,
    args,
    { timeout: 120000 },
    (error, _stdout, stderr) => {
      const txtPath = `${filePath}.txt`;

      if (error) {
        cleanup(filePath, txtPath);
        return res.status(500).json({ error: stderr || error.message });
      }

      const transcript = fs.existsSync(txtPath)
        ? fs.readFileSync(txtPath, "utf8").trim()
        : "";

      cleanup(filePath, txtPath);

      if (!transcript) {
        return res.status(422).json({ error: "Transcription empty" });
      }

      return res.json({ transcript });
    },
  );
});

function cleanup(...paths) {
  for (const filePath of paths) {
    if (filePath && fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

app.listen(PORT, () => {
  console.log(`whisper-service listening on http://localhost:${PORT}`);
});
