import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver, WebhookEvent } from "livekit-server-sdk";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { meetings } from "@/db/schema";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
  try {
    // Initialize LiveKit webhook receiver
    const receiver = new WebhookReceiver(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );

    // Get the raw body and authorization header
    const body = await req.text();
    const authHeader = req.headers.get("Authorization") || "";

    // Verify and parse the webhook event
    const event: WebhookEvent = await receiver.receive(body, authHeader);

    console.log("LiveKit webhook event received:", event.event);

    // Handle different LiveKit events
    switch (event.event) {
      case "room_started":
        await handleRoomStarted(event);
        break;

      case "room_finished":
        await handleRoomFinished(event);
        break;

      case "participant_joined":
        await handleParticipantJoined(event);
        break;

      case "participant_left":
        await handleParticipantLeft(event);
        break;

      case "track_published":
        await handleTrackPublished(event);
        break;

      case "track_unpublished":
        await handleTrackUnpublished(event);
        break;

      case "egress_started":
        await handleEgressStarted(event);
        break;

      case "egress_ended":
        await handleEgressEnded(event);
        break;

      default:
        console.log("Unhandled LiveKit event:", event.event);
    }

    return NextResponse.json({
      status: "success",
      event: event.event,
      room: event.room?.name,
    });
  } catch (error) {
    console.error("LiveKit webhook error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

// Event handlers
async function handleRoomStarted(event: WebhookEvent) {
  console.log(`Room started: ${event.room?.name}`);
}

async function handleRoomFinished(event: WebhookEvent) {
  console.log(`Room finished: ${event.room?.name}`);
}

async function handleParticipantJoined(event: WebhookEvent) {
  console.log(event.participant?.identity);
}

async function handleParticipantLeft(event: WebhookEvent) {}

async function handleTrackPublished(event: WebhookEvent) {
  console.log(
    `Track published: ${event.track?.type} by ${event.participant?.identity}`
  );
}

async function handleTrackUnpublished(event: WebhookEvent) {
  console.log(
    `Track unpublished: ${event.track?.type} by ${event.participant?.identity}`
  );

  // Handle track unpublishing
}

async function handleEgressStarted(event: WebhookEvent) {
  console.log(`Egress started for room: ${event.room?.name}`);

  // Handle recording/streaming start
  if (event.room && event.egressInfo) {
    await inngest.send({
      name: "livekit/egress.started",
      data: {
        roomName: event.room.name,
        egressId: event.egressInfo.egressId,
        egressType:
          typeof event.egressInfo.details === "string"
            ? event.egressInfo.details
            : "unknown",
        startedAt: new Date(),
      },
    });
  }
}

async function handleEgressEnded(event: WebhookEvent) {
  console.log(`Egress ended for room: ${event.room?.name}`);

  // Handle recording/streaming completion
  if (event.room && event.egressInfo) {
    const meetingId = event.room.name; // Adjust based on your room naming convention

    // If this was a recording and has file results, update the meeting with the recording URL
    if (event.egressInfo.fileResults?.[0]) {
      await db
        .update(meetings)
        .set({
          recordingUrl: event.egressInfo.fileResults[0].location,
        })
        .where(eq(meetings.id, meetingId));
    }

    await inngest.send({
      name: "livekit/egress.ended",
      data: {
        roomName: event.room.name,
        meetingId: meetingId,
        egressId: event.egressInfo.egressId,
        egressType:
          typeof event.egressInfo.details === "string"
            ? event.egressInfo.details
            : "unknown",
        fileLocation: event.egressInfo.fileResults?.[0]?.location,
        status: event.egressInfo.status,
        endedAt: new Date(),
      },
    });
  }
}
