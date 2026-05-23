import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
                extend: {
                    screens: {
                        'xs': '375px',
                    },
                    colors: {
                        stone: {
                            50: '#fafaf9',
                            100: '#f5f5f4',
                            200: '#e7e5e4',
                            300: '#d6d3d1',
                            800: '#292524',
                            900: '#1c1917',
                        },
                        gold: {
                            400: '#fbbf24',
                            500: '#f59e0b',
                            600: '#d97706',
                            700: '#b45309',
                        },
                        biblical: {
                            red: '#9B2C2C',
                            blue: '#2C5282'
                        }
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        serif: ['Playfair Display', 'serif'],
                        display: ['Cinzel', 'serif'],
                    },
                    backgroundImage: {
                        'noise': "url('https://grainy-gradients.vercel.app/noise.svg')",
                    }
                }
            },
  plugins: [],
};
export default config;
