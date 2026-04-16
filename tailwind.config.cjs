/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#2563eb",
                "background-light": "#f8fafc",
                "background-dark": "#0f172a",
                "hsbc-red": "#DB0011",
                "hsbc-gray": "#F3F4F6",
                "hsbc-dark": "#111827",
            },
            fontFamily: {
                display: ["Inter", "sans-serif"],
                sans: ["Inter", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "0.5rem",
                'xl': '0.75rem',
                '2xl': '1rem',
            },
        },
    },
    plugins: [],
}
