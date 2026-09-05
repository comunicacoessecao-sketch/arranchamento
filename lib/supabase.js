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
