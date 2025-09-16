import "server-only";

import { StreamChat } from "stream-chat";

const STREAM_CHAT_API_KEY = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;
const STREAM_CHAT_SECRET_KEY = process.env.STREAM_CHAT_SECRET_KEY;

if (!STREAM_CHAT_API_KEY || !STREAM_CHAT_SECRET_KEY) {
  console.error(
    "[stream-chat] Missing NEXT_PUBLIC_STREAM_CHAT_API_KEY or STREAM_CHAT_SECRET_KEY env vars. Chat/AI responses may fail."
  );
}

export const streamChat = StreamChat.getInstance(
  STREAM_CHAT_API_KEY!,
  STREAM_CHAT_SECRET_KEY!
);
