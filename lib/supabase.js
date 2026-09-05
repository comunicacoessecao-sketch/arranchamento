import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// O login do Supabase exige um e-mail. Os militares nao usam e-mail para
// entrar, apenas o numero de guerra, entao montamos um endereco interno
// a partir dele. Esse endereco nunca aparece na tela nem recebe mensagens.
export function emailInterno(numeroGuerra) {
  return `${String(numeroGuerra).trim().toLowerCase()}@arranchamento.local`;
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
