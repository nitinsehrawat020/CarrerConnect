import { cache } from "react";
import { clsx, type ClassValue } from "clsx";
import humanizeDuration from "humanize-duration";
import { twMerge } from "tailwind-merge";

import { Room } from "livekit-client";

import type {
  ReceivedChatMessage,
  TextStreamData,
} from "@livekit/components-react";
import { APP_CONFIG_DEFAULTS } from "../../app-config";
import type { AppConfig, SandboxConfig } from "./types";

export const CONFIG_ENDPOINT = process.env.NEXT_PUBLIC_APP_CONFIG_ENDPOINT;
export const SANDBOX_ID = process.env.SANDBOX_ID;

export const THEME_STORAGE_KEY = "theme-mode";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(second: number) {
  return humanizeDuration(second * 1000, {
    largest: 1,
    round: true,
    units: ["h", "m", "s"],
  });
}

export function transcriptionToChatMessage(
  textStream: TextStreamData,
  room: Room
): ReceivedChatMessage {
  return {
    id: textStream.streamInfo.id,
    timestamp: textStream.streamInfo.timestamp,
    message: textStream.text,
    from:
      textStream.participantInfo.identity === room.localParticipant.identity
        ? room.localParticipant
        : Array.from(room.remoteParticipants.values()).find(
            (p) => p.identity === textStream.participantInfo.identity
          ),
  };
}

// https://react.dev/reference/react/cache#caveats
// > React will invalidate the cache for all memoized functions for each server request.
export const getAppConfig = cache(
  async (headers: Headers): Promise<AppConfig> => {
    if (CONFIG_ENDPOINT) {
      const sandboxId = SANDBOX_ID ?? headers.get("x-sandbox-id") ?? "";

      try {
        if (!sandboxId) {
          throw new Error("Sandbox ID is required");
        }

        const response = await fetch(CONFIG_ENDPOINT, {
          cache: "no-store",
          headers: { "X-Sandbox-ID": sandboxId },
        });

        const remoteConfig: SandboxConfig = await response.json();
        const config: AppConfig = { sandboxId, ...APP_CONFIG_DEFAULTS };

        for (const [key, entry] of Object.entries(remoteConfig)) {
          if (entry === null) continue;
          // Only include app config entries that are declared in defaults and, if set,
          // share the same primitive type as the default value.
          if (
            (key in APP_CONFIG_DEFAULTS &&
              APP_CONFIG_DEFAULTS[key as keyof AppConfig] === undefined) ||
            (typeof config[key as keyof AppConfig] === entry.type &&
              typeof config[key as keyof AppConfig] === typeof entry.value)
          ) {
            // @ts-expect-error I'm not sure quite how to appease TypeScript, but we've thoroughly checked types above
            config[key as keyof AppConfig] =
              entry.value as AppConfig[keyof AppConfig];
          }
        }

        return config;
      } catch (error) {
        console.error("ERROR: getAppConfig() - lib/utils.ts", error);
      }
    }

    return APP_CONFIG_DEFAULTS;
  }
);

export const AIResponseFormat = `
      interface Feedback {
      summary:string;
      overallScore: number; //max 100
      ATS: {
        score: number; //rate based on ATS suitability
        tips: {
          type: "good" | "improve";
          tip: string; //give 3-4 tips
        }[];
      };
      toneAndStyle: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
      content: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
      structure: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
      skills: {
        score: number; //max 100
        tips: {
          type: "good" | "improve";
          tip: string; //make it a short "title" for the actual explanation
          explanation: string; //explain in detail here
        }[]; //give 3-4 tips
      };
    }`;

export const prepareInstructions = ({
  jobTitle,
  jobDescription,
  companyName,
}: {
  jobTitle: unknown;
  jobDescription: unknown;
  companyName?: unknown;
}) =>
  `You are an expert in ATS (Applicant Tracking System) and resume analysis.
      Please analyze and rate this resume and suggest how to improve it.
      The rating can be low if the resume is bad.
      Be thorough and detailed. Don't be afraid to point out any mistakes or areas for improvement.
      If there is a lot to improve, don't hesitate to give low scores. This is to help the user to improve their resume.
      Personalize your guidance to the target role and company when provided.
      If available, use the job description for the job the user is applying to in order to give more detailed feedback.
      Always take the job description into consideration when provided.
      
      IMPORTANT TIME CONTEXT AND DATE RULES (apply strictly):
      - Today's date (UTC) is: ${new Date().toISOString().slice(0, 10)}
      - Treat end dates labeled as "Present", "Current", or similar as ongoing roles ending at today's date. Do NOT flag these as future-dated.
      - Month/Year ranges like "Aug 2024 – Present" are valid if the end is Present. Do not mark as a future date issue.
      - Only flag a "future date" issue if a start or end date is more than 31 days AFTER today's date (UTC). Allow a 1-month grace for month-only formats.
      - If dates are ambiguous (e.g., month/year without day), assume the first day of the month and avoid false positives.
      - If you suspect a typo, provide a gentle clarification tip, but do NOT mark as a major content issue solely due to "Present"/ongoing roles.

      The job title is: ${jobTitle}
      The job description is: ${jobDescription}
      ${companyName ? `The target company is: ${companyName}` : ""}

      PERSONALIZATION & DEPTH REQUIREMENTS:
      - Tailor feedback to the target role and company (if provided): mention relevant skills, tools, and domain nuances.
      - Prioritize impact: list the most impactful tips first in each category.
      - Use concrete, measurable guidance: suggest numbers, metrics, scope, and outcomes.
      - Include one improved example bullet (where relevant) using the STAR/lightweight format and action verbs.
      - Highlight missing keywords from the job description (use exact terms) and recommend where to place them.
      - Flag red flags (e.g., unexplained large gaps, role regression) constructively with specific remedies.
      - Keep formatting advice practical: sections, headings, white space, consistency, and PDF/ATS readability.
      
      Provide the feedback using the following format:
      ${AIResponseFormat}
      Return the analysis as an JSON object, without any other text and without the backticks.
      Do not include any other text or comments.`;

export const prepareInstructionsMeeting = (transcription: JSON) => {
  return `      
        You are an expert summarizer. You write readable, concise, simple content. You are given a transcript and meeting recording link of a meeting and you need to summarize it.

        transcription :${transcription}

        Use the following markdown structure for every output:

        ### Overview
        Provide a detailed, engaging summary of the session's content. Focus on major features, user workflows, and any key takeaways. Write in a narrative style, using full sentences. Highlight unique or powerful aspects of the product, platform, or discussion.

        ### Notes
        Break down key content into thematic sections with timestamp ranges. Each section should summarize key points, actions, or demos in bullet format.

        Example:
        #### Section Name
        - Main point or demo shown here
        - Another key insight or interaction
        - Follow-up tool or explanation provided

        #### Next Section
        - Feature X automatically does Y
        - Mention of integration with Z`;
};
