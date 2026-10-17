"use client";
/* eslint-disable @next/next/no-img-element -- a marca pública do tenant pode ser uma data URL */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BriefcaseBusiness, CheckCircle2, FileText, Send } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

type Vacancy = {
  id: number;
  titulo: string;
  descricao: string;
  imagemUrl: string | null;
  fimEm: string | null;
};
type PageData = {
  estabelecimento: {
    nome: string;
    logoUrl: string | null;
    corPrimaria: string | null;
  };
  termos: { versao: string; resumo: string };
  data: Vacancy[];
};
const input =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

export default function PublicVacanciesPage() {
  const slug = String(useParams<{ slug: string }>().slug);
  const [data, setData] = useState<PageData | null>(null);
  const [selected, setSelected] = useState<Vacancy | null>(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    mensagem: "",
    consentimento: false,
    curriculoNome: "",
    curriculoBase64: "",
  });
  const [status, setStatus] = useState<"IDLE" | "SENDING" | "DONE" | "ERROR">(
    "IDLE",
  );
  useEffect(() => {
    void apiFetch<PageData>(`/public/${slug}/vagas`, { redirectOn401: false })
      .then(setData)
      .catch(() => setStatus("ERROR"));
  }, [slug]);
  const file = async (value: File | undefined) => {
    if (!value)
      return setForm({ ...form, curriculoNome: "", curriculoBase64: "" });
    if (value.type !== "application/pdf" || value.size > 500_000)
      return setStatus("ERROR");
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(value);
    });
    setForm({ ...form, curriculoNome: value.name, curriculoBase64: base64 });
    setStatus("IDLE");
  };
  const submit = async () => {
    if (!selected || !data) return;
    setStatus("SENDING");
    try {
      await apiFetch(`/public/${slug}/vagas/${selected.id}/candidaturas`, {
        method: "POST",
        redirectOn401: false,
        body: { ...form, consentimentoVersao: data.termos.versao },
      });
      setStatus("DONE");
    } catch {
      setStatus("ERROR");
    }
  };
  if (!data)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-sm font-bold text-white">
        {status === "ERROR"
          ? "Vagas indisponíveis."
          : "Carregando oportunidades…"}
      </main>
    );
  return (
    <main className="min-h-screen bg-[#f6f3ed] text-slate-950">
      <header className="border-b border-slate-300 bg-slate-950 px-5 py-8 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          {data.estabelecimento.logoUrl && (
            <img
              src={data.estabelecimento.logoUrl}
              alt=""
              className="h-12 w-12 rounded-xl object-contain"
            />
          )}
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-orange-400">
              <BriefcaseBusiness size={14} /> Trabalhe conosco
            </div>
            <h1 className="mt-1 text-3xl font-black">
              {data.estabelecimento.nome}
            </h1>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[1fr_420px]">
        <section>
          <h2 className="text-2xl font-black">Oportunidades abertas</h2>
          <div className="mt-5 space-y-3">
            {data.data.map((vacancy) => (
              <button
                key={vacancy.id}
                onClick={() => {
                  setSelected(vacancy);
                  setStatus("IDLE");
                }}
                className={`w-full rounded-2xl border bg-white p-5 text-left transition ${selected?.id === vacancy.id ? "border-orange-500 shadow-lg" : "border-slate-200 hover:border-slate-400"}`}
              >
                <h3 className="text-lg font-black">{vacancy.titulo}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {vacancy.descricao}
                </p>
                {vacancy.fimEm && (
                  <span className="mt-3 block text-xs font-bold text-slate-400">
                    Candidaturas até{" "}
                    {new Date(vacancy.fimEm).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </button>
            ))}
            {!data.data.length && (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                Não há vagas abertas neste momento.
              </div>
            )}
          </div>
        </section>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black">
              {selected
                ? `Candidatura · ${selected.titulo}`
                : "Escolha uma vaga"}
            </h2>
            {selected && status !== "DONE" && (
              <div className="mt-5 space-y-3">
                <input
                  className={input}
                  placeholder="Nome completo"
                  value={form.nome}
                  onChange={(event) =>
                    setForm({ ...form, nome: event.target.value })
                  }
                />
                <input
                  className={input}
                  type="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
                <input
                  className={input}
                  placeholder="Telefone"
                  value={form.telefone}
                  onChange={(event) =>
                    setForm({ ...form, telefone: event.target.value })
                  }
                />
                <textarea
                  className="min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm"
                  placeholder="Conte um pouco sobre você"
                  value={form.mensagem}
                  onChange={(event) =>
                    setForm({ ...form, mensagem: event.target.value })
                  }
                />
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-sm font-bold">
                  <FileText size={18} />
                  <span className="min-w-0 flex-1 truncate">
                    {form.curriculoNome || "Currículo PDF · até 500 KB"}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={(event) => void file(event.target.files?.[0])}
                  />
                </label>
                <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.consentimento}
                    onChange={(event) =>
                      setForm({ ...form, consentimento: event.target.checked })
                    }
                  />
                  {data.termos.resumo}
                </label>
                {status === "ERROR" && (
                  <p className="text-xs font-bold text-rose-700">
                    Confira os dados e o arquivo PDF antes de enviar.
                  </p>
                )}
                <button
                  disabled={status === "SENDING" || !form.consentimento}
                  onClick={() => void submit()}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-black text-white disabled:opacity-40"
                >
                  <Send size={16} />
                  {status === "SENDING" ? "Enviando…" : "Enviar candidatura"}
                </button>
              </div>
            )}
            {status === "DONE" && (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto text-emerald-600" size={42} />
                <strong className="mt-3 block">Candidatura recebida</strong>
                <p className="mt-1 text-sm text-slate-500">
                  A equipe responsável poderá entrar em contato pelos dados
                  informados.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
