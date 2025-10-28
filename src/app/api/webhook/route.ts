import { NextRequest, NextResponse } from "next/server";
import {
  WebhookReceiver,
  WebhookEvent,
  EgressClient,
  RoomServiceClient,
} from "livekit-server-sdk";
import { GCPUpload, EncodedFileOutput } from "@livekit/protocol";
import { Storage } from "@google-cloud/storage";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { meetings } from "@/db/schema";
// import { inngest } from "@/inngest/client";

// Initialize EgressClient for recording
const egressClient = new EgressClient(
  process.env.LIVEKIT_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

// Initialize RoomServiceClient for room management
const roomClient = new RoomServiceClient(
  process.env.LIVEKIT_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

// Lazily initialized Google Cloud Storage client
let storageClient: Storage | null = null;

function getStorageClient(): Storage | null {
  if (storageClient) return storageClient;

  const credentialsJson = process.env.GCS_CREDENTIALS_JSON;
  if (!credentialsJson) {
    console.warn("GCS_CREDENTIALS_JSON not configured; signed URLs disabled");
    return null;
  }

  try {
    const credentials = JSON.parse(credentialsJson);
    storageClient = new Storage({
      projectId: credentials.project_id,
      credentials,
    });
    return storageClient;
  } catch (error) {
    console.error("Failed to parse GCS_CREDENTIALS_JSON:", error);
    return null;
  }
}

async function generateSignedRecordingUrl(recordingPath: string | null) {
  if (!recordingPath) return null;

  const storage = getStorageClient();
  const bucket = process.env.GCS_BUCKET;

  if (!storage || !bucket) {
    console.warn("Missing GCS configuration; cannot generate signed URL");
    return null;
  }

  let objectPath = recordingPath;

  if (recordingPath.startsWith("gs://")) {
    const withoutProtocol = recordingPath.slice(5);
    const firstSlash = withoutProtocol.indexOf("/");
    objectPath = firstSlash === -1 ? "" : withoutProtocol.slice(firstSlash + 1);
  } else if (recordingPath.startsWith("http")) {
    try {
      const url = new URL(recordingPath);
      const decoded = decodeURIComponent(url.pathname);
      if (decoded.includes("/o/")) {
        objectPath = decoded.split("/o/").pop() ?? "";
      } else {
        objectPath = decoded.replace(/^\//, "");
      }
    } catch (error) {
      console.warn("Failed to parse recording URL for signed URL generation", {
        recordingPath,
        error,
      });
      return null;
    }
  } else if (recordingPath.startsWith(`${bucket}/`)) {
    objectPath = recordingPath.slice(bucket.length + 1);
  }

  if (!objectPath) {
    console.warn("Unable to derive object path for recording", {
      recordingPath,
    });
    return null;
  }

  const file = storage.bucket(bucket).file(objectPath);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      console.warn("Recording file does not exist in GCS", {
        bucket,
        objectPath,
      });
      return null;
    }

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return signedUrl;
  } catch (error) {
    console.error("Failed to generate signed URL for recording", {
      bucket,
      objectPath,
      error,
    });
    return null;
  }
}

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

    // Handle different LiveKit events
    switch (event.event) {
      // case "room_started":
      //   await handleRoomStarted(event);
      //   break;

      case "room_finished":
        await handleRoomFinished(event);
        break;

      case "participant_joined":
        await handleParticipantJoined(event);
        break;

      case "participant_left":
        await handleParticipantLeft(event);
        break;

      // case "track_published":
      //   await handleTrackPublished(event);
      //   break;

      // case "track_unpublished":
      //   await handleTrackUnpublished(event);
      //   break;

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
// async function handleRoomStarted(event: WebhookEvent) {}

async function handleRoomFinished(event: WebhookEvent) {
  const roomName = event.room?.name;
  if (!roomName) {
    console.log("No room name in room_finished event");
    return;
  }

  try {
    // Get the egress ID for this room
    const [meeting] = await db
      .select({ egressId: meetings.egressId })
      .from(meetings)
      .where(eq(meetings.id, roomName));

    if (!meeting?.egressId) {
      console.log(`No active recording found for room: ${roomName}`);
      return;
    }

    // Update meeting status
    await db
      .update(meetings)
      .set({
        endedAt: new Date(),
        status: "processing",
        egressId: null,
      })
      .where(eq(meetings.id, roomName));
  } catch (error) {
    console.error("Failed to stop recording:", error);
  }
}

async function handleParticipantJoined(event: WebhookEvent) {
  const roomName = event.room?.name;
  const participant = event.participant;

  if (!roomName || !participant) {
    console.log(
      "Missing room name or participant info in participant_joined event"
    );
    return;
  }

  // Skip if this is an agent (LiveKit agents typically have specific identity patterns)
  // Agents usually have identity like "agent-*" or specific metadata
  if (
    participant.identity?.startsWith("agent-") ||
    participant.identity?.includes("agent")
  ) {
    return;
  }

  // Check if recording is already started for this room
  const [existingMeeting] = await db
    .select({
      egressId: meetings.egressId,
      userId: meetings.userId,
      meetingId: meetings.id,
    })
    .from(meetings)
    .where(eq(meetings.id, roomName));

  if (existingMeeting?.egressId) {
    console.log(`Recording already active for room: ${roomName}`);
    return;
  }

  // Check if we have GCS configuration
  const bucket = process.env.GCS_BUCKET;
  const credentialsJson = process.env.GCS_CREDENTIALS_JSON;

  if (!bucket || !credentialsJson) {
    console.warn(
      "GCS configuration missing. Set GCS_BUCKET and GCS_CREDENTIALS_JSON to enable recording."
    );
    return;
  }

  try {
    const prefix = process.env.GCS_OUTPUT_PREFIX || "recordings";

    const path = `${prefix}/${existingMeeting.userId}/${roomName}`;

    // Create GCP upload configuration
    const gcpUpload = new GCPUpload({
      bucket: bucket,
      credentials: credentialsJson,
    });

    // Create encoded file output
    const fileOutput = new EncodedFileOutput({
      fileType: 1, // MP4
      filepath: `${path}.mp4`,
      output: { case: "gcp", value: gcpUpload },
    });

    // Start room composite egress to GCS
    const egressInfo = await egressClient.startRoomCompositeEgress(
      roomName,
      fileOutput,
      "grid"
    );

    // Store egress ID in database for this meeting
    await db
      .update(meetings)
      .set({
        egressId: egressInfo.egressId,
        status: "active",
        startedAt: new Date(),
      })
      .where(eq(meetings.id, roomName));
  } catch (error) {
    console.error("Failed to start recording:", error);
  }
}

async function handleParticipantLeft(event: WebhookEvent) {
  const roomName = event.room?.name;
  const participant = event.participant;

  if (!roomName || !participant) {
    console.log(
      "Missing room name or participant info in participant_left event"
    );
    return;
  }

  // Skip if this is an agent leaving
  if (
    participant.identity?.startsWith("agent-") ||
    participant.identity?.includes("agent")
  ) {
    return;
  }

  // For most use cases, when a human participant leaves, we want to end the meeting immediately
  // This avoids race conditions and API errors when checking remaining participants
  try {
    // Try to delete the room, which will trigger room_finished event and stop recording
    await roomClient.deleteRoom(roomName);
  } catch (error) {
    // Handle common error cases gracefully
    const errorObj = error as { code?: string; status?: number };
    if (errorObj?.code === "not_found" || errorObj?.status === 404) {
    } else {
      console.error(`Failed to delete room ${roomName}:`, error);
    }

    // Even if room deletion fails, we should still stop the recording
    try {
    } catch (dbError) {
      console.error(
        `Failed to manually stop recording for room ${roomName}:`,
        dbError
      );
    }
  }
}

// async function handleTrackPublished(_event: WebhookEvent) {
//   // Handle track published event if needed
//   // Example: Log when audio/video tracks are published
// }

// async function handleTrackUnpublished(_event: WebhookEvent) {
//   // Handle track unpublished event if needed
//   // Example: Log when audio/video tracks are unpublished
// }

async function handleEgressStarted(event: WebhookEvent) {
  const egressId = event.egressInfo?.egressId;
  const roomName = event.egressInfo?.roomName;

  if (!egressId || !roomName) {
    console.log("Missing egress info in egress_started event");
    return;
  }
}

async function handleEgressEnded(event: WebhookEvent) {
  const egressId = event.egressInfo?.egressId;
  const roomName = event.egressInfo?.roomName;
  const fileResults = event.egressInfo?.fileResults;

  if (!egressId || !roomName) {
    console.log("Missing egress info in egress_ended event");
    return;
  }

  // Extract the recording URL from file results
  let recordingUrl: string | null = null;
  let signedUrl: string | null = null;

  if (fileResults && fileResults.length > 0) {
    recordingUrl = fileResults[0].location || fileResults[0].filename;

    if (!recordingUrl) {
      console.warn("Egress ended without a recording location", {
        roomName,
        egressId,
      });
    } else {
      signedUrl = await generateSignedRecordingUrl(recordingUrl);
    }
  }

  try {
    // Update the meeting with recording URL and final status
    await db
      .update(meetings)
      .set({
        recordingUrl: signedUrl ?? recordingUrl,
        endedAt: new Date(),
        status: "processing",
      })
      .where(eq(meetings.id, roomName));
  } catch (error) {
    console.error("Failed to update meeting with recording URL:", error);
  }
}
