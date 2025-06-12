import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "./providers/WalletContextProvider";
import { SupabaseProvider } from "./providers/SupabaseProvider";
import { GeminiProvider } from "./providers/GeminiProvider";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SolSmile - Get Rewarded for Your Smile",
  description: "Upload your smiling selfie and earn USDC rewards on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900 min-h-screen`}>
        <WalletContextProvider>
          <SupabaseProvider>
            <GeminiProvider>
              {children}
            </GeminiProvider>
          </SupabaseProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
