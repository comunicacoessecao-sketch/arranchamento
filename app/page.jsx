"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, emailInterno, mensagemErroAuth } from "@/lib/supabase";
import Emblema from "@/components/Emblema";
import { Campo, Botao, Erro } from "@/components/ui";

export default function Login() {
  const router = useRouter();
  // "login" | "conferir" (informa o número) | "criar" (define a senha)
  const [etapa, setEtapa] = useState("login");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [numeroGuerra, setNumeroGuerra] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");

  // Dados vindos da relação de autorizados.
  const [autorizado, setAutorizado] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/semana");
    });
  }, [router]);

  function irPara(proxima) {
    setErro("");
    setSenha("");
    setConfirmaSenha("");
    if (proxima !== "criar") setAutorizado(null);
    setEtapa(proxima);
  }

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

  // Passo 1 do cadastro: o número está na relação da seção?
  async function conferir(e) {
    e.preventDefault();
    setErro("");
    if (!numeroGuerra.trim()) {
      setErro("Informe o número de guerra.");
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase.rpc("dados_autorizado", {
      numero: numeroGuerra.trim(),
    });
    setCarregando(false);

    if (error) {
      console.error("dados_autorizado:", error);
      setErro(`Não foi possível conferir a relação. (${error.message || "erro desconhecido"})`);
      return;
    }
    if (!data || data.length === 0) {
      setErro(
        "Esse número de guerra não está na relação da seção. Confira se digitou certo — se estiver certo, procure o responsável para ser incluído."
      );
      return;
    }

    setAutorizado(data[0]);
    setEtapa("criar");
  }

  // Passo 2 do cadastro: cria o acesso com os dados que vieram da relação.
  async function criarAcesso(e) {
    e.preventDefault();
    setErro("");
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
      nome: autorizado.nome,
      posto_grad: autorizado.posto_grad,
      categoria: autorizado.categoria,
      bloco: autorizado.bloco,
      tipo_sd: autorizado.bloco === "sdEv" ? "EV" : autorizado.categoria === "Cabo/Sd" ? "EP" : null,
    });

    setCarregando(false);
    if (erroPerfil) {
      console.error("cadastro militar:", erroPerfil);
      setErro(`Acesso criado, mas o cadastro na tabela falhou. (${erroPerfil.message || "erro desconhecido"})`);
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
          {etapa === "login" ? "Acesso" : etapa === "conferir" ? "Criar acesso" : "Confirme seus dados"}
        </p>

        {etapa === "login" && (
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
            <Alternar onClick={() => irPara("conferir")}>
              Primeira vez? <span className="text-ouro-300">Criar acesso</span>
            </Alternar>
          </form>
        )}

        {etapa === "conferir" && (
          <form onSubmit={conferir} className="space-y-4">
            <Campo
              label="Número de guerra"
              value={numeroGuerra}
              onChange={setNumeroGuerra}
              inputMode="numeric"
              placeholder="Ex.: 231"
              autoFocus
              dica="Seus dados vêm da relação da seção — você só precisa criar uma senha."
            />
            <Erro texto={erro} />
            <Botao carregando={carregando}>Continuar</Botao>
            <Alternar onClick={() => irPara("login")}>
              Já tenho acesso — <span className="text-ouro-300">entrar</span>
            </Alternar>
          </form>
        )}

        {etapa === "criar" && (
          <form onSubmit={criarAcesso} className="space-y-4">
            <div className="rounded-xl border border-ouro-500/30 bg-ouro-500/[0.08] px-4 py-3">
              <p className="font-titulo text-lg font-semibold uppercase leading-tight tracking-wide text-ouro-200">
                {[autorizado?.posto_grad, autorizado?.nome].filter(Boolean).join(" ") ||
                  `Nº ${numeroGuerra.trim()}`}
              </p>
              <p className="mt-0.5 text-xs text-noite-300">
                Nº {numeroGuerra.trim()} · {autorizado?.categoria}
                {autorizado?.bloco === "sdEv" ? " · Efetivo Variável" : ""}
              </p>
            </div>

            <Campo label="Criar senha" value={senha} onChange={setSenha} type="password" autoFocus />
            <Campo
              label="Repetir senha"
              value={confirmaSenha}
              onChange={setConfirmaSenha}
              type="password"
            />

            <Erro texto={erro} />
            <Botao carregando={carregando}>Criar acesso</Botao>
            <Alternar onClick={() => irPara("conferir")}>
              Não sou eu — <span className="text-ouro-300">voltar</span>
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
