import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Frame Forge — Image to Mesh",
	description:
		"Upload a product design and a few prompts, and Frame Forge reconstructs it as a production-ready Three.js mesh.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="dark h-full antialiased">
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	);
}
