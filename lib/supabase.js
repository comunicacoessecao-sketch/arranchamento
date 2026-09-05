import { createClient } from "@supabase/supabase-js";

// A URL precisa ser so o endereco do projeto: https://xxxxx.supabase.co
// Na hora de cadastrar a variavel e facil colar com uma barra no fim ou com
// /rest/v1 junto, e isso quebra todas as chamadas com "Invalid path
// specified in request URL". Aqui ficamos so com a parte valida.
function limparUrl(valor) {
  const bruto = String(valor || "").trim();
  const origem = bruto.match(/^https?:\/\/[^/\s]+/i);
  return origem ? origem[0] : bruto;
}

export const supabase = createClient(
  limparUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()
);

// Como cada militar se identifica no site.
//
// Cabos e soldados tem numero de guerra (106, 231, 409...). De sargento
// para cima nao existe numero: a identificacao e o nome de guerra. Entao o
// identificador e um ou outro, reduzido a uma forma estavel para que
// "Letíca Rangel", "LETICA RANGEL" e "letica rangel" deem no mesmo.
export function normalizarIdentificador(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".") // espacos e sinais viram ponto
    .replace(/^\.+|\.+$/g, "");
}

// O login do Supabase exige um e-mail. Os militares nao usam e-mail para
// entrar, entao montamos um endereco interno a partir do identificador.
// Esse endereco nunca aparece na tela nem recebe mensagens.
export function emailInterno(identificador) {
  return `${normalizarIdentificador(identificador)}@arranchamento.local`;
}

// Traduz o erro tecnico do Supabase para algo compreensivel, mantendo o
// texto original entre parenteses — e por ele que se descobre o que houve
// quando algo da errado na configuracao do projeto.
export function mensagemErroAuth(error) {
  const texto = String(error?.message || "");
  const t = texto.toLowerCase();

  if (t.includes("already") || t.includes("registered")) {
    return "Esse número de guerra já tem acesso criado. Volte e faça login.";
  }
  if (t.includes("signups not allowed") || t.includes("signup_disabled")) {
    return "O cadastro está desligado no Supabase. Em Authentication → Sign In / Providers → Email, ligue a opção que permite novos usuários.";
  }
  if (t.includes("email") && (t.includes("invalid") || t.includes("valid"))) {
    return `O Supabase recusou o endereço interno usado no login. Avise o responsável pela seção. (${texto})`;
  }
  if (t.includes("password")) {
    return "A senha não foi aceita: use pelo menos 6 caracteres.";
  }
  if (t.includes("failed to fetch") || t.includes("networkerror")) {
    return "O site não conseguiu falar com o banco de dados. Verifique a conexão — se persistir, as chaves do Supabase podem estar erradas.";
  }
  if (t.includes("rate") || t.includes("too many")) {
    return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  }
  return `Não foi possível criar o acesso. (${texto || "erro desconhecido"})`;
}
