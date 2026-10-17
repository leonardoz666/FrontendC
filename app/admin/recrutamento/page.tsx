"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Download,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { useToast } from "@/app/contexts/ToastContext";

type Vacancy = {
  id: number;
  titulo: string;
  descricao: string;
  imagemUrl: string | null;
  status: string;
  inicioEm: string | null;
  fimEm: string | null;
  retencaoDias: number;
  _count: { candidatos: number };
};
type Candidate = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  mensagem: string | null;
  curriculoNome: string | null;
  status: string;
  observacaoInterna: string | null;
  criadoEm: string;
  excluirApos: string;
};
const stages = ["NOVO", "EM_ANALISE", "ENTREVISTA", "APROVADO", "REPROVADO"];
const input =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

export default function RecruitmentPage() {
  const { showToast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Candidate | null>(
    null,
  );
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    imagemUrl: "",
    status: "RASCUNHO",
    inicioEm: "",
    fimEm: "",
    retencaoDias: "180",
  });
  const load = useCallback(async () => {
    try {
      const response = await apiFetch<{ data: Vacancy[] }>("/recrutamento");
      setVacancies(response.data);
      if (!selected && response.data[0]) setSelected(response.data[0].id);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Falha ao carregar vagas.",
        "error",
      );
    }
  }, [selected, showToast]);
  const loadCandidates = useCallback(async () => {
    if (!selected) return setCandidates([]);
    try {
      setCandidates(
        (
          await apiFetch<{ data: Candidate[] }>(
            `/recrutamento/${selected}/candidatos`,
          )
        ).data,
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Falha ao carregar candidatos.",
        "error",
      );
    }
  }, [selected, showToast]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);
  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      showToast(message, "success");
      await Promise.all([load(), loadCandidates()]);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Operação não concluída.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const create = () =>
    run(
      () =>
        apiFetch("/recrutamento", {
          method: "POST",
          body: {
            ...form,
            imagemUrl: form.imagemUrl || null,
            inicioEm: form.inicioEm ? `${form.inicioEm}T00:00:00` : null,
            fimEm: form.fimEm ? `${form.fimEm}T23:59:59` : null,
            retencaoDias: Number(form.retencaoDias),
          },
        }),
      "Vaga criada.",
    );
  const updateCandidate = (candidate: Candidate, status: string) =>
    run(
      () =>
        apiFetch(`/recrutamento/candidatos/${candidate.id}`, {
          method: "PATCH",
          body: { status, observacaoInterna: candidate.observacaoInterna },
        }),
      "Etapa do candidato atualizada.",
    );
  const selectedVacancy = vacancies.find((item) => item.id === selected);
  const updateVacancyStatus = (status: string) => {
    if (!selected) return;
    void run(
      () =>
        apiFetch(`/recrutamento/${selected}`, {
          method: "PATCH",
          body: { status },
        }),
      status === "PUBLICADA" ? "Vaga publicada." : "Vaga encerrada.",
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-[1560px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-orange-600">
              <BriefcaseBusiness size={14} /> Pessoas e oportunidades
            </div>
            <h1 className="text-3xl font-black text-slate-950">Recrutamento</h1>
            <p className="mt-1 text-sm text-slate-500">
              Publique vagas, acompanhe o pipeline e respeite a retenção dos
              dados.
            </p>
          </div>
          <button
            onClick={() => void Promise.all([load(), loadCandidates()])}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black"
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        </header>
        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-5">
            <Panel title="Nova vaga">
              <div className="space-y-3">
                <input
                  className={input}
                  placeholder="Título da vaga"
                  value={form.titulo}
                  onChange={(event) =>
                    setForm({ ...form, titulo: event.target.value })
                  }
                />
                <textarea
                  className="min-h-32 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-orange-500"
                  placeholder="Descrição, responsabilidades e requisitos"
                  value={form.descricao}
                  onChange={(event) =>
                    setForm({ ...form, descricao: event.target.value })
                  }
                />
                <input
                  className={input}
                  type="url"
                  placeholder="Imagem da vaga (URL opcional)"
                  value={form.imagemUrl}
                  onChange={(event) =>
                    setForm({ ...form, imagemUrl: event.target.value })
                  }
                />
                <select
                  className={input}
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                >
                  <option>RASCUNHO</option>
                  <option>PUBLICADA</option>
                  <option>ENCERRADA</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className={input}
                    value={form.inicioEm}
                    onChange={(event) =>
                      setForm({ ...form, inicioEm: event.target.value })
                    }
                  />
                  <input
                    type="date"
                    className={input}
                    value={form.fimEm}
                    onChange={(event) =>
                      setForm({ ...form, fimEm: event.target.value })
                    }
                  />
                </div>
                <label className="block text-xs font-bold text-slate-500">
                  Retenção em dias
                  <input
                    type="number"
                    min="30"
                    max="730"
                    className={`${input} mt-1`}
                    value={form.retencaoDias}
                    onChange={(event) =>
                      setForm({ ...form, retencaoDias: event.target.value })
                    }
                  />
                </label>
                <button
                  disabled={busy}
                  onClick={() => void create()}
                  className="h-11 w-full rounded-xl bg-slate-950 text-sm font-black text-white disabled:opacity-50"
                >
                  Criar vaga
                </button>
              </div>
            </Panel>
            <Panel title="Vagas">
              <div className="divide-y divide-slate-100">
                {vacancies.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    className={`w-full py-3 text-left ${selected === item.id ? "text-orange-700" : "text-slate-800"}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <strong className="text-sm">{item.titulo}</strong>
                      <small className="rounded-full bg-slate-100 px-2 py-1 font-black">
                        {item._count.candidatos}
                      </small>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {item.status} · retenção {item.retencaoDias} dias
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          </aside>
          <Panel title="Pipeline de candidatos">
            {selectedVacancy && (
              <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-slate-950">
                    {selectedVacancy.titulo}
                  </strong>
                  <span className="text-xs text-slate-500">
                    Situação atual: {selectedVacancy.status}
                  </span>
                </div>
                {selectedVacancy.status !== "PUBLICADA" && (
                  <button
                    disabled={busy}
                    onClick={() => updateVacancyStatus("PUBLICADA")}
                    className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-black text-white"
                  >
                    Publicar
                  </button>
                )}
                {selectedVacancy.status !== "ENCERRADA" && (
                  <button
                    disabled={busy}
                    onClick={() => updateVacancyStatus("ENCERRADA")}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700"
                  >
                    Encerrar
                  </button>
                )}
              </div>
            )}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {stages.map((stage) => (
                <span
                  key={stage}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600"
                >
                  {stage.replaceAll("_", " ")} ·{" "}
                  {candidates.filter((item) => item.status === stage).length}
                </span>
              ))}
              <span className="flex-1" />
              {selected && (
                <a
                  href={`/api/recrutamento/${selected}/exportar`}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700"
                >
                  <Download size={14} /> Exportar CSV
                </a>
              )}
              <button
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      apiFetch("/recrutamento/retencao/expurgar", {
                        method: "POST",
                      }),
                    "Registros com retenção expirada foram removidos.",
                  )
                }
                className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700"
              >
                Aplicar retenção
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Candidato</th>
                    <th className="px-3 py-3">Contato</th>
                    <th className="px-3 py-3">Etapa</th>
                    <th className="px-3 py-3">Nota interna</th>
                    <th className="px-3 py-3">Retenção</th>
                    <th className="px-3 py-3">Currículo</th>
                    <th className="px-3 py-3">LGPD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-3 py-4">
                        <strong className="block text-slate-950">
                          {candidate.nome}
                        </strong>
                        <span className="text-xs text-slate-500">
                          {new Date(candidate.criadoEm).toLocaleString("pt-BR")}
                        </span>
                      </td>
                      <td className="min-w-56 px-3 py-4">
                        <textarea
                          className="min-h-16 w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-orange-500"
                          placeholder="Visível somente para a equipe"
                          value={candidate.observacaoInterna ?? ""}
                          onChange={(event) =>
                            setCandidates((current) =>
                              current.map((item) =>
                                item.id === candidate.id
                                  ? {
                                      ...item,
                                      observacaoInterna: event.target.value,
                                    }
                                  : item,
                              ),
                            )
                          }
                          onBlur={() =>
                            void updateCandidate(candidate, candidate.status)
                          }
                        />
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-600">
                        {candidate.email}
                        <br />
                        {candidate.telefone}
                      </td>
                      <td className="px-3 py-4">
                        <select
                          className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold"
                          value={candidate.status}
                          onChange={(event) =>
                            void updateCandidate(candidate, event.target.value)
                          }
                        >
                          {stages.map((stage) => (
                            <option key={stage}>{stage}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-500">
                        até{" "}
                        {new Date(candidate.excluirApos).toLocaleDateString(
                          "pt-BR",
                        )}
                      </td>
                      <td className="px-3 py-4">
                        {candidate.curriculoNome ? (
                          <a
                            href={`/api/recrutamento/candidatos/${candidate.id}/curriculo`}
                            className="inline-flex items-center gap-1 text-xs font-black text-orange-700"
                          >
                            <Download size={14} /> PDF
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Não enviado
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <button
                          onClick={() => setDeleteCandidate(candidate)}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-black text-rose-700"
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!candidates.length && (
                <div className="grid min-h-52 place-items-center text-sm text-slate-400">
                  <span className="text-center">
                    <Users className="mx-auto mb-2" />
                    Selecione uma vaga com candidaturas.
                  </span>
                </div>
              )}
            </div>
          </Panel>
        </section>
      </div>
      {busy && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
          <LoaderCircle size={16} className="animate-spin" /> Salvando
        </div>
      )}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-black text-slate-950">
              Excluir dados do candidato?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Os dados e o currículo de <strong>{deleteCandidate.nome}</strong>{" "}
              serão apagados definitivamente por solicitação LGPD. A ação ficará
              registrada na auditoria.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="h-10 rounded-lg px-4 text-sm font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await apiFetch(
                      `/recrutamento/candidatos/${deleteCandidate.id}`,
                      { method: "DELETE" },
                    );
                    setDeleteCandidate(null);
                  }, "Dados do candidato excluídos.")
                }
                className="h-10 rounded-lg bg-rose-700 px-4 text-sm font-black text-white"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 border-b border-slate-200 pb-3 font-black text-slate-950">
        {title}
      </h2>
      {children}
    </section>
  );
}
