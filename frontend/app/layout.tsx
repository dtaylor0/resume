import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Resume",
    description: "Drew Taylor",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
