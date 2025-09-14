"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { useTRPC } from "@/trpc/client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { serverCreateSchema } from "../../schema";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import GeneratedAvatar from "@/components/generated-avatar";
import { convertPdfToImage } from "@/lib/pdf2png";

// Maximum PDF file size: 10MB
const MAX_PDF_BYTES = 10 * 1024 * 1024;

interface ResumeFormProps {
  onSucces?: () => void;
  onCancel?: () => void;
}

export const ResumeForm = ({ onSucces, onCancel }: ResumeFormProps) => {
  const trpc = useTRPC();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const form = useForm<z.infer<typeof serverCreateSchema>>({
    resolver: zodResolver(serverCreateSchema),
    defaultValues: {
      companyName: "",
      jobTitle: "",
      jobDescription: "",
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles?.[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file.");
        return;
      }

      // Check file size before processing
      if (file.size > MAX_PDF_BYTES) {
        toast.error(
          `File size too large. Maximum allowed size is ${Math.round(
            MAX_PDF_BYTES / (1024 * 1024)
          )}MB.`
        );
        return;
      }

      try {
        const imageFile = await convertPdfToImage(file);
        console.log(imageFile);

        // Convert File -> base64 data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
        const comma = dataUrl.indexOf(",");
        const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;

        // Set schema-compatible object variant for PDF
        form.setValue(
          "file",
          {
            type: "application/pdf",
            base64,
            name: file.name,
          } as z.infer<typeof serverCreateSchema>["file"],
          { shouldDirty: true, shouldTouch: true, shouldValidate: true }
        );

        // Convert PNG File to base64 for image field if conversion succeeded
        if (imageFile.file) {
          const imageDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(imageFile.file!);
          });

          form.setValue("image", imageDataUrl, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        } else {
          console.warn("Image conversion failed:", imageFile.error);
          toast.error(
            "Failed to convert PDF to image. Please try again or use a different file."
          );
          return;
        }

        setSelectedFileName(file.name);
        await form.trigger("file");
        await form.trigger("image");
      } catch (error) {
        console.error("Error processing PDF file:", error);
        toast.error("Failed to process PDF file. Please try again.");
      }
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
  });

  const createResume = useMutation(
    trpc.resume.create.mutationOptions({
      onSuccess: () => {
        toast.success("Resume uploaded successfully");
        onSucces?.();
      },
      onError: (error) => {
        console.log(error);

        toast.error(error.message);
      },
    })
  );

  const onSubmit = (values: z.infer<typeof serverCreateSchema>) => {
    createResume.mutate(values);
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <GeneratedAvatar
          seed={form.watch("companyName") || "Microsoft"}
          varient="initials"
          className="border size-8"
        />

        <FormField
          name="companyName"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Microsoft" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="jobTitle"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Software Developer" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="jobDescription"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={8}
                  cols={8}
                  {...field}
                  placeholder="Requirement of the job"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="file"
          control={form.control}
          render={() => (
            <FormItem>
              <FormLabel>Resume (PDF)</FormLabel>
              <FormControl>
                <div
                  {...getRootProps()}
                  style={{
                    padding: "20px",
                    textAlign: "center",
                  }}
                  className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <input {...getInputProps()} />
                  {isDragActive ? (
                    <p>Drop the files here...</p>
                  ) : (
                    <p>
                      {selectedFileName
                        ? `Selected: ${selectedFileName}`
                        : "Drag & drop your resume PDF here, or click to select"}
                    </p>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between gap-x-2">
          {onCancel && (
            <Button
              variant={"ghost"}
              type={"button"}
              onClick={() => {
                onCancel();
              }}
            >
              Cancel
            </Button>
          )}

          <Button type="submit">Create</Button>
        </div>
      </form>
    </Form>
  );
};
