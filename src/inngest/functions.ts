import { StreamTranscriptItem } from "@/app/modules/meetings/types";
import { db } from "@/db";
import { agents, meetings, resume, user } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { eq, inArray } from "drizzle-orm";
import { createAgent, gemini, TextMessage } from "@inngest/agent-kit";

import JSONL from "jsonl-parse-stringify";
import { TRPCError } from "@trpc/server";
import { generativeVisionModel } from "@/lib/visionAi";

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
  model: gemini({
    model: "gemini-1.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
  }),
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

export const resumeProcessingGoggleAi = inngest.createFunction(
  { id: "resume/analysis" },
  { event: "resume/analysis" },
  async ({ event, step }) => {
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

    const feedback = await step.run("get-response", async () => {
      const filePart = {
        fileData: {
          fileUri: event.data.image, // Use the actual image from event data
          mimeType: "image/png", // Changed to png as your images are typically png
        },
      };
      const textPart = {
        text: prepareInstructions({
          jobTitle: event.data.jobTitle,
          jobDescription: event.data.jobDescription,
        }),
      };
      const request = {
        contents: [{ role: "user", parts: [textPart, filePart] }],
      };
      const streamingResult = await generativeVisionModel.generateContentStream(
        request
      );

      const aggregatedResponse = await streamingResult.response;
      console.log(aggregatedResponse.candidates?.at(0)?.content.parts[0].text);

      return aggregatedResponse.candidates?.at(0)?.content.parts[0].text;
    });

    await step.run("save-feedback", async () => {
      if (!feedback) {
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
        // Clean the AI response by removing markdown code blocks
        let cleanedFeedback = feedback;
        if (feedback.includes("```json")) {
          // Remove ```json and ``` markers
          cleanedFeedback = feedback
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "")
            .trim();
        } else if (feedback.includes("```")) {
          // Remove generic ``` markers
          cleanedFeedback = feedback.replace(/```\s*/g, "").trim();
        }

        // Parse the cleaned AI response as JSON
        const feedbackData = JSON.parse(cleanedFeedback);

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
