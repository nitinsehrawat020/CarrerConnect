import {
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from "@google-cloud/vertexai";

const project = "hackathon-472412";

// Authentication configuration for production deployment
const vertexAI = new VertexAI({
  project: project,
  location: "asia-south1", // Mumbai - closest to Delhi with better model availability
  // Add authentication credentials for Vercel deployment
  googleAuthOptions: {
    // Use service account key from environment variable
    credentials: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
      : undefined,
    // Fallback to default credentials in development
    projectId: project,
  },
});
const textModel = "gemini-2.5-flash";
const visionModel = "gemini-2.5-flash";

// Instantiate Gemini models
export const generativeModel = vertexAI.getGenerativeModel({
  model: textModel,
  // The following parameters are optional
  // They can also be passed to individual content generation requests
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
  generationConfig: { maxOutputTokens: 8192 },
  systemInstruction: {
    role: "system",
    parts: [{ text: `For example, you are a helpful customer service agent.` }],
  },
});

export const generativeVisionModel = vertexAI.getGenerativeModel({
  model: visionModel,
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 0.1,
    candidateCount: 1,
    topP: 0.8,
    topK: 10,
  },
});

export const generativeModelPreview = vertexAI.preview.getGenerativeModel({
  model: textModel,
});
