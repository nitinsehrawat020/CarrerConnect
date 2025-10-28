import { db } from "@/db";
import { meetings } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meetingId, history } = body;
    console.log(history);

    if (
      !meetingId ||
      !Array.isArray(history?.items) ||
      history?.items.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing meetingId or history array." },
        { status: 400 }
      );
    }

    // Format the history from the agent for database insertion
    const recordsToInsert = history.items.map((entry: HistoryEntry) => ({
      meetingId: meetingId,
      participantIdentity: entry.role === "assistant" ? "agent" : "user",
      participantName: entry.role === "assistant" ? "Agent" : "User",
      message: entry.content,
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
    }));

    await new Promise((resolve) => setTimeout(resolve, 4000));

    const [updatedMeeting] = await db
      .update(meetings)
      .set({ transcrible: recordsToInsert })
      .where(eq(meetings.id, meetingId))
      .returning();
    console.log(updatedMeeting);

    await inngest.send({
      name: "meetings/processing",
      data: {
        recordingUrl: updatedMeeting.recordingUrl,
        meetingId: meetingId,
        transcrible: recordsToInsert,
      },
    });

    return NextResponse.json({
      success: true,
      count: recordsToInsert.length,
    });
  } catch (error) {
    console.error("[Server] Error saving agent history:", error);
    return NextResponse.json(
      { error: "Failed to save agent history." },
      { status: 500 }
    );
  }
}
