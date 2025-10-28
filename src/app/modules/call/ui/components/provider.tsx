"use client";

import React from "react";
import { Room } from "livekit-client";
import { RoomContext } from "@livekit/components-react";
import { toastAlert } from "./alert-toast";
import useConnectionDetails from "@/hooks/useConnectionDetails";
import { AppConfig } from "@/lib/types";
import { meetingGetOne } from "@/app/modules/meetings/types";

export function Provider({
  appConfig,
  meetingData,
  children,
}: {
  appConfig: AppConfig;
  children: React.ReactNode;
  meetingData: meetingGetOne;
}) {
  const { connectionDetails } = useConnectionDetails(appConfig, meetingData);
  const room = React.useMemo(() => new Room(), []);

  React.useEffect(() => {
    if (room.state === "disconnected" && connectionDetails) {
      Promise.all([
        room.localParticipant.setMicrophoneEnabled(true, undefined, {
          preConnectBuffer: true,
        }),
        room.connect(
          connectionDetails.serverUrl,
          connectionDetails.participantToken
        ),
      ]).catch((error) => {
        toastAlert({
          title: "There was an error connecting to the agent",
          description: `${error.name}: ${error.message}`,
        });
      });
    }
    return () => {
      room.disconnect();
    };
  }, [room, connectionDetails]);

  return <RoomContext.Provider value={room}>{children}</RoomContext.Provider>;
}
