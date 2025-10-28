import { NextResponse } from "next/server";
import {
  AccessToken,
  type AccessTokenOptions,
  type VideoGrant,
} from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { meetingGetOne, MeetingStatus } from "@/app/modules/meetings/types";
import { meetings, user } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { TRPCError } from "@trpc/server";

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// don't cache the results
export const revalidate = 0;

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export async function POST(req: Request) {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error("LIVEKIT_URL is not defined");
    }
    if (API_KEY === undefined) {
      throw new Error("LIVEKIT_API_KEY is not defined");
    }
    if (API_SECRET === undefined) {
      throw new Error("LIVEKIT_API_SECRET is not defined");
    }

    // Parse agent configuration from request body
    const body = await req.json();
    const meetingData: meetingGetOne | undefined = body?.meetingData;
    if (!meetingData)
      return new TRPCError({
        code: "NOT_FOUND",
        message: "issue in getting meetingData",
      });

    const [previousMeetingSummary] = await db
      .select({ transcribe: meetings.transcrible })
      .from(meetings)
      .where(
        and(
          eq(meetings.agentId, meetingData.agentId),
          eq(meetings.status, MeetingStatus.Complete),
          eq(meetings.userId, meetingData.userId)
        )
      );

    // Generate participant token
    const participantName = meetingData.user.name;
    const participantIdentity = meetingData?.userId;
    const roomName = meetingData?.id;

    const instructions = meetingData.agent.instruction;

    const metadata = JSON.stringify({
      instructions,
      context: {
        careerField: meetingData.user.careerPath,
        idealJob: meetingData.user.idealJob,
        targetCompany: meetingData.user.targetCompany,
        previousComapny: meetingData.user.previousJob,
      },
      pastSummary: previousMeetingSummary?.transcribe,
    });

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName,
      metadata
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken: participantToken,
      participantName,
    };
    const headers = new Headers({
      "Cache-Control": "no-store",
    });
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  agentMetadata?: string
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: "15m",
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  // Attach agent dispatch and metadata if an agent name is provided
  if (agentMetadata) {
    at.roomConfig = new RoomConfiguration({
      metadata: agentMetadata,
      agents: [
        new RoomAgentDispatch({
          metadata: agentMetadata,
        }),
      ],
      departureTimeout: 180,
      emptyTimeout: 5,
    });
  } else {
    at.roomConfig = new RoomConfiguration({
      metadata: agentMetadata,
      agents: [new RoomAgentDispatch()],
      emptyTimeout: 5,
    });
  }

  return at.toJwt();
}
