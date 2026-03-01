import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Authentix — Content Intelligence Platform",
  description:
    "Detect plagiarism, identify AI-generated content, and humanize text with production-grade accuracy.",
  keywords: ["plagiarism detection", "AI content detection", "text humanizer", "authentix"],
  openGraph: {
    title: "Authentix — Content Intelligence Platform",
    description: "Detect plagiarism, AI content, and humanize text.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-mesh min-h-screen">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(13,17,23,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#f0f4ff",
              backdropFilter: "blur(12px)",
            },
          }}
        />
      </body>
    </html>
  );
}
