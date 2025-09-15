import { StreamTranscriptItem } from "@/app/modules/meetings/types";
import { db } from "@/db";
import { agents, meetings, resume, user } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { eq, inArray } from "drizzle-orm";
import { createAgent, openai, TextMessage } from "@inngest/agent-kit";
import Groq from "groq-sdk";

import JSONL from "jsonl-parse-stringify";
import { TRPCError } from "@trpc/server";

// const token = process.env.GITHUB_TOKEN;
// const endpoint = "https://models.github.ai/inference";
// const model = "openai/gpt-5";

// Initialize Groq with API key from environment; throw early if not set
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY environment variable.");
}
const groq = new Groq({ apiKey: GROQ_API_KEY });

const summarizer = createAgent({
  name: "summarizer",
  system:
    `You are an expert summarizer. You write readable, concise, simple content. You are given a transcript of a meeting and you need to summarize it.

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
- Mention of integration with Z`.trim(),
  model: openai({ model: "o3-mini", apiKey: process.env.OPENAI_API_KEY }),
});
export const meetingsProcessing = inngest.createFunction(
  { id: "meetings/processing" },
  { event: "meetings/processing" },
  async ({ event, step }) => {
    const response = await step.run("fetch-transcript", async () => {
      return fetch(event.data.transcriptUrl).then((res) => res.text());
    });

    const transcript = await step.run("parse-transcript", async () => {
      return JSONL.parse<StreamTranscriptItem>(response);
    });

    const transcriptWithSpeaker = await step.run("add-speakers", async () => {
      const speakerIds = [
        ...new Set(transcript.map((item) => item.speaker_id)),
      ];
      const userSpeaker = await db
        .select()
        .from(user)
        .where(inArray(user.id, speakerIds))
        .then((users) => users.map((user) => ({ ...user })));
      const agentsSpeaker = await db
        .select()
        .from(agents)
        .where(inArray(agents.id, speakerIds))
        .then((agents) => agents.map((agent) => ({ ...agent })));

      const speakers = [...userSpeaker, ...agentsSpeaker];

      return transcript.map((items) => {
        const speaker = speakers.find(
          (speaker) => speaker.id === items.speaker_id
        );

        if (!speaker) {
          return { ...items, user: { name: "unknow" } };
        }

        return { ...items, user: { name: speaker.name } };
      });
    });
    const { output } = await summarizer.run(
      "Summarize the following transcript:" +
        JSON.stringify(transcriptWithSpeaker)
    );

    await step.run("save-summary", async () => {
      await db
        .update(meetings)
        .set({
          summary: (output[0] as TextMessage).content as string,
          status: "completed",
        })
        .where(eq(meetings.id, event.data.meetingId));
    });
  }
);

export const AIResponseFormat = `
      interface Feedback {
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
}: {
  jobTitle: unknown;
  jobDescription: unknown;
}) =>
  `You are an expert in ATS (Applicant Tracking System) and resume analysis.
      Please analyze and rate this resume and suggest how to improve it.
      The rating can be low if the resume is bad.
      Be thorough and detailed. Don't be afraid to point out any mistakes or areas for improvement.
      If there is a lot to improve, don't hesitate to give low scores. This is to help the user to improve their resume.
      If available, use the job description for the job user is applying to to give more detailed feedback.
      If provided, take the job description into consideration.
      The job title is: ${jobTitle}
      The job description is: ${jobDescription}
      Provide the feedback using the following format:
      ${AIResponseFormat}
      Return the analysis as an JSON object, without any other text and without the backticks.
      Do not include any other text or comments.`;

export const resumeProcessing = inngest.createFunction(
  { id: "resume/processing" },
  { event: "resume/processing" },
  async ({ event, step }) => {
    // Step 1: Update status to converting
    await step.run("update-status-converting", async () => {
      await db
        .update(resume)
        .set({
          status: "converting",
          updatedAt: new Date(),
        })
        .where(eq(resume.id, event.data.resumeId));
    });

    // Step 2: Update status to analyzing
    await step.run("update-status-analyzing", async () => {
      await db
        .update(resume)
        .set({
          status: "analyzing",
          updatedAt: new Date(),
        })
        .where(eq(resume.id, event.data.resumeId));
    });

    // Step 3: Get AI response
    const feedback = await step.run("get-response", async () => {
      if (!GROQ_API_KEY) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "GROQ_API_KEY is not configured",
        });
      }
      const response = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prepareInstructions({
                  jobTitle: event.data.jobTitle,
                  jobDescription: event.data.jobDescription,
                }),
              },
              { type: "image_url", image_url: { url: event.data.image } },
            ],
          },
        ],
        // Use a valid Groq model; update as needed
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
      });
      return response;
    });

    const aiContent = feedback.choices.at(0)?.message?.content;

    // Step 4: Save feedback and mark as completed
    await step.run("save-feedback", async () => {
      if (!aiContent) {
        // Mark as failed if no content received
        await db
          .update(resume)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(resume.id, event.data.resumeId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No content received from AI",
        });
      }

      try {
        // Parse the AI response as JSON
        const feedbackData = JSON.parse(aiContent);

        // Save the feedback and mark as completed
        await db
          .update(resume)
          .set({
            feedback: feedbackData,
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(resume.id, event.data.resumeId));

        console.log("Successfully saved feedback to database");
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);

        // Mark as failed if parsing fails
        await db
          .update(resume)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(resume.id, event.data.resumeId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse AI feedback response",
        });
      }
    });

    return { success: true };
  }
);
