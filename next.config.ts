import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Pin the workspace root to this project. A stray yarn.lock in a parent
	// directory would otherwise make Next infer the wrong root.
	turbopack: {
		root: __dirname,
	},
};

export default nextConfig;
