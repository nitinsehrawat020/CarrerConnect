import "server-only";

import { StreamClient } from "@stream-io/node-sdk";

const STREAM_VIDEO_API_KEY = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const STREAM_VIDEO_SECRET_KEY = process.env.STREAM_VIDEO_SECRET_KEY;

if (!STREAM_VIDEO_API_KEY || !STREAM_VIDEO_SECRET_KEY) {
  // Log once on module load to surface misconfiguration in production
  console.error(
    "[stream-video] Missing NEXT_PUBLIC_STREAM_VIDEO_API_KEY or STREAM_VIDEO_SECRET_KEY env vars. AI calls and transcription will fail."
  );
}

export const streamVideo = new StreamClient(
  STREAM_VIDEO_API_KEY!,
  STREAM_VIDEO_SECRET_KEY!
);
