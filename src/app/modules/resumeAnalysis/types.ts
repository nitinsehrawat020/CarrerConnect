import { AppRouter } from "@/trpc/routers/_app";
import { inferRouterOutputs } from "@trpc/server";

export interface Job {
  title: string;
  description: string;
  location: string;
  requiredSkills: string[];
}

export interface Resume {
  id: string;
  companyName?: string;
  jobTitle?: string;
  imagePath: string;
  resumePath: string;
  feedback: Feedback;
}
export interface Feedback {
  overallScore: number;
  ATS: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
    }[];
  };
  toneAndStyle: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  content: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  structure: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  skills: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
}

export type ResumeGetMany = inferRouterOutputs<AppRouter>["resume"]["getMany"];
export type ResumeGetOne = inferRouterOutputs<AppRouter>["resume"]["getOne"];
