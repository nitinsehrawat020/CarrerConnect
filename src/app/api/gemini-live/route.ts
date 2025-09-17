import { NextRequest, NextResponse } from "next/server";
import { GeminiLiveService, AudioMessage } from "@/lib/gemini-live";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { eq } from "drizzle-orm";

// Store active Gemini Live services for each meeting
const activeSessions = new Map<string, GeminiLiveService>();

// Google Gemini Live Audio API endpoint
export async function POST(req: NextRequest) {
  try {
    const { audioData, meetingId, mimeType = "audio/wav" } = await req.json();

    if (!audioData || !meetingId) {
      return NextResponse.json(
        { error: "Missing audioData or meetingId" },
        { status: 400 }
      );
    }

    // Get or create Gemini Live service for this meeting
    let geminiService = activeSessions.get(meetingId);

    if (!geminiService) {
      // Get meeting and agent information
      const [existingMeeting] = await db
        .select()
        .from(meetings)
        .where(eq(meetings.id, meetingId));

      if (!existingMeeting) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }

      const [existingAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, existingMeeting.agentId));

      if (!existingAgent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      // Create new Gemini Live service with agent instructions
      geminiService = new GeminiLiveService(existingAgent.instruction);
      activeSessions.set(meetingId, geminiService);
    }

    // Process the audio message
    const audioMessage: AudioMessage = {
      audioData,
      mimeType,
      timestamp: Date.now(),
    };

    const response = await geminiService.processAudioMessage(audioMessage);

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("Gemini Live audio processing error:", error);
    return NextResponse.json(
      { error: "Failed to process audio with Gemini Live" },
      { status: 500 }
    );
  }
}

// Handle session cleanup and management
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get("meetingId");

  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
  }

  // Clean up the session
  activeSessions.delete(meetingId);

  return NextResponse.json({
    message: "Gemini Live session cleaned up",
    meetingId,
  });
}

// Get session status and conversation history
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get("meetingId");

  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
  }

  const geminiService = activeSessions.get(meetingId);

  if (!geminiService) {
    return NextResponse.json({
      active: false,
      message: "No active Gemini Live session for this meeting",
    });
  }

  return NextResponse.json({
    active: true,
    conversationHistory: geminiService.getConversationHistory(),
    meetingId,
  });
}
