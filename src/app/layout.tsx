import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "נועה ואריאל - אישור הגעה",
  description: "אישור הגעה לחתונה של נועה ואריאל - 19 ביוני 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html dir="rtl" lang="he" className={`${heebo.variable} h-full`}>
      <body className="min-h-full flex flex-col font-[var(--font-heebo)]">
        {children}
      </body>
    </html>
  );
}
