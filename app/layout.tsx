import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextFlow — Visual LLM Workflow Builder",
  description: "Build powerful AI workflows visually.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1a1a1a",
                color: "#e0e0e0",
                border: "1px solid #2a2a2a",
                borderRadius: "10px",
                fontSize: "13px",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}