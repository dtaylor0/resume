import type { Config } from 'tailwindcss';
import * as colors from 'tailwindcss/colors';

const config: Config = {
    content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            colors: {
                main: '#ffffff',
                alt: '#ededed',
                fg: '#171717',
                accent: colors.teal[400],
                darkmain: '#0a0a0a',
                darkalt: '#171717',
                darkfg: '#ededed',
                darkaccent: colors.teal[600],
            },
        },
    },
    plugins: [],
    darkMode: 'selector',
};
export default config;
