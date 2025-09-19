"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  Lightbulb,
} from "lucide-react";
import Image from "next/image";

interface Props {
  resumeId: string;
}

// Helper component for score display
const ScoreIndicator = ({ score, label }: { score: number; label: string }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 80) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <span className="font-medium text-sm">{label}</span>
      <div
        className={`px-3 py-1 rounded-full text-sm font-semibold border ${getScoreColor(
          score
        )}`}
      >
        {score}/100
      </div>
    </div>
  );
};

// Helper component for tips display
const TipsList = ({
  tips,
}: {
  tips: Array<{ type: "good" | "improve"; tip: string; explanation?: string }>;
}) => {
  const goodTips = tips.filter((tip) => tip.type === "good");
  const improveTips = tips.filter((tip) => tip.type === "improve");

  return (
    <div className="space-y-4">
      {goodTips.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle className="h-4 w-4" />
            What&apos;s Working Well
          </h4>
          <div className="space-y-2">
            {goodTips.map((tip, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm text-green-800 font-medium">
                    {tip.tip}
                  </p>
                  {tip.explanation && (
                    <p className="text-xs text-green-700 opacity-80">
                      {tip.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {improveTips.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-700">
            <AlertCircle className="h-4 w-4" />
            Areas for Improvement
          </h4>
          <div className="space-y-2">
            {improveTips.map((tip, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg"
              >
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm text-orange-800 font-medium">
                    {tip.tip}
                  </p>
                  {tip.explanation && (
                    <p className="text-xs text-orange-700 opacity-80">
                      {tip.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function ResumeIdView({ resumeId }: Props) {
  const trpc = useTRPC();
  const { data: resume } = useSuspenseQuery(
    trpc.resume.getOne.queryOptions({ id: resumeId })
  );

  if (!resume) {
    return <div>Resume not found</div>;
  }

  const { feedback } = resume;

  return (
    <div className="h-screen bg-gray-50/50 flex flex-col">
      {/* Header Section */}
      <div className="flex-shrink-0 p-4 md:p-6 lg:p-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Resume Analysis
            </h1>
            <p className="text-gray-600 mt-1">
              {resume.companyName && resume.jobTitle
                ? `${resume.jobTitle} at ${resume.companyName}`
                : "Detailed feedback and recommendations"}
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Overall Score: {feedback?.overallScore || 0}/100
          </Badge>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Left Side - Resume Image (Full Height) */}
        <div className="h-full lg:h-auto">
          <div className="h-full p-4 md:p-6 lg:p-8 pt-0">
            <Card className="h-full overflow-hidden">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resume Preview
                </CardTitle>
                <CardDescription>Your uploaded resume document</CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-full flex-1">
                {resume.imagePath ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={resume.imagePath}
                      alt="Resume preview"
                      fill
                      className="object-contain bg-white"
                      priority
                    />
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <p className="text-gray-500">No preview available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Feedback Details (Scrollable) */}
        <div className="h-full lg:h-auto overflow-hidden">
          <div className="h-full p-4 md:p-6 lg:p-8 pt-0 overflow-y-auto">
            <div className="space-y-6">
              {/* Overall Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Overall Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {feedback?.overallScore || 0}
                      </div>
                      <Progress
                        value={feedback?.overallScore || 0}
                        className="w-full h-3"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        Overall Resume Score
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category Scores */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>
                    Performance across different aspects of your resume
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedback?.ATS && (
                    <ScoreIndicator
                      score={feedback.ATS.score}
                      label="ATS Compatibility"
                    />
                  )}
                  {feedback?.content && (
                    <ScoreIndicator
                      score={feedback.content.score}
                      label="Content Quality"
                    />
                  )}
                  {feedback?.structure && (
                    <ScoreIndicator
                      score={feedback.structure.score}
                      label="Structure & Format"
                    />
                  )}
                  {feedback?.toneAndStyle && (
                    <ScoreIndicator
                      score={feedback.toneAndStyle.score}
                      label="Tone & Style"
                    />
                  )}
                  {feedback?.skills && (
                    <ScoreIndicator
                      score={feedback.skills.score}
                      label="Skills Presentation"
                    />
                  )}
                </CardContent>
              </Card>

              {/* Detailed Feedback Accordion */}
              {feedback && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Detailed Feedback
                    </CardTitle>
                    <CardDescription>
                      Expand each section to see specific recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {feedback.ATS && (
                        <AccordionItem value="ats">
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span>ATS Compatibility</span>
                              <Badge variant="outline">
                                {feedback.ATS.score}/100
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <TipsList tips={feedback.ATS.tips} />
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {feedback.content && (
                        <AccordionItem value="content">
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span>Content Quality</span>
                              <Badge variant="outline">
                                {feedback.content.score}/100
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <TipsList tips={feedback.content.tips} />
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {feedback.structure && (
                        <AccordionItem value="structure">
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span>Structure & Format</span>
                              <Badge variant="outline">
                                {feedback.structure.score}/100
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <TipsList tips={feedback.structure.tips} />
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {feedback.toneAndStyle && (
                        <AccordionItem value="tone">
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span>Tone & Style</span>
                              <Badge variant="outline">
                                {feedback.toneAndStyle.score}/100
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <TipsList tips={feedback.toneAndStyle.tips} />
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {feedback.skills && (
                        <AccordionItem value="skills">
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span>Skills Presentation</span>
                              <Badge variant="outline">
                                {feedback.skills.score}/100
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <TipsList tips={feedback.skills.tips} />
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResumeIdView;
