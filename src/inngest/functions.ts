import { db } from "@/db";
import { meetings, resume } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generativeVisionModel } from "@/lib/visionAi";
import { prepareInstructions, prepareInstructionsMeeting } from "@/lib/utils";

export const meetingsProcessing = inngest.createFunction(
  { id: "meetings/processing" },
  { event: "meetings/processing" },
  async ({ event, step }) => {
    await step.run("update-processing-db", async () => {
      await db
        .update(meetings)
        .set({ status: "processing" })
        .where(eq(meetings.id, event.data.meetingId));
    });

    await step.sleep("wait-for-db-sync", "10s");

    // Run summary and transcription correction in parallel
    const [summary, correctedTranscriptionJsonString] = await Promise.all([
      step.run("get-meeting-summary", async () => {
        const filePart = {
          fileData: {
            fileUri: event.data.recordingUrl,
            mimeType: "video/mp4",
          },
        };
        const textPart = {
          text: prepareInstructionsMeeting(event.data.transcription),
        };
        const request = {
          contents: [{ role: "user", parts: [textPart, filePart] }],
        };
        const streamingResult =
          await generativeVisionModel.generateContentStream(request);
        const aggregatedResponse = await streamingResult.response;
        return aggregatedResponse.candidates?.at(0)?.content.parts[0].text;
      }),
      step.run("update-transcription", async () => {
        const rawTranscriptionText = event.data.transcription;
        const prompt = `
          You are an expert transcription correction service. Your task is to take a raw transcript and a meeting audio file, and produce a clean, accurate JSON representation of the transcript.
          **Instructions:**
          1.  **Correct Inaccuracies:** Listen to the audio and correct any words in the raw transcript that do not match what was said.
          2.  **Fill Gaps:** Add any missing words or sentences.
          3.  **Remove Fillers:** Remove conversational filler words (e.g., 'um', 'uh', 'like') and stutters.
          4.  **Format Correctly:** Punctuate the text properly with periods, commas, and question marks.
          5.  **Final Output:** The final output MUST be a valid JSON array. Each object in the array should represent a single line of dialogue and have the structure: {"speaker": "string", "text": "string","time":"00:04"}.speaker must be between user oe agent only. Do not include any other text, explanations, or markdown formatting like \`\`\`json.
          Here is the raw transcription to correct:
          \`\`\`
          ${rawTranscriptionText}
          \`\`\`
        `.trim();
        const filePart = {
          fileData: {
            fileUri: event.data.recordingUrl,
            mimeType: "video/mp4",
          },
        };
        const textPart = { text: prompt };
        const request = {
          contents: [{ role: "user", parts: [textPart, filePart] }],
        };
        const streamingResult =
          await generativeVisionModel.generateContentStream(request);
        const aggregatedResponse = await streamingResult.response;
        return aggregatedResponse.candidates?.at(0)?.content.parts[0].text;
      }),
    ]);

    // Save both results in a single step
    await step.run("save-results", async () => {
      if (!summary || !correctedTranscriptionJsonString) {
        await db
          .update(meetings)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(meetings.id, event.data.meetingId));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get a valid response from AI for all tasks.",
        });
      }

      try {
        // Clean the AI response by removing markdown code blocks
        let cleanedJsonString = correctedTranscriptionJsonString;
        if (cleanedJsonString.includes("```json")) {
          cleanedJsonString = cleanedJsonString
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "")
            .trim();
        } else if (cleanedJsonString.includes("```")) {
          cleanedJsonString = cleanedJsonString.replace(/```\s*/g, "").trim();
        }

        // Parse the cleaned transcription string into a JSON object
        const transcriptJson = JSON.parse(cleanedJsonString);

        // Save both the summary and the parsed JSON transcript
        await db
          .update(meetings)
          .set({
            summary: summary,
            transcrible: transcriptJson, // Assumes 'transcript' column is jsonb
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(meetings.id, event.data.meetingId));

        console.log(
          "Successfully saved summary and corrected transcript to database"
        );
      } catch (parseError) {
        console.error("Failed to parse AI transcription response:", parseError);
        await db
          .update(meetings)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(meetings.id, event.data.meetingId));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse AI transcription response as JSON.",
        });
      }
    });

    return { success: true };
  }
);

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
          companyName: event.data.companyName,
        }),
      };
      const request = {
        contents: [{ role: "user", parts: [textPart, filePart] }],
      };
      const streamingResult =
        await generativeVisionModel.generateContentStream(request);

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
