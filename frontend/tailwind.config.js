/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            typography: {
                DEFAULT: {
                    css: {
                        maxWidth: "none",
                        color: "#e5e7eb",
                        a: {
                            color: "#818cf8",
                            "&:hover": {
                                color: "#a5b4fc",
                            },
                        },
                        code: {
                            color: "#a5b4fc",
                            backgroundColor: "#1e293b",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.25rem",
                            fontWeight: "400",
                        },
                        "code::before": {
                            content: '""',
                        },
                        "code::after": {
                            content: '""',
                        },
                        pre: {
                            backgroundColor: "#0f172a",
                            color: "#e5e7eb",
                        },
                    },
                },
            },
        },
    },
    plugins: [require("@tailwindcss/typography")],
};
