import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Channel as StreamChannel } from "stream-chat";

import {
  useCreateChatClient,
  Chat,
  Channel,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import { useTRPC } from "@/trpc/client";
import { LoadingState } from "@/components/loading-state";

import "stream-chat-react/dist/css/v2/index.css";

interface Props {
  meetingId: string;
  meetingName: string;
  userId: string;
  userName: string;
  userImage: string | undefined;
}

export const ChatUI = ({
  meetingId,
  meetingName,
  userName,
  userId,
  userImage,
}: Props) => {
  const trpc = useTRPC();
  const { mutateAsync: genrateChatToken } = useMutation(
    trpc.meetings.generateChatToken.mutationOptions()
  );

  const [channel, setChannel] = useState<StreamChannel>();

  const client = useCreateChatClient({
    apiKey: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY!,
    tokenOrProvider: genrateChatToken,
    userData: { id: userId, name: userName, image: userImage },
  });
  useEffect(() => {
    if (!client) return;

    const initializeChannel = async () => {
      try {
        // Create or get the channel with proper configuration
        const channel = client.channel("messaging", meetingId, {
          members: [userId],
          created_by_id: userId,
        });

        // Watch the channel to ensure it's created and available
        await channel.watch();
        setChannel(channel);
      } catch (error) {
        console.error("Error creating/joining channel:", error);
        
        // Fallback: try to get existing channel
        try {
          const existingChannel = client.channel("messaging", meetingId);
          await existingChannel.watch();
          setChannel(existingChannel);
        } catch (fallbackError) {
          console.error("Fallback channel creation failed:", fallbackError);
        }
      }
    };

    initializeChannel();
  }, [client, meetingId, meetingName, userId]);

  if (!client) {
    return (
      <LoadingState title="Loading State" description="This may take a while" />
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <Chat client={client}>
        <Channel channel={channel}>
          <Window>
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-23rem)] border-b">
              <MessageList />
            </div>
            <MessageInput />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};
