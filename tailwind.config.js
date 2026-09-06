/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Azul-noite: fundo e superficies do site.
        noite: {
          950: "#060a13",
          900: "#0a1020",
          850: "#0e162b",
          800: "#131d38",
          700: "#1b2a4c",
          600: "#25375f",
          500: "#31497a",
          400: "#4a6396",
          300: "#8095bd",
          200: "#b6c5e0",
          100: "#dde5f4",
        },
        // Dourado: destaques, marcacoes e acoes principais.
        ouro: {
          600: "#a8851b",
          500: "#c9a227",
          400: "#dcb845",
          300: "#e9cf7d",
          200: "#f3e3af",
        },
      },
      fontFamily: {
        sans: ["var(--fonte-corpo)", "system-ui", "sans-serif"],
        titulo: ["var(--fonte-titulo)", "Impact", "system-ui", "sans-serif"],
      },
      boxShadow: {
        cartao: "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 18px 40px -24px rgba(0,0,0,0.9)",
        ouro: "0 8px 24px -10px rgba(201,162,39,0.55)",
      },
      keyframes: {
        surgir: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        pulsar: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.9" },
        },
        // Chama a atencao para o botao Enviar sem ficar piscando na cara.
        pulsarLeve: {
          "0%, 100%": { transform: "none", boxShadow: "0 8px 24px -10px rgba(201,162,39,0.55)" },
          "50%": { transform: "translateY(-1px)", boxShadow: "0 10px 30px -8px rgba(201,162,39,0.85)" },
        },
      },
      animation: {
        surgir: "surgir .35s ease-out both",
        pulsar: "pulsar 1.4s ease-in-out infinite",
        "pulsar-leve": "pulsarLeve 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
