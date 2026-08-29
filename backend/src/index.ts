import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { analyzeCinImage } from "./ai-service.js";
import { validateCinResult } from "./validation.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo maximum
});

app.get("/", (req, res) => {
  res.json({ message: "Le serveur backend fonctionne !" });
});

app.post("/analyze", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "L'image est trop volumineuse (10 Mo maximum).",
        });
      }
      return res.status(400).json({
        error: "Erreur lors du traitement du fichier envoyé.",
      });
    } else if (err) {
      return res.status(500).json({
        error: "Une erreur inattendue est survenue.",
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: "Aucun fichier reçu. Merci d'envoyer une image.",
      });
    }

    if (file.size === 0) {
      return res.status(400).json({
        error: "Le fichier envoyé est vide.",
      });
    }

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        error: "Le fichier envoyé n'est pas une image.",
      });
    }

        try {
      console.log(`Analyse de : ${file.originalname} (${file.size} octets)`);

      const result = await analyzeCinImage(file.buffer, file.mimetype);
      const warnings = validateCinResult(result);

      res.json({ ...result, warnings });
    } catch (error) {
      console.error("Erreur lors de l'analyse :", error);
      res.status(500).json({
        error: "Une erreur est survenue lors de l'analyse de l'image. Réessayez avec une autre photo.",
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});