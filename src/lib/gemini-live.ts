import { VertexAI } from "@google-cloud/vertexai";

const project = "hackathon-472412";

// Authentication configuration for production deployment
const vertexAI = new VertexAI({
  project: project,
  location: "asia-south1", // Mumbai - closest to Delhi
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

// Initialize Gemini model for live audio processing
export const geminiLiveModel = vertexAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    maxOutputTokens: 1024, // Shorter responses for live conversation
    temperature: 0.7, // More natural conversation
    candidateCount: 1,
    topP: 0.8,
    topK: 10,
  },
});

export interface AudioMessage {
  audioData: string; // base64 encoded audio
  mimeType: string; // audio/wav, audio/mp3, etc.
  timestamp: number;
}

export interface GeminiLiveResponse {
  audioResponse?: string; // base64 encoded audio response
  textResponse: string; // text version of the response
  timestamp: number;
  processingTime: number;
}

export class GeminiLiveService {
  private agentInstructions: string;
  private conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  constructor(agentInstructions: string) {
    this.agentInstructions = agentInstructions;
  }

  async processAudioMessage(
    audioMessage: AudioMessage
  ): Promise<GeminiLiveResponse> {
    const startTime = Date.now();

    try {
      // Convert audio to text first (Speech-to-Text)
      const userText = await this.audioToText(audioMessage);

      // Add to conversation history
      this.conversationHistory.push({ role: "user", content: userText });

      // Generate text response using Gemini
      const textResponse = await this.generateTextResponse(userText);

      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: textResponse,
      });

      // Convert text response to audio (Text-to-Speech)
      const audioResponse = await this.textToAudio(textResponse);

      const processingTime = Date.now() - startTime;

      return {
        audioResponse,
        textResponse,
        timestamp: Date.now(),
        processingTime,
      };
    } catch (error) {
      console.error("Error processing audio with Gemini Live:", error);
      throw new Error("Failed to process audio message");
    }
  }

  private async audioToText(audioMessage: AudioMessage): Promise<string> {
    // TODO: Implement actual Speech-to-Text
    // For now, return a placeholder
    return "Hello, I just spoke to you"; // This would be the actual transcribed text
  }

  private async generateTextResponse(userText: string): Promise<string> {
    const conversationContext = this.conversationHistory
      .slice(-5) // Keep last 5 exchanges for context
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const prompt = `
You are an AI assistant in a live audio conversation. Here are your instructions:

${this.agentInstructions}

Recent conversation context:
${conversationContext}

Current user message: ${userText}

Respond naturally and conversationally, as if you're speaking. Keep your response concise and engaging, suitable for audio conversation.
`;

    const result = await geminiLiveModel.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "I'm sorry, I didn't catch that. Could you repeat?";
  }

  private async textToAudio(text: string): Promise<string> {
    // TODO: Implement actual Text-to-Speech
    // This could use Google Cloud Text-to-Speech API
    // For now, return null (client would use browser TTS as fallback)
    return ""; // This would be base64 encoded audio
  }

  public getConversationHistory() {
    return this.conversationHistory;
  }

  public clearHistory() {
    this.conversationHistory = [];
  }
}
