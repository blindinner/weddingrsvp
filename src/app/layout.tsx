import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://weddingrsvp.vercel.app"),
  title: "נועה ואריאל - אישור הגעה",
  description: "אישור הגעה לחתונה של נועה ואריאל - 19 ביוני 2026",
  openGraph: {
    title: "נועה ואריאל - אישור הגעה",
    description: "אישור הגעה לחתונה של נועה ואריאל - 19 ביוני 2026",
    images: [
      {
        url: "/invite.jpg",
        width: 1200,
        height: 1600,
        alt: "הזמנה לחתונה של נועה ואריאל",
      },
    ],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "נועה ואריאל - אישור הגעה",
    description: "אישור הגעה לחתונה של נועה ואריאל - 19 ביוני 2026",
    images: ["/invite.jpg"],
  },
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
