import type { Metadata } from "next";
import "./globals.css";
import ModalProvider from "@/providers/ModalProvider";
import SupabaseProvider from "@/providers/SupabaseProvider";
import ToasterProvider from "@/providers/ToasterProvider";
import UserProvider from "@/providers/UserProvider";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "TrainSpotter - Share and Discover Train Photos",
  description: "Upload and browse train photos with automatic metadata extraction",
};

export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <ToasterProvider />
        <SupabaseProvider>
          <UserProvider>
            <ModalProvider />
            <Header />
            {children}
          </UserProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
