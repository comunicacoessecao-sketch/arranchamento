// Faz o site poder virar um ícone na tela inicial do celular, abrindo em
// tela cheia — sem barra de endereço e sem o militar ter que lembrar do
// link. No Android o navegador oferece "Instalar"; no iPhone é o
// Compartilhar → "Adicionar à Tela de Início".

export default function manifest() {
  return {
    name: "Arranchamento — Seção de Comunicações",
    short_name: "Arranchamento",
    description: "Informe suas refeições da semana.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1020",
    theme_color: "#0a1020",
    lang: "pt-BR",
    icons: [
      {
        src: "/emblema.png",
        sizes: "500x500",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
