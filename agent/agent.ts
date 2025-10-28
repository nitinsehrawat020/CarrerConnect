import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
  voice,
} from "@livekit/agents";
import * as google from "@livekit/agents-plugin-google";
import { BackgroundVoiceCancellation } from "@livekit/noise-cancellation-node";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// Define metadata interface for better type safety
interface AgentMetadata {
  instructions?: string;
  context?: {
    careerField?: string;
    idealJob?: string;
    targetCompany?: string;
    previousComapny?: string;
  };
  pastSummary?: Array<string>;
}

class Assistant extends voice.Agent {
  constructor(instructions: string) {
    super({
      instructions,
    });
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    console.log("🤖 Agent started for room:", ctx.room.name);
    const apiSecret = process.env.INTERNAL_API_SECRET;

    // 1. Declare session here to make it accessible in the callback's scope
    // eslint-disable-next-line prefer-const
    let session: voice.AgentSession;

    ctx.addShutdownCallback(async () => {
      console.log("🔌 Agent shutting down. Preparing to send transcript...");

      // 2. Check if the session was ever initialized
      if (!session) {
        console.error("❌ Session not initialized, cannot save transcript.");
        return;
      }

      // 3. Get the history from the session object
      const history = session.history.toJSON();

      if (!history || history.length === 0) {
        console.log("No history to save.");
        return;
      }
      console.log(history);

      try {
        const apiBase = process.env.API_ENDPOINT || "http://localhost:3000";
        const response = await fetch(`${apiBase}/api/save-transcription`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiSecret}`,
          },
          body: JSON.stringify({
            meetingId: ctx.room.name,
            history: history, // 4. Now 'history' is a defined variable
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `API request failed with status ${response.status}: ${errorText}`
          );
        }
        console.log(
          `✅ Successfully sent transcript for room ${ctx.room.name} to the server.`
        );
      } catch (error) {
        console.error("❌ Failed to send transcript to server:", error);
      }
    });

    // Parse metadata safely
    let metadata: AgentMetadata = {};
    try {
      if (ctx.job.metadata) {
        metadata = JSON.parse(ctx.job.metadata);
        console.log("📋 Parsed metadata:", metadata);
      }
    } catch (error) {
      console.error("❌ Failed to parse job metadata:", error);
    }

    // Extract user context
    const careerField = metadata.context?.careerField;
    const idealJob = metadata.context?.idealJob;
    const customInstructions = metadata.instructions;
    const pastSummaries = metadata.pastSummary;

    // Check if we have previous meeting data
    const hasPreviousMeetings =
      pastSummaries && Array.isArray(pastSummaries) && pastSummaries.length > 0;

    // Format previous meeting summaries properly
    let previousMeetingsContext = "";
    if (hasPreviousMeetings) {
      previousMeetingsContext = `
      ## PREVIOUS MEETING HISTORY:

      You have conducted ${pastSummaries!.length} previous session(s) with this user. Here are the detailed transcribtion:

      ${pastSummaries!
        .map(
          (summary, index) => `
      ### Previous Meeting ${index + 1}:
      ${summary}

      ---`
        )
        .join("\n")}

      IMPORTANT INSTRUCTIONS FOR USING THIS HISTORY:
      - Reference specific topics, advice, or action items from these previous meetings
      - Ask about progress on specific recommendations you made before
      - Build upon previous conversations rather than starting from scratch
      - Show that you remember their journey and progress
      - Use specific details from the summaries to demonstrate continuity
      - If they mention something you discussed before, acknowledge it specifically`;
    }

    // Build dynamic instructions based on context
    const dynamicInstructions = `You are a personalized AI Career Advisor that interacts with the user in real-time voice chat. 

      # USER PROFILE:
      - Name: This user is seeking ${customInstructions}
      - Current Career Field: ${careerField}
      - Target Role: ${idealJob}

      ${previousMeetingsContext}

      # YOUR PERSONALITY & APPROACH:
      - Act as a professional but warm career mentor
      - Speak conversationally and naturally
      - Show genuine interest in their progress
      - Be specific and actionable in your advice
      - Remember and reference previous conversations accurately

      # FOR THIS SESSION:
      ${
        hasPreviousMeetings
          ? `
      **THIS IS A FOLLOW-UP MEETING**

      Your greeting should:
      1. Welcome them back warmly and personally
      2. Reference specific details from your previous meeting(s)
      3. Ask about progress on specific action items or topics you discussed
      4. Show that you've been thinking about their journey
      5. Invite them to update you on what's happened since you last spoke

      Example approach:
      "Welcome back! It's so good to see you again. Last time we talked about [specific topic from summary], and I remember you were working on [specific action item]. How has that been going? I'm excited to hear about your progress and see what we should focus on today."`
          : `
      **THIS IS YOUR FIRST MEETING**

      Your greeting should:
      1. Welcome them warmly as a new mentee
      2. Acknowledge their career goals (${careerField} → ${idealJob})
      3. Set expectations about how you can help
      4. Ask what they'd like to focus on first

      Example approach:
      "Hi there! It's wonderful to meet you. I understand you're working in ${careerField} and looking to transition into ${idealJob}. I'm here to help guide you through that journey. What's the most pressing career challenge you're facing right now?"`
      }`;
    console.log(dynamicInstructions);

    // 5. Assign the created session to the variable in the outer scope
    session = new voice.AgentSession({
      llm: new google.beta.realtime.RealtimeModel({
        apiKey: process.env.GEMINI_API_KEY,
        model: "gemini-2.0-flash-exp",
        voice: "Puck",
        temperature: 0.7, // Slightly lower for more consistent referencing
        instructions: dynamicInstructions,
      }),
    });

    await session.start({
      agent: new Assistant(dynamicInstructions),
      room: ctx.room,
      inputOptions: {
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    // Generate contextual greeting with better specificity
    if (hasPreviousMeetings) {
      // Extract key topics from the most recent meeting for specific reference
      const recentSummary = pastSummaries![pastSummaries!.length - 1];
      const greetingInstructions = `
Welcome the user back personally. You have their complete meeting history above. 

From their most recent meeting: "${recentSummary}"

Be specific about:
- What you discussed last time
- Any action items or recommendations you gave
- Their progress or challenges mentioned
- Next steps you planned together

Ask specific follow-up questions about their progress since your last conversation. Show that you remember the details of your previous interaction.`;

      const handle = session.generateReply({
        instructions: greetingInstructions,
      });

      await handle.waitForPlayout();
    } else {
      const greetingInstructions = `Give a warm first-time greeting. Acknowledge their career goals (${careerField} → ${idealJob}). Ask what specific career challenge they'd like to start with today.`;

      const handle = session.generateReply({
        instructions: greetingInstructions,
      });

      await handle.waitForPlayout();
    }

    console.log("✅ Initial greeting completed");
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
