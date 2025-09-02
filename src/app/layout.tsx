import { Inter } from "next/font/google";
import "./globals.css";

import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TRPCReactProvider>
      <html lang="en">
        <body className={`${inter.className} antialiased`}>
          <Toaster />
          {children}
        </body>
      </html>
    </TRPCReactProvider>
  );
}
