"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  type AgentState,
  ChatEntry,
  type ReceivedChatMessage,
  useRoomContext,
  useVoiceAssistant,
} from "@livekit/components-react";

import useChatAndTranscription from "@/hooks/useChatAndTranscription";
import { useDebugMode } from "@/hooks/useDebug";
import type { AppConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toastAlert } from "./alert-toast";
import { AgentControlBar } from "./livekit/agent-control-bar/agent-control-bar";
import { ChatMessageView } from "./livekit/chat/chat-message-view";
import { MediaTiles } from "./livekit/media-tiles";

function isAgentAvailable(agentState: AgentState) {
  return (
    agentState == "listening" ||
    agentState == "thinking" ||
    agentState == "speaking"
  );
}

interface SessionViewProps {
  appConfig: AppConfig;
  disabled: boolean;
  sessionStarted: boolean;
}

export const SessionView = ({
  appConfig,
  disabled,
  sessionStarted,
  ref,
}: React.ComponentProps<"div"> & SessionViewProps) => {
  const { state: agentState } = useVoiceAssistant();
  const [chatOpen, setChatOpen] = useState(false);
  const { messages, send } = useChatAndTranscription();
  const room = useRoomContext();

  useDebugMode({
    enabled: process.env.NODE_END !== "production",
  });

  async function handleSendMessage(message: string) {
    await send(message);
  }

  useEffect(() => {
    if (sessionStarted) {
      const timeout = setTimeout(() => {
        if (!isAgentAvailable(agentState)) {
          const reason =
            agentState === "connecting"
              ? "Agent did not join the room. "
              : "Agent connected but did not complete initializing. ";

          toastAlert({
            title: "Session ended",
            description: <p className="w-full">{reason}</p>,
          });
          room.disconnect();
        }
      }, 20_000);

      return () => clearTimeout(timeout);
    }
  }, [agentState, sessionStarted, room]);

  const { supportsChatInput, supportsVideoInput, supportsScreenShare } =
    appConfig;
  const capabilities = {
    supportsChatInput,
    supportsVideoInput,
    supportsScreenShare,
  };

  return (
    <section
      ref={ref}
      inert={disabled}
      className={cn(
        "relative min-h-screen overflow-hidden bg-[radial-gradient(130%_110%_at_50%_-10%,var(--tw-gradient-stops))] from-sidebar-accent via-sidebar/90 to-sidebar",
        "transition-opacity"
      )}
    >
      <div
        className={cn(
          "min-h-screen transition-[margin] duration-300 ease-out",
          chatOpen ? "pr-96" : "pr-0"
        )}
      >
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-36 pt-20 md:px-10 lg:px-12">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-2xl font-medium text-primary">Live Session</p>
              <h1 className="text-2xl font-semibold text-white md:text-3xl">
                Agent &amp; Participant
              </h1>
            </div>
          </header>

          <div className="flex-1">
            <MediaTiles chatOpen={chatOpen} />
          </div>
        </div>
      </div>

      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 z-60 w-96 border-l border-border/80 bg-card/90 backdrop-blur transition-transform duration-300 ease-out ",
          chatOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <ChatMessageView className="flex h-full flex-col">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="text-lg font-semibold text-foreground">Chat</h2>
            <p className="text-sm text-muted-foreground">
              Message your AI assistant in real time.
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <AnimatePresence>
              {messages.map((message: ReceivedChatMessage) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <ChatEntry hideName entry={message} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ChatMessageView>
      </aside>

      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-32 bg-gradient-to-b from-sidebar/90 via-sidebar/60 to-transparent" />

      <div className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-sidebar/95 via-sidebar/80 to-sidebar/40 px-3 pt-2 pb-3 backdrop-blur md:px-12 md:pb-12">
        <motion.div
          key="control-bar"
          initial={{ opacity: 0, translateY: "100%" }}
          animate={{
            opacity: sessionStarted ? 1 : 0,
            translateY: sessionStarted ? "0%" : "100%",
          }}
          transition={{
            duration: 0.3,
            delay: sessionStarted ? 0.5 : 0,
            ease: "easeOut",
          }}
        >
          <div className="relative z-10 mx-auto w-full max-w-3xl">
            {appConfig.isPreConnectBufferEnabled && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: sessionStarted && messages.length === 0 ? 1 : 0,
                  transition: {
                    ease: "easeIn",
                    delay: messages.length > 0 ? 0 : 0.8,
                    duration: messages.length > 0 ? 0.2 : 0.5,
                  },
                }}
                aria-hidden={messages.length > 0}
                className={cn(
                  "absolute inset-x-0 -top-12 text-center",
                  sessionStarted &&
                    messages.length === 0 &&
                    "pointer-events-none"
                )}
              >
                <p className="animate-text-shimmer inline-block !bg-clip-text text-sm font-semibold text-transparent">
                  Agent is listening, ask it a question
                </p>
              </motion.div>
            )}

            <AgentControlBar
              capabilities={capabilities}
              onChatOpenChange={setChatOpen}
              onSendMessage={handleSendMessage}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
