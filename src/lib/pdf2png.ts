export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  // Ensure we're in a client environment
  if (typeof window === "undefined") {
    throw new Error("PDF.js can only be loaded in browser environment");
  }

  loadPromise = import("pdfjs-dist")
    .then((lib) => {
      // Set the worker source to match the installed version 5.3.93
      // Using unpkg CDN for compatibility with Next.js 15/Turbopack
      if (!lib.GlobalWorkerOptions.workerSrc) {
        lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs`;
      }
      pdfjsLib = lib;
      return lib;
    })
    .catch((error) => {
      console.error("Failed to load PDF.js:", error);
      loadPromise = null;
      throw error;
    });

  return loadPromise;
}

export async function convertPdfToImage(
  file: File
): Promise<PdfConversionResult> {
  try {
    // Validate file type
    if (!file.type.includes("pdf")) {
      return {
        imageUrl: "",
        file: null,
        error: "Invalid file type. Please upload a PDF file.",
      };
    }

    // Validate file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return {
        imageUrl: "",
        file: null,
        error: "File too large. Please upload a PDF smaller than 10MB.",
      };
    }

    const lib = await loadPdfJs();

    const arrayBuffer = await file.arrayBuffer();

    // Add timeout and better error handling for PDF loading
    const loadingTask = lib.getDocument({
      data: arrayBuffer,
      cMapUrl: `https://unpkg.com/pdfjs-dist@5.3.93/cmaps/`,
      cMapPacked: true,
    });

    const pdf = await Promise.race([
      loadingTask.promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("PDF loading timeout")), 10000)
      ),
    ]);

    if (!pdf || pdf.numPages === 0) {
      return {
        imageUrl: "",
        file: null,
        error: "Invalid PDF file or no pages found.",
      };
    }

    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 }); // Reduced scale for better performance

    // Check if we're in a browser environment
    if (typeof document === "undefined") {
      return {
        imageUrl: "",
        file: null,
        error: "PDF conversion not supported in server environment.",
      };
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return {
        imageUrl: "",
        file: null,
        error: "Failed to create canvas context.",
      };
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        try {
          page.cleanup?.();
        } catch {}
        if (blob) {
          // Create a File from the blob with the same name as the pdf
          const originalName = file.name.replace(/\.pdf$/i, "");
          const imageFile = new File([blob], `${originalName}.png`, {
            type: "image/png",
          });

          resolve({
            imageUrl: URL.createObjectURL(blob),
            file: imageFile,
          });
        } else {
          resolve({
            imageUrl: "",
            file: null,
            error: "Failed to create image blob",
          });
        }
      }, "image/png");
    });
  } catch (err) {
    console.error("PDF conversion error:", err);
    return {
      imageUrl: "",
      file: null,
      error: `Failed to convert PDF: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}
