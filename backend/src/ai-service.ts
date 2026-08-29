import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("La variable d'environnement GEMINI_API_KEY est manquante. Vérifie ton fichier .env");
}

const ai = new GoogleGenAI({ apiKey });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


async function callGeminiWithRetry(
  params: Parameters<typeof ai.models.generateContent>[0],
  maxRetries = 3
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error) {
      lastError = error;

      const status = (error as { status?: number })?.status;
      const isRetryable = status === 429 || (status !== undefined && status >= 500);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delayMs = 1000 * 2 ** attempt; 
      console.warn(
        `Appel Gemini échoué (statut ${status}), nouvel essai dans ${delayMs / 1000}s (tentative ${attempt + 1}/${maxRetries})`
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}


const responseSchema = {
  type: Type.OBJECT,
  properties: {
    nom: { type: Type.STRING, nullable: true },
    prenom: { type: Type.STRING, nullable: true },
    date_naissance: { type: Type.STRING, nullable: true },
    numero_cin: { type: Type.STRING, nullable: true },
    date_fin_validite: { type: Type.STRING, nullable: true },
  },
  required: ["nom", "prenom", "date_naissance", "numero_cin", "date_fin_validite"],
};



const PROMPT = `
Tu es un système d'extraction d'informations à partir d'une image de carte
d'identité nationale (CIN) marocaine, recto uniquement, en caractères latins.

Extrait uniquement les 5 champs suivants :
- nom
- prenom
- date_naissance (au format JJ.MM.AAAA si visible)
- numero_cin
- date_fin_validite (au format JJ.MM.AAAA si visible)

Règles strictes :
1. Si un champ n'est pas clairement lisible sur l'image, retourne la valeur null
   pour ce champ. N'invente JAMAIS une valeur, même plausible.
2. Un champ est considéré "non lisible" s'il est partiellement coupé, flou,
   masqué par un reflet, ou hors du cadre de l'image. Dans ce cas, retourne
   null pour ce champ précis, même si les autres champs sont bien lisibles.
3. Une image inclinée, prise en photo (plutôt que scannée), ou avec un éclairage
   imparfait n'est PAS une raison de retourner null si le texte reste lisible.
   Fais de ton mieux pour lire le texte visible malgré ces imperfections.
4. Ignore complètement le texte en arabe, ne l'utilise pas pour deviner un champ.
5. Si l'image ne semble pas être une CIN marocaine (recto), retourne null pour
   tous les champs.
6. Ne complète et ne corrige jamais un champ partiellement visible en te basant
   sur ce qui te semblerait "logique" ou "habituel" (ex: ne complète pas une
   date partielle comme "22/" en supposant une année plausible).
7. Sur une photo de qualité moyenne (grain, reflet, faible résolution), les
   caractères suivants sont fréquemment confondus : B/8, O/0, I/1/l, S/5.
   Avant de répondre, relis chaque lettre du nom et du prénom un caractère à
   la fois pour limiter ce type d'erreur, plutôt que de lire le mot d'un
   seul coup d'œil global.
8. Réponds uniquement avec les données extraites, sans commentaire ni explication.
`;

export interface CinResult {
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  numero_cin: string | null;
  date_fin_validite: string | null;
}

export async function analyzeCinImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<CinResult> {
  const response = await callGeminiWithRetry({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Réponse vide de la part de l'IA.");
  }

  return JSON.parse(text) as CinResult;
}