"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, emailInterno, mensagemErroAuth } from "@/lib/supabase";
import { CATEGORIAS } from "@/lib/semana";
import Emblema from "@/components/Emblema";
import { Campo, Botao, Erro } from "@/components/ui";

export default function Login() {
  const router = useRouter();
  const [etapa, setEtapa] = useState("login");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [numeroGuerra, setNumeroGuerra] = useState("");
  const [senha, setSenha] = useState("");

  const [nome, setNome] = useState("");
  const [postoGrad, setPostoGrad] = useState("");
  const [categoria, setCategoria] = useState("Cabo/Sd");
  const [tipoSd, setTipoSd] = useState("EP");
  const [confirmaSenha, setConfirmaSenha] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/semana");
    });
  }, [router]);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    if (!numeroGuerra.trim() || !senha) {
      setErro("Preencha o número de guerra e a senha.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInterno(numeroGuerra),
      password: senha,
    });
    setCarregando(false);
    if (error) {
      setErro("Número de guerra ou senha incorretos. Se é seu primeiro acesso, toque em Criar acesso.");
      return;
    }
    router.replace("/semana");
  }

  async function cadastrar(e) {
    e.preventDefault();
    setErro("");
    if (!numeroGuerra.trim()) {
      setErro("Informe o número de guerra.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmaSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    setCarregando(true);

    const { data, error } = await supabase.auth.signUp({
      email: emailInterno(numeroGuerra),
      password: senha,
    });

    if (error) {
      setCarregando(false);
      console.error("signUp:", error);
      setErro(mensagemErroAuth(error));
      return;
    }

    if (!data?.user) {
      setCarregando(false);
      setErro("O Supabase não devolveu o usuário criado. Confira se a opção Confirm email está desligada em Authentication → Providers → Email.");
      return;
    }

    const { error: erroPerfil } = await supabase.from("militares").insert({
      id: data.user.id,
      numero_guerra: numeroGuerra.trim(),
      nome: nome.trim() || null,
      posto_grad: postoGrad.trim() || null,
      categoria,
      tipo_sd: categoria === "Cabo/Sd" ? tipoSd : null,
    });

    setCarregando(false);
    if (erroPerfil) {
      console.error("cadastro militar:", erroPerfil);
      setErro(
        `Acesso criado, mas o cadastro na tabela falhou. (${erroPerfil.message || "erro desconhecido"})`
      );
      return;
    }
    router.replace("/semana");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-5 py-12">
      <div className="mb-8 flex animate-surgir flex-col items-center text-center">
        <Emblema tamanho={92} />
        <h1 className="mt-5 font-titulo text-4xl font-bold uppercase tracking-[0.12em] text-white">
          Arranchamento
        </h1>
        <p className="mt-1.5 font-titulo text-sm uppercase tracking-[0.32em] text-ouro-400">
          Seção de Comunicações
        </p>
        <div className="mt-5 h-px w-24 bg-gradient-to-r from-transparent via-ouro-500/70 to-transparent" />
      </div>

      <div className="cartao animate-surgir p-6">
        <p className="titulo-secao mb-5">
          {etapa === "login" ? "Acesso" : "Novo cadastro"}
        </p>

        {etapa === "login" ? (
          <form onSubmit={entrar} className="space-y-4">
            <Campo
              label="Número de guerra"
              value={numeroGuerra}
              onChange={setNumeroGuerra}
              inputMode="numeric"
              placeholder="Ex.: 231"
              autoFocus
            />
            <Campo label="Senha" value={senha} onChange={setSenha} type="password" />
            <Erro texto={erro} />
            <Botao carregando={carregando}>Entrar</Botao>
            <Alternar
              onClick={() => {
                setErro("");
                setEtapa("cadastro");
              }}
            >
              Primeira vez? <span className="text-ouro-300">Criar acesso</span>
            </Alternar>
          </form>
        ) : (
          <form onSubmit={cadastrar} className="space-y-4">
            <Campo
              label="Número de guerra"
              value={numeroGuerra}
              onChange={setNumeroGuerra}
              inputMode="numeric"
              placeholder="Ex.: 231"
              autoFocus
            />

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-noite-300">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="campo"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c} className="bg-noite-900 text-noite-100">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {categoria === "Cabo/Sd" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-noite-300">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "EP", t: "Efetivo Profissional" },
                    { v: "EV", t: "Efetivo Variável" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setTipoSd(o.v)}
                      className={
                        "rounded-xl border px-2 py-2.5 text-sm transition " +
                        (tipoSd === o.v
                          ? "border-ouro-500/70 bg-ouro-500/15 font-medium text-ouro-200"
                          : "border-white/10 bg-white/[0.03] text-noite-300 hover:border-white/20")
                      }
                    >
                      <span className="block font-titulo text-base font-semibold uppercase tracking-wider">
                        {o.v}
                      </span>
                      <span className="block text-[11px] leading-tight opacity-80">{o.t}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!(categoria === "Cabo/Sd" && tipoSd === "EV") && (
              <>
                <Campo
                  label="Posto / Graduação"
                  value={postoGrad}
                  onChange={setPostoGrad}
                  placeholder="3º SGT, CB, SD…"
                  dica={
                    categoria === "Cabo/Sd"
                      ? "Cabos: escreva CB. É por aqui que a planilha separa cabos de soldados."
                      : undefined
                  }
                />
                <Campo label="Nome de guerra" value={nome} onChange={setNome} />
              </>
            )}

            <Campo label="Criar senha" value={senha} onChange={setSenha} type="password" />
            <Campo
              label="Repetir senha"
              value={confirmaSenha}
              onChange={setConfirmaSenha}
              type="password"
            />

            <Erro texto={erro} />
            <Botao carregando={carregando}>Criar acesso</Botao>
            <Alternar
              onClick={() => {
                setErro("");
                setEtapa("login");
              }}
            >
              Já tenho acesso — <span className="text-ouro-300">entrar</span>
            </Alternar>
          </form>
        )}
      </div>
    </main>
  );
}

function Alternar({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full pt-1 text-center text-sm text-noite-300 transition hover:text-noite-100"
    >
      {children}
    </button>
  );
}
