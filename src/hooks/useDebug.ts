import * as React from "react";
import { LogLevel, setLogLevel, Room } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";

// Extend the Window interface to include LiveKit debugging properties
declare global {
  interface Window {
    __lk_room?: Room;
  }
}

export const useDebugMode = (
  options: { logLevel?: LogLevel; enabled?: boolean } = {}
) => {
  const room = useRoomContext();
  const logLevel = options.logLevel ?? "debug";
  const enabled = options.enabled ?? true;

  React.useEffect(() => {
    if (!enabled) {
      setLogLevel("silent");
      return;
    }

    setLogLevel(logLevel ?? "debug");

    window.__lk_room = room;

    return () => {
      window.__lk_room = undefined;
      setLogLevel("silent");
    };
  }, [room, enabled, logLevel]);
};
