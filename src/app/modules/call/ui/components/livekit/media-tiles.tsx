import React, { useMemo } from "react";
import { Track } from "livekit-client";
import { AnimatePresence, motion } from "motion/react";
import {
  type TrackReference,
  useLocalParticipant,
  useTracks,
  useVoiceAssistant,
} from "@livekit/components-react";
import { cn } from "@/lib/utils";
import { AgentTile } from "./agent-tile";
import { AvatarTile } from "./avatar-tile";
import { VideoTile } from "./video-tile";

const MotionVideoTile = motion.create(VideoTile);
const MotionAgentTile = motion.create(AgentTile);
const MotionAvatarTile = motion.create(AvatarTile);

const animationProps = {
  initial: {
    opacity: 0,
    scale: 0,
  },
  animate: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0,
  },
  transition: {
    type: "spring" as const,
    stiffness: 675,
    damping: 75,
    mass: 1,
  },
};

export function useLocalTrackRef(source: Track.Source) {
  const { localParticipant } = useLocalParticipant();
  const publication = localParticipant.getTrackPublication(source);
  const trackRef = useMemo<TrackReference | undefined>(
    () =>
      publication
        ? { source, participant: localParticipant, publication }
        : undefined,
    [source, publication, localParticipant]
  );
  return trackRef;
}

interface MediaTilesProps {
  chatOpen: boolean;
}

export function MediaTiles({ chatOpen }: MediaTilesProps) {
  const {
    state: agentState,
    audioTrack: agentAudioTrack,
    videoTrack: agentVideoTrack,
  } = useVoiceAssistant();
  const [screenShareTrack] = useTracks([Track.Source.ScreenShare]);
  const cameraTrack: TrackReference | undefined = useLocalTrackRef(
    Track.Source.Camera
  );

  const isCameraEnabled = cameraTrack && !cameraTrack.publication.isMuted;
  const isScreenShareEnabled =
    screenShareTrack && !screenShareTrack.publication.isMuted;

  const transition = {
    ...animationProps.transition,
    delay: chatOpen ? 0 : 0.15,
  };

  const isAvatar = agentVideoTrack !== undefined;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center px-6 py-12">
      <div
        className={cn(
          "grid w-full max-w-6xl gap-6 transition-all duration-300",
          "grid-cols-1 md:grid-cols-2"
        )}
      >
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/70 p-8 shadow-lg backdrop-blur">
          <AnimatePresence mode="popLayout">
            {!isAvatar && (
              <MotionAgentTile
                key="agent"
                layoutId="agent"
                {...animationProps}
                transition={transition}
                state={agentState}
                audioTrack={agentAudioTrack}
                className="w-full max-w-sm flex justify-center items-center"
              />
            )}
            {isAvatar && (
              <MotionAvatarTile
                key="avatar"
                layoutId="avatar"
                {...animationProps}
                transition={transition}
                videoTrack={agentVideoTrack}
                className="w-full max-w-sm [&>video]:h-auto [&>video]:w-full"
              />
            )}
          </AnimatePresence>
          <p className="mt-6 text-xl font-semibold text-muted-foreground">
            AI Agent
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/70 p-8 shadow-lg backdrop-blur">
          <AnimatePresence mode="wait">
            {cameraTrack && isCameraEnabled && (
              <MotionVideoTile
                key="camera"
                layout="position"
                layoutId="camera"
                {...animationProps}
                trackRef={cameraTrack}
                transition={transition}
                className="w-full max-w-sm overflow-hidden rounded-xl"
              />
            )}
            {isScreenShareEnabled && (
              <MotionVideoTile
                key="screen"
                layout="position"
                layoutId="screen"
                {...animationProps}
                trackRef={screenShareTrack}
                transition={transition}
                className="w-full max-w-lg overflow-hidden rounded-xl"
              />
            )}
            {!isCameraEnabled && !isScreenShareEnabled && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex h-36 w-36 items-center justify-center rounded-full bg-primary/15 text-primary"
              >
                <span className="text-4xl font-semibold">
                  {cameraTrack?.participant.name?.charAt(0).toUpperCase() ||
                    "U"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="mt-6 text-xl font-semibold text-muted-foreground">
            {cameraTrack?.participant.name || "You"}
          </p>
        </div>
      </div>
    </div>
  );
}
