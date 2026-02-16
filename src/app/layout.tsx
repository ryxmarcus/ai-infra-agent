import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Cloud Infrastructure Agent | Trigger.dev",
  description:
    "Deploy cloud infrastructure using natural language. Powered by AI and Trigger.dev.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
