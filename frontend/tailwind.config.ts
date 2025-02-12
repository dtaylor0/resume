import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                altbackground: "var(--altbackground)",
                foreground: "var(--foreground)",
                accent: "var(--accent)",
            },
        },
    },
    plugins: [],
};
export default config;
