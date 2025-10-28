import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import GeneratedAvatar from "@/components/generated-avatar";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import Image from "next/image";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

interface WelcomeProps {
  disabled: boolean;
  startButtonText: string;
  onStartCall: (micEnabled: boolean, videoEnabled: boolean) => void;
  meetingId: string;
}

export const Welcome = ({
  disabled,
  startButtonText,
  onStartCall,
  ref,
  meetingId,
}: React.ComponentProps<"div"> & WelcomeProps) => {
  const [micEnabled, setMicEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const trpc = useTRPC();

  const { data: data } = useSuspenseQuery(
    trpc.meetings.getOne.queryOptions({ id: meetingId })
  );

  const handleStartCall = () => {
    onStartCall(micEnabled, videoEnabled);
  };
  console.log(data.user.image);

  return (
    <section
      ref={ref}
      inert={disabled}
      className={cn(
        "bg-radial from-sidebar-accent to-sidebar fixed inset-0 mx-auto flex h-svh flex-col items-center justify-center text-center gap-4",
        disabled ? "z-10" : "z-20"
      )}
    >
      <div className="bg-white/15 flex justify-center items-center flex-col p-20 rounded-xl gap-4 max-md:p-7">
        <div className="flex flex-row justify-center items-center gap-1 w-[200px] ">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-white size-16 border-1 border-white rounded-full px-2 flex items-center justify-center"
          >
            <path
              d="M15 24V40C15 40.7957 14.6839 41.5587 14.1213 42.1213C13.5587 42.6839 12.7956 43 12 43C11.2044 43 10.4413 42.6839 9.87868 42.1213C9.31607 41.5587 9 40.7957 9 40V24C9 23.2044 9.31607 22.4413 9.87868 21.8787C10.4413 21.3161 11.2044 21 12 21C12.7956 21 13.5587 21.3161 14.1213 21.8787C14.6839 22.4413 15 23.2044 15 24ZM22 5C21.2044 5 20.4413 5.31607 19.8787 5.87868C19.3161 6.44129 19 7.20435 19 8V56C19 56.7957 19.3161 57.5587 19.8787 58.1213C20.4413 58.6839 21.2044 59 22 59C22.7956 59 23.5587 58.6839 24.1213 58.1213C24.6839 57.5587 25 56.7957 25 56V8C25 7.20435 24.6839 6.44129 24.1213 5.87868C23.5587 5.31607 22.7956 5 22 5ZM32 13C31.2044 13 30.4413 13.3161 29.8787 13.8787C29.3161 14.4413 29 15.2044 29 16V48C29 48.7957 29.3161 49.5587 29.8787 50.1213C30.4413 50.6839 31.2044 51 32 51C32.7956 51 33.5587 50.6839 34.1213 50.1213C34.6839 49.5587 35 48.7957 35 48V16C35 15.2044 34.6839 14.4413 34.1213 13.8787C33.5587 13.3161 32.7956 13 32 13ZM42 21C41.2043 21 40.4413 21.3161 39.8787 21.8787C39.3161 22.4413 39 23.2044 39 24V40C39 40.7957 39.3161 41.5587 39.8787 42.1213C40.4413 42.6839 41.2043 43 42 43C42.7957 43 43.5587 42.6839 44.1213 42.1213C44.6839 41.5587 45 40.7957 45 40V24C45 23.2044 44.6839 22.4413 44.1213 21.8787C43.5587 21.3161 42.7957 21 42 21ZM52 17C51.2043 17 50.4413 17.3161 49.8787 17.8787C49.3161 18.4413 49 19.2044 49 20V44C49 44.7957 49.3161 45.5587 49.8787 46.1213C50.4413 46.6839 51.2043 47 52 47C52.7957 47 53.5587 46.6839 54.1213 46.1213C54.6839 45.5587 55 44.7957 55 44V20C55 19.2044 54.6839 18.4413 54.1213 17.8787C53.5587 17.3161 52.7957 17 52 17Z"
              fill="currentColor"
            />
          </svg>
          <div className="h-1 flex-1 bg-white"></div>
          {data.user.image === "" ? (
            <Image
              src={data.user.image}
              alt="user image"
              className="size-17 rounded-full"
            />
          ) : (
            <GeneratedAvatar
              varient="initials"
              seed={data.user.name}
              className="size-15"
            />
          )}
        </div>

        <p className="text-white max-w-prose pt-1 leading-6 font-medium">
          Interact live with your Carrer&#39;s AI agent
        </p>

        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            className={cn(
              "flex items-center justify-center size-12 rounded-full transition-colors",
              micEnabled
                ? "bg-white/20 hover:bg-white/30 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            )}
            aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {micEnabled ? (
              <Mic className="size-6" />
            ) : (
              <MicOff className="size-6" />
            )}
          </button>

          <button
            onClick={() => setVideoEnabled(!videoEnabled)}
            className={cn(
              "flex items-center justify-center size-12 rounded-full transition-colors",
              videoEnabled
                ? "bg-white/20 hover:bg-white/30 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            )}
            aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {videoEnabled ? (
              <Video className="size-6" />
            ) : (
              <VideoOff className="size-6" />
            )}
          </button>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleStartCall}
          className="mt-2 w-64 font-mono"
        >
          {startButtonText}
        </Button>
      </div>
    </section>
  );
};
