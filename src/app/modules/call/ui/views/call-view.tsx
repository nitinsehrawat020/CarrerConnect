"use client";
import { useEffect, useMemo, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { motion } from "motion/react";
import {
  RoomAudioRenderer,
  RoomContext,
  StartAudio,
} from "@livekit/components-react";

import { Toaster } from "@/components/ui/sonner";

import useConnectionDetails from "@/hooks/useConnectionDetails";
import type { AppConfig } from "@/lib/types";
import { toastAlert } from "../components/alert-toast";
import { SessionView } from "../components/session-view";
import { Welcome } from "../components/welcome";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { redirect } from "next/navigation";

const MotionWelcome = motion.create(Welcome);
const MotionSessionView = motion.create(SessionView);

interface AppProps {
  appConfig: AppConfig;
  meetingId: string;
}

export const CallView = ({ appConfig, meetingId }: AppProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: meetingData } = useSuspenseQuery(
    trpc.meetings.getOne.queryOptions({ id: meetingId })
  );

  const room = useMemo(() => new Room(), []);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const { refreshConnectionDetails, existingOrRefreshConnectionDetails } =
    useConnectionDetails(appConfig, meetingData);

  // Proactively warn if the page isn't in a secure context (required for mic/camera)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hostname = window.location.hostname;
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(hostname);
    const isSecure = window.isSecureContext || isLocalhost;
    if (!isSecure) {
      toastAlert({
        title: "Media devices blocked in insecure context",
        description:
          "Camera and microphone require HTTPS or localhost. Open this site via https://… or http://localhost in development.",
      });
    }
  }, []);

  useEffect(() => {
    const onDisconnected = () => {
      setSessionStarted(false);
      refreshConnectionDetails();

      handleMeetingEnd();
    };
    const handleMeetingEnd = async () => {
      queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
      redirect("/meetings");
    };
    const onMediaDevicesError = (error: Error) => {
      toastAlert({
        title: "Encountered an error with your media devices",
        description: `${error.name}: ${error.message}`,
      });
    };

    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
    };
  }, [room, refreshConnectionDetails]);

  useEffect(() => {
    let aborted = false;
    if (sessionStarted && room.state === "disconnected") {
      Promise.all([
        room.localParticipant.setMicrophoneEnabled(micEnabled, undefined, {
          preConnectBuffer: appConfig.isPreConnectBufferEnabled,
        }),
        room.localParticipant.setCameraEnabled(videoEnabled),
        existingOrRefreshConnectionDetails().then((connectionDetails) =>
          room.connect(
            connectionDetails.serverUrl,
            connectionDetails.participantToken
          )
        ),
      ]).catch((error) => {
        if (aborted) {
          // Once the effect has cleaned up after itself, drop any errors
          //
          // These errors are likely caused by this effect rerunning rapidly,
          // resulting in a previous run `disconnect` running in parallel with
          // a current run `connect`
          return;
        }

        toastAlert({
          title: "There was an error connecting to the agent",
          description: `${error.name}: ${error.message}`,
        });
      });
    }
    return () => {
      aborted = true;
      room.disconnect();
    };
  }, [
    room,
    sessionStarted,
    micEnabled,
    videoEnabled,
    appConfig.isPreConnectBufferEnabled,
    existingOrRefreshConnectionDetails,
  ]);

  const { startButtonText } = appConfig;

  return (
    <main>
      <MotionWelcome
        key="welcome"
        startButtonText={startButtonText}
        onStartCall={(micEnabled, videoEnabled) => {
          setMicEnabled(micEnabled);
          setVideoEnabled(videoEnabled);
          setSessionStarted(true);
        }}
        disabled={sessionStarted}
        initial={{ opacity: 1 }}
        animate={{ opacity: sessionStarted ? 0 : 1 }}
        meetingId={meetingId}
        transition={{
          duration: 0.5,
          ease: "linear",
          delay: sessionStarted ? 0 : 0.5,
        }}
      />

      <RoomContext.Provider value={room}>
        <RoomAudioRenderer />
        <StartAudio label="Start Audio" />
        {/* --- */}
        <MotionSessionView
          key="session-view"
          appConfig={appConfig}
          disabled={!sessionStarted}
          sessionStarted={sessionStarted}
          initial={{ opacity: 0 }}
          animate={{ opacity: sessionStarted ? 1 : 0 }}
          transition={{
            duration: 0.5,
            ease: "linear",
            delay: sessionStarted ? 0.5 : 0,
          }}
        />
      </RoomContext.Provider>

      <Toaster />
    </main>
  );
};
