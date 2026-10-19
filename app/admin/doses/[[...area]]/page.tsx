"use client";

import Link from "@/app/components/TenantLink";
import { apiFetch } from "@/app/lib/api";
import { useToast } from "@/app/contexts/ToastContext";
import {
  AlertTriangle,
  ArrowDownUp,
  ChartColumn,
  CheckCircle2,
  ClipboardList,
  History,
  Package,
  PackagePlus,
  RefreshCw,
  Scale,
  Tags,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Area = "SALDO" | "ROTULOS" | "AFERIR" | "HISTORICO" | "CONCILIACAO";
type Product = { id: number; nome: string; preco: number; isDrink: boolean };
type Label = {
  id: number;
  nome: string;
  produtoId: number;
  produto: { id: number; nome: string; preco: number; ativo: boolean };
  volumeGarrafaMl: number;
  volumeDoseMl: number;
  saldoAtualMl: number;
  estoqueMinimoMl: number;
  ativo: boolean;
  atualizadoEm: string;
};
type Movement = {
  id: number;
  tipo: "SALDO_INICIAL" | "ENTRADA" | "AFERICAO" | "AJUSTE";
  saldoAnteriorMl: number;
  quantidadeMl: number;
  saldoPosteriorMl: number;
  consumoApuradoMl: number;
  observacao: string | null;
  criadoEm: string;
  rotulo: { id: number; nome: string };
  usuario: { id: number; nome: string };
};
type Reconciliation = {
  rotuloId: number;
  nome: string;
  produto: { id: number; nome: string };
  volumeDoseMl: number;
  consumoAferidoMl: number;
  dosesAferidas: number;
  dosesVendidas: number;
  diferencaDoses: number;
  status: "CONFERIDO" | "PERDA" | "SOBRA";
};
type Summary = {
  rotulos: Label[];
  produtos: Product[];
  movimentos: Movement[];
};

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const buttonPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-black text-white transition hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:bg-slate-300";
const buttonSecondary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50";
const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const NAV: Array<{
  area: Area;
  href: string;
  label: string;
  icon: typeof ClipboardList;
}> = [
  {
    area: "SALDO",
    href: "/admin/doses",
    label: "Lista e saldo",
    icon: ClipboardList,
  },
  {
    area: "ROTULOS",
    href: "/admin/doses/rotulos",
    label: "Cadastro de rótulo",
    icon: Tags,
  },
  {
    area: "AFERIR",
    href: "/admin/doses/aferir",
    label: "Aferir rótulo",
    icon: Scale,
  },
  {
    area: "HISTORICO",
    href: "/admin/doses/historico",
    label: "Histórico",
    icon: History,
  },
  {
    area: "CONCILIACAO",
    href: "/admin/doses/conciliacao",
    label: "Doses x vendas",
    icon: ChartColumn,
  },
];

const COPY: Record<Area, { title: string; description: string }> = {
  SALDO: {
    title: "Lista e saldo",
    description:
      "Acompanhe o volume disponível e registre a entrada de garrafas.",
  },
  ROTULOS: {
    title: "Cadastro de rótulo",
    description:
      "Vincule cada bebida vendida ao volume da garrafa e à dose padrão.",
  },
  AFERIR: {
    title: "Aferir rótulo",
    description:
      "Informe o volume físico atual para apurar o consumo desde a última leitura.",
  },
  HISTORICO: {
    title: "Histórico de aferições",
    description: "Consulte quem alterou cada saldo, quando e por qual motivo.",
  },
  CONCILIACAO: {
    title: "Doses x vendas",
    description:
      "Compare o consumo aferido com as doses registradas nos pedidos.",
  },
};

function areaFromPath(pathname: string): Area {
  if (pathname.endsWith("/rotulos")) return "ROTULOS";
  if (pathname.endsWith("/aferir")) return "AFERIR";
  if (pathname.endsWith("/historico")) return "HISTORICO";
  if (pathname.endsWith("/conciliacao")) return "CONCILIACAO";
  return "SALDO";
}

function today(): string {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function monthStart(): string {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-01`;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      {children}
      {hint ? (
        <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
      <Package size={30} className="text-slate-400" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

export default function DoseControlPage() {
  const pathname = usePathname();
  const area = areaFromPath(pathname);
  const { showToast } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<Movement[]>([]);
  const [reconciliation, setReconciliation] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState({ inicio: monthStart(), fim: today() });
  const [historyLabelId, setHistoryLabelId] = useState("");
  const [entry, setEntry] = useState({
    rotuloId: "",
    quantidadeGarrafas: "1",
    observacao: "",
  });
  const [calibration, setCalibration] = useState({
    rotuloId: "",
    saldoAferidoMl: "",
    observacao: "",
  });
  const [form, setForm] = useState({
    nome: "",
    produtoId: "",
    volumeGarrafaMl: "1000",
    volumeDoseMl: "50",
    saldoInicialMl: "0",
    estoqueMinimoMl: "250",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(period);
      if (historyLabelId) query.set("rotuloId", historyLabelId);
      const [base, detail] = await Promise.all([
        apiFetch<Summary>("/doses/resumo"),
        area === "HISTORICO"
          ? apiFetch<{ data: Movement[] }>(`/doses/historico?${query}`).then(
              (result) => ({ kind: "history" as const, data: result.data }),
            )
          : area === "CONCILIACAO"
            ? apiFetch<{ data: Reconciliation[] }>(
                `/doses/conciliacao?${query}`,
              ).then((result) => ({
                kind: "reconciliation" as const,
                data: result.data,
              }))
            : Promise.resolve(null),
      ]);
      setSummary(base);
      if (detail?.kind === "history") setHistory(detail.data);
      if (detail?.kind === "reconciliation") setReconciliation(detail.data);
      setEntry((current) => ({
        ...current,
        rotuloId:
          current.rotuloId ||
          String(base.rotulos.find((item) => item.ativo)?.id ?? ""),
      }));
      setCalibration((current) => ({
        ...current,
        rotuloId:
          current.rotuloId ||
          String(base.rotulos.find((item) => item.ativo)?.id ?? ""),
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar o controle de doses.",
      );
    } finally {
      setLoading(false);
    }
  }, [area, historyLabelId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeLabels = useMemo(
    () => summary?.rotulos.filter((item) => item.ativo) ?? [],
    [summary],
  );
  const selectedCalibration = activeLabels.find(
    (item) => item.id === Number(calibration.rotuloId),
  );
  const totalMl = activeLabels.reduce(
    (sum, item) => sum + Number(item.saldoAtualMl),
    0,
  );
  const lowStock = activeLabels.filter(
    (item) =>
      Number(item.estoqueMinimoMl) > 0 &&
      Number(item.saldoAtualMl) <= Number(item.estoqueMinimoMl),
  );
  const measuredBalance = Number(calibration.saldoAferidoMl);
  const calibrationDelta =
    selectedCalibration && Number.isFinite(measuredBalance)
      ? measuredBalance - Number(selectedCalibration.saldoAtualMl)
      : null;

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      showToast(message, "success");
      await load();
    } catch (cause) {
      showToast(
        cause instanceof Error
          ? cause.message
          : "Não foi possível concluir a operação.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  const copy = COPY[area];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-5">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.025em]">
              {copy.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              {copy.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={buttonSecondary}
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />{" "}
            Atualizar
          </button>
        </header>

        <nav
          className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-300"
          aria-label="Áreas do controle de doses"
        >
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.area}
                href={item.href}
                className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-orange-100 ${area === item.area ? "border-orange-600 text-orange-700" : "border-transparent text-slate-600 hover:border-slate-400 hover:text-slate-950"}`}
              >
                <Icon size={17} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {loading ? (
          <div className="mt-6 space-y-3" aria-label="Carregando">
            <div className="h-20 animate-pulse bg-slate-200" />
            <div className="h-72 animate-pulse bg-slate-200" />
          </div>
        ) : error ? (
          <div className="mt-6 border border-red-200 bg-red-50 p-5 text-red-800">
            <strong className="block">Falha ao carregar</strong>
            <span className="mt-1 block text-sm">{error}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 font-bold underline underline-offset-4"
            >
              Tentar novamente
            </button>
          </div>
        ) : summary ? (
          <div className="mt-6">
            {area === "SALDO" ? (
              <SaldoArea
                labels={activeLabels}
                totalMl={totalMl}
                lowStock={lowStock}
                entry={entry}
                setEntry={setEntry}
                busy={busy}
                onEntry={() =>
                  run(
                    () =>
                      apiFetch(`/doses/rotulos/${entry.rotuloId}/entradas`, {
                        method: "POST",
                        body: {
                          quantidadeGarrafas: Number(entry.quantidadeGarrafas),
                          observacao: entry.observacao || undefined,
                        },
                      }),
                    "Entrada registrada.",
                  )
                }
              />
            ) : null}
            {area === "ROTULOS" ? (
              <LabelsArea
                summary={summary}
                form={form}
                setForm={setForm}
                busy={busy}
                onSave={() =>
                  run(
                    () =>
                      apiFetch("/doses/rotulos", {
                        method: "POST",
                        body: {
                          ...form,
                          produtoId: Number(form.produtoId),
                          volumeGarrafaMl: Number(form.volumeGarrafaMl),
                          volumeDoseMl: Number(form.volumeDoseMl),
                          saldoInicialMl: Number(form.saldoInicialMl),
                          estoqueMinimoMl: Number(form.estoqueMinimoMl),
                          ativo: true,
                        },
                      }),
                    "Rótulo cadastrado.",
                  )
                }
                onToggle={(label) =>
                  run(
                    () =>
                      apiFetch(`/doses/rotulos/${label.id}`, {
                        method: "PATCH",
                        body: { ativo: !label.ativo },
                      }),
                    label.ativo ? "Rótulo desativado." : "Rótulo reativado.",
                  )
                }
              />
            ) : null}
            {area === "AFERIR" ? (
              <CalibrationArea
                labels={activeLabels}
                calibration={calibration}
                setCalibration={setCalibration}
                selected={selectedCalibration}
                delta={calibrationDelta}
                busy={busy}
                movements={summary.movimentos
                  .filter((item) => item.tipo === "AFERICAO")
                  .slice(0, 8)}
                onSave={() =>
                  run(
                    () =>
                      apiFetch(
                        `/doses/rotulos/${calibration.rotuloId}/afericoes`,
                        {
                          method: "POST",
                          body: {
                            saldoAferidoMl: Number(calibration.saldoAferidoMl),
                            observacao: calibration.observacao || undefined,
                          },
                        },
                      ),
                    "Aferição registrada.",
                  )
                }
              />
            ) : null}
            {area === "HISTORICO" ? (
              <HistoryArea
                labels={summary.rotulos}
                period={period}
                setPeriod={setPeriod}
                labelId={historyLabelId}
                setLabelId={setHistoryLabelId}
                data={history}
                onFilter={() => void load()}
              />
            ) : null}
            {area === "CONCILIACAO" ? (
              <ReconciliationArea
                period={period}
                setPeriod={setPeriod}
                data={reconciliation}
                onFilter={() => void load()}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function SaldoArea({
  labels,
  totalMl,
  lowStock,
  entry,
  setEntry,
  busy,
  onEntry,
}: {
  labels: Label[];
  totalMl: number;
  lowStock: Label[];
  entry: { rotuloId: string; quantidadeGarrafas: string; observacao: string };
  setEntry: React.Dispatch<React.SetStateAction<typeof entry>>;
  busy: boolean;
  onEntry: () => void;
}) {
  if (labels.length === 0)
    return (
      <Empty
        title="Cadastre o primeiro rótulo"
        text="Vincule uma bebida do cardápio para começar a controlar o saldo físico."
      />
    );
  return (
    <div className="space-y-6">
      <section
        className="grid overflow-hidden border border-slate-300 bg-white sm:grid-cols-3"
        aria-label="Resumo de saldo"
      >
        <div className="p-5">
          <span className="text-sm font-bold text-slate-500">
            Rótulos ativos
          </span>
          <strong className="mt-1 block text-2xl font-black tabular-nums">
            {labels.length}
          </strong>
        </div>
        <div className="border-y border-slate-200 p-5 sm:border-x sm:border-y-0">
          <span className="text-sm font-bold text-slate-500">Volume total</span>
          <strong className="mt-1 block text-2xl font-black tabular-nums">
            {fmt.format(totalMl)} ml
          </strong>
        </div>
        <div className="p-5">
          <span className="text-sm font-bold text-slate-500">
            Abaixo do mínimo
          </span>
          <strong
            className={`mt-1 block text-2xl font-black tabular-nums ${lowStock.length ? "text-amber-700" : "text-emerald-700"}`}
          >
            {lowStock.length}
          </strong>
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-x-auto border border-slate-300 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Rótulo</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Garrafas</th>
                <th className="px-4 py-3">Doses disponíveis</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {labels.map((item) => {
                const isLow =
                  Number(item.estoqueMinimoMl) > 0 &&
                  Number(item.saldoAtualMl) <= Number(item.estoqueMinimoMl);
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <strong className="block text-slate-950">
                        {item.nome}
                      </strong>
                      <span className="text-xs text-slate-500">
                        {item.produto.nome} · dose de{" "}
                        {fmt.format(item.volumeDoseMl)} ml
                      </span>
                    </td>
                    <td className="px-4 py-4 font-black tabular-nums">
                      {fmt.format(item.saldoAtualMl)} ml
                    </td>
                    <td className="px-4 py-4 tabular-nums">
                      {fmt.format(
                        Number(item.saldoAtualMl) /
                          Number(item.volumeGarrafaMl),
                      )}
                    </td>
                    <td className="px-4 py-4 tabular-nums">
                      {fmt.format(
                        Number(item.saldoAtualMl) / Number(item.volumeDoseMl),
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                          <AlertTriangle size={16} /> Repor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                          <CheckCircle2 size={16} /> Regular
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <aside className="border border-slate-300 bg-white p-5">
          <div className="flex items-center gap-2">
            <PackagePlus size={20} className="text-orange-600" />
            <h2 className="text-lg font-black">Entrada de garrafas</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            A entrada aumenta o saldo sem ser contada como consumo.
          </p>
          <div className="mt-5 space-y-4">
            <Field label="Rótulo">
              <select
                className={inputClass}
                value={entry.rotuloId}
                onChange={(event) =>
                  setEntry((current) => ({
                    ...current,
                    rotuloId: event.target.value,
                  }))
                }
              >
                {labels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantidade de garrafas">
              <input
                className={inputClass}
                type="number"
                min="1"
                step="1"
                value={entry.quantidadeGarrafas}
                onChange={(event) =>
                  setEntry((current) => ({
                    ...current,
                    quantidadeGarrafas: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Observação">
              <input
                className={inputClass}
                value={entry.observacao}
                onChange={(event) =>
                  setEntry((current) => ({
                    ...current,
                    observacao: event.target.value,
                  }))
                }
                placeholder="Ex.: reposição do bar"
              />
            </Field>
            <button
              type="button"
              disabled={
                busy || !entry.rotuloId || Number(entry.quantidadeGarrafas) <= 0
              }
              onClick={onEntry}
              className={`${buttonPrimary} w-full`}
            >
              Registrar entrada
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}

function LabelsArea({
  summary,
  form,
  setForm,
  busy,
  onSave,
  onToggle,
}: {
  summary: Summary;
  form: {
    nome: string;
    produtoId: string;
    volumeGarrafaMl: string;
    volumeDoseMl: string;
    saldoInicialMl: string;
    estoqueMinimoMl: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  busy: boolean;
  onSave: () => void;
  onToggle: (label: Label) => void;
}) {
  const available = summary.produtos.filter(
    (product) =>
      !summary.rotulos.some((label) => label.produtoId === product.id),
  );
  return (
    <section className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
      <div className="border border-slate-300 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black">Novo rótulo</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Use o produto que representa uma dose no cardápio.
        </p>
        <div className="mt-5 space-y-4">
          <Field label="Nome do rótulo">
            <input
              className={inputClass}
              value={form.nome}
              onChange={(event) =>
                setForm((current) => ({ ...current, nome: event.target.value }))
              }
              placeholder="Ex.: Whisky 12 anos"
            />
          </Field>
          <Field label="Produto vendido">
            <select
              className={inputClass}
              value={form.produtoId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  produtoId: event.target.value,
                }))
              }
            >
              <option value="">Selecione</option>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                  {item.isDrink ? "" : " · não marcado como bebida"}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Garrafa (ml)">
              <input
                className={inputClass}
                type="number"
                min="1"
                value={form.volumeGarrafaMl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    volumeGarrafaMl: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Dose padrão (ml)">
              <input
                className={inputClass}
                type="number"
                min="1"
                value={form.volumeDoseMl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    volumeDoseMl: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Saldo inicial (ml)">
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.saldoInicialMl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    saldoInicialMl: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Alerta mínimo (ml)">
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.estoqueMinimoMl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    estoqueMinimoMl: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={
              busy ||
              !form.nome.trim() ||
              !form.produtoId ||
              Number(form.volumeDoseMl) <= 0 ||
              Number(form.volumeGarrafaMl) <= 0
            }
            className={`${buttonPrimary} w-full`}
          >
            <Tags size={17} /> Cadastrar rótulo
          </button>
        </div>
      </div>
      <div className="border border-slate-300 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-black">Rótulos cadastrados</h2>
          <p className="mt-1 text-sm text-slate-500">
            {summary.rotulos.length} vínculo(s) entre produto e controle físico.
          </p>
        </div>
        {summary.rotulos.length ? (
          <div className="divide-y divide-slate-200">
            {summary.rotulos.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <strong className="text-slate-950">{item.nome}</strong>
                  <span className="mt-1 block text-sm text-slate-500">
                    {item.produto.nome} · garrafa de{" "}
                    {fmt.format(item.volumeGarrafaMl)} ml · dose de{" "}
                    {fmt.format(item.volumeDoseMl)} ml
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onToggle(item)}
                  className={`min-h-10 rounded-lg border px-3 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-orange-100 ${item.ativo ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  {item.ativo ? "Desativar" : "Reativar"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Nenhum rótulo cadastrado"
            text="Preencha o formulário para iniciar o controle."
          />
        )}
      </div>
    </section>
  );
}

function CalibrationArea({
  labels,
  calibration,
  setCalibration,
  selected,
  delta,
  busy,
  movements,
  onSave,
}: {
  labels: Label[];
  calibration: { rotuloId: string; saldoAferidoMl: string; observacao: string };
  setCalibration: React.Dispatch<React.SetStateAction<typeof calibration>>;
  selected?: Label;
  delta: number | null;
  busy: boolean;
  movements: Movement[];
  onSave: () => void;
}) {
  if (labels.length === 0)
    return (
      <Empty
        title="Nenhum rótulo disponível"
        text="Cadastre um rótulo antes de fazer a primeira aferição."
      />
    );
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="border border-slate-300 bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-slate-950 text-white">
            <Scale size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black">Nova aferição</h2>
            <p className="text-sm text-slate-500">
              Meça todo o volume disponível deste rótulo.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Field label="Rótulo">
            <select
              className={inputClass}
              value={calibration.rotuloId}
              onChange={(event) =>
                setCalibration({
                  rotuloId: event.target.value,
                  saldoAferidoMl: "",
                  observacao: "",
                })
              }
            >
              {labels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Saldo registrado">
            <div className="mt-1.5 flex h-12 items-center rounded-xl border border-slate-200 bg-slate-100 px-3.5 text-sm font-black tabular-nums text-slate-800">
              {selected ? `${fmt.format(selected.saldoAtualMl)} ml` : "—"}
            </div>
          </Field>
          <Field
            label="Saldo físico aferido (ml)"
            hint="Some o conteúdo de todas as garrafas abertas e fechadas deste rótulo."
          >
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={calibration.saldoAferidoMl}
              onChange={(event) =>
                setCalibration((current) => ({
                  ...current,
                  saldoAferidoMl: event.target.value,
                }))
              }
              placeholder="0"
            />
          </Field>
          <Field label="Observação">
            <input
              className={inputClass}
              value={calibration.observacao}
              onChange={(event) =>
                setCalibration((current) => ({
                  ...current,
                  observacao: event.target.value,
                }))
              }
              placeholder="Ex.: conferência no fechamento"
            />
          </Field>
        </div>
        {delta !== null && calibration.saldoAferidoMl !== "" ? (
          <div
            className={`mt-5 flex items-center justify-between border p-4 ${delta < 0 ? "border-amber-200 bg-amber-50" : delta > 0 ? "border-blue-200 bg-blue-50" : "border-emerald-200 bg-emerald-50"}`}
          >
            <span className="text-sm font-bold text-slate-700">
              Variação que será registrada
            </span>
            <strong className="text-lg tabular-nums">
              {delta > 0 ? "+" : ""}
              {fmt.format(delta)} ml
            </strong>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          disabled={
            busy ||
            !calibration.rotuloId ||
            calibration.saldoAferidoMl === "" ||
            Number(calibration.saldoAferidoMl) < 0
          }
          className={`${buttonPrimary} mt-5 w-full`}
        >
          <Scale size={17} /> Registrar aferição
        </button>
      </div>
      <aside className="border border-slate-300 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-black">Aferições recentes</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Reduções de saldo formam o consumo físico usado na conciliação.
          </p>
        </div>
        {movements.length ? (
          <div className="divide-y divide-slate-200">
            {movements.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{item.rotulo.nome}</strong>
                  <span className="text-xs text-slate-500">
                    {new Date(item.criadoEm).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                  <span className="tabular-nums">
                    {fmt.format(item.saldoAnteriorMl)} ml
                  </span>
                  <ArrowDownUp size={14} />
                  <span className="font-bold tabular-nums text-slate-950">
                    {fmt.format(item.saldoPosteriorMl)} ml
                  </span>
                </div>
                <span className="mt-1 block text-xs text-slate-500">
                  por {item.usuario.nome}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 text-sm text-slate-500">
            Nenhuma aferição registrada.
          </div>
        )}
      </aside>
    </section>
  );
}

function PeriodFilter({
  period,
  setPeriod,
  onFilter,
  extra,
}: {
  period: { inicio: string; fim: string };
  setPeriod: React.Dispatch<
    React.SetStateAction<{ inicio: string; fim: string }>
  >;
  onFilter: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 border border-slate-300 bg-white p-4">
      <Field label="De">
        <input
          type="date"
          className={`${inputClass} w-auto min-w-44`}
          value={period.inicio}
          onChange={(event) =>
            setPeriod((current) => ({ ...current, inicio: event.target.value }))
          }
        />
      </Field>
      <Field label="Até">
        <input
          type="date"
          className={`${inputClass} w-auto min-w-44`}
          value={period.fim}
          onChange={(event) =>
            setPeriod((current) => ({ ...current, fim: event.target.value }))
          }
        />
      </Field>
      {extra}
      <button type="button" onClick={onFilter} className={buttonSecondary}>
        Aplicar período
      </button>
    </div>
  );
}

function HistoryArea({
  labels,
  period,
  setPeriod,
  labelId,
  setLabelId,
  data,
  onFilter,
}: {
  labels: Label[];
  period: { inicio: string; fim: string };
  setPeriod: React.Dispatch<
    React.SetStateAction<{ inicio: string; fim: string }>
  >;
  labelId: string;
  setLabelId: (value: string) => void;
  data: Movement[];
  onFilter: () => void;
}) {
  return (
    <div className="space-y-5">
      <PeriodFilter
        period={period}
        setPeriod={setPeriod}
        onFilter={onFilter}
        extra={
          <Field label="Rótulo">
            <select
              className={`${inputClass} min-w-56`}
              value={labelId}
              onChange={(event) => setLabelId(event.target.value)}
            >
              <option value="">Todos</option>
              {labels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </Field>
        }
      />
      {data.length ? (
        <div className="overflow-x-auto border border-slate-300 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Rótulo</th>
                <th className="px-4 py-3">Operação</th>
                <th className="px-4 py-3 text-right">Antes</th>
                <th className="px-4 py-3 text-right">Depois</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(item.criadoEm).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-bold">{item.rotulo.nome}</td>
                  <td className="px-4 py-3">
                    {item.tipo === "AFERICAO"
                      ? "Aferição"
                      : item.tipo === "ENTRADA"
                        ? "Entrada"
                        : item.tipo === "SALDO_INICIAL"
                          ? "Saldo inicial"
                          : "Ajuste"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {fmt.format(item.saldoAnteriorMl)} ml
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {fmt.format(item.saldoPosteriorMl)} ml
                  </td>
                  <td className="px-4 py-3">{item.usuario.nome}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-500">
                    {item.observacao || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Nenhum movimento no período"
          text="Altere o período ou registre uma entrada ou aferição."
        />
      )}
    </div>
  );
}

function ReconciliationArea({
  period,
  setPeriod,
  data,
  onFilter,
}: {
  period: { inicio: string; fim: string };
  setPeriod: React.Dispatch<
    React.SetStateAction<{ inicio: string; fim: string }>
  >;
  data: Reconciliation[];
  onFilter: () => void;
}) {
  const totals = data.reduce(
    (acc, item) => ({
      sold: acc.sold + Number(item.dosesVendidas),
      measured: acc.measured + Number(item.dosesAferidas),
      difference: acc.difference + Number(item.diferencaDoses),
    }),
    { sold: 0, measured: 0, difference: 0 },
  );
  return (
    <div className="space-y-5">
      <PeriodFilter period={period} setPeriod={setPeriod} onFilter={onFilter} />
      <section className="grid overflow-hidden border border-slate-300 bg-white sm:grid-cols-3">
        <div className="p-5">
          <span className="text-sm font-bold text-slate-500">
            Doses vendidas
          </span>
          <strong className="mt-1 block text-2xl font-black tabular-nums">
            {fmt.format(totals.sold)}
          </strong>
        </div>
        <div className="border-y border-slate-200 p-5 sm:border-x sm:border-y-0">
          <span className="text-sm font-bold text-slate-500">
            Consumo aferido
          </span>
          <strong className="mt-1 block text-2xl font-black tabular-nums">
            {fmt.format(totals.measured)} doses
          </strong>
        </div>
        <div className="p-5">
          <span className="text-sm font-bold text-slate-500">Diferença</span>
          <strong
            className={`mt-1 block text-2xl font-black tabular-nums ${Math.abs(totals.difference) < 1 ? "text-emerald-700" : "text-amber-700"}`}
          >
            {totals.difference > 0 ? "+" : ""}
            {fmt.format(totals.difference)}
          </strong>
        </div>
      </section>
      {data.length ? (
        <div className="overflow-x-auto border border-slate-300 bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Rótulo</th>
                <th className="px-4 py-3 text-right">Consumo físico</th>
                <th className="px-4 py-3 text-right">Doses aferidas</th>
                <th className="px-4 py-3 text-right">Doses vendidas</th>
                <th className="px-4 py-3 text-right">Diferença</th>
                <th className="px-4 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((item) => (
                <tr key={item.rotuloId}>
                  <td className="px-4 py-4">
                    <strong className="block">{item.nome}</strong>
                    <span className="text-xs text-slate-500">
                      {item.produto.nome} · {fmt.format(item.volumeDoseMl)}{" "}
                      ml/dose
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums">
                    {fmt.format(item.consumoAferidoMl)} ml
                  </td>
                  <td className="px-4 py-4 text-right font-bold tabular-nums">
                    {fmt.format(item.dosesAferidas)}
                  </td>
                  <td className="px-4 py-4 text-right font-bold tabular-nums">
                    {fmt.format(item.dosesVendidas)}
                  </td>
                  <td className="px-4 py-4 text-right font-black tabular-nums">
                    {Number(item.diferencaDoses) > 0 ? "+" : ""}
                    {fmt.format(item.diferencaDoses)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`font-bold ${item.status === "CONFERIDO" ? "text-emerald-700" : item.status === "PERDA" ? "text-red-700" : "text-blue-700"}`}
                    >
                      {item.status === "CONFERIDO"
                        ? "Conferido"
                        : item.status === "PERDA"
                          ? "Perda aparente"
                          : "Sobra aparente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Sem rótulos para conciliar"
          text="Cadastre os rótulos e registre aferições para comparar o consumo com as vendas."
        />
      )}
      <p className="text-xs leading-5 text-slate-500">
        A tolerância automática é de uma dose ou 5% das vendas, prevalecendo o
        maior valor. Vendas canceladas não entram no cálculo.
      </p>
    </div>
  );
}
