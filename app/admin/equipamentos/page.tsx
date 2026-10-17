"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Gauge,
  LoaderCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Scale,
  Tags,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { createIdempotencyKey } from "@/app/lib/offline";
import { useToast } from "@/app/contexts/ToastContext";

type Device = {
  id: number;
  nome: string;
  descricao: string | null;
  conexao: string;
  ip: string | null;
  porta: number;
  ativo: boolean;
};
type Product = {
  id: number;
  nome: string;
  preco: number;
  vendidoPorPeso: boolean;
  unidadePeso: "KG" | "G";
  taraPadrao: number;
};
type Model = {
  id: number;
  nome: string;
  larguraMm: number;
  alturaMm: number;
  campos: string;
  ativo: boolean;
  dispositivo: { id: number; nome: string } | null;
};
type Emission = {
  id: number;
  itemNome: string;
  lote: string | null;
  copias: number;
  motivo: string | null;
  criadoEm: string;
  reimpressaoDeId: number | null;
  modelo: { nome: string };
  usuario: { nome: string };
};
type Calibration = {
  id: number;
  referencia: number;
  leitura: number;
  desvio: number;
  aprovado: boolean;
  criadoEm: string;
  dispositivo: { nome: string };
  usuario: { nome: string };
};
type Summary = {
  balancas: Device[];
  impressoras: Device[];
  modelos: Model[];
  emissoes: Emission[];
  afericoes: Calibration[];
  produtos: Product[];
  mesas: { id: number; numero: number; status: string }[];
};

const input =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
const fields = [
  "ITEM",
  "LOTE",
  "PRODUCAO",
  "VALIDADE",
  "QUANTIDADE",
  "RESPONSAVEL",
] as const;

export default function EquipmentPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<Summary | null>(null);
  const [tab, setTab] = useState<"ROTULOS" | "BALANCA" | "HISTORICO">(
    "ROTULOS",
  );
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState({
    nome: "",
    larguraMm: "58",
    alturaMm: "40",
    dispositivoId: "",
    campos: [...fields] as string[],
  });
  const [label, setLabel] = useState({
    modeloId: "",
    produtoId: "",
    itemNome: "",
    lote: "",
    produzidoEm: "",
    validadeEm: "",
    quantidade: "",
    unidade: "UN",
    copias: "1",
    origemTipo: "AVULSO",
  });
  const [scale, setScale] = useState({
    nome: "",
    descricao: "",
    conexao: "USB",
    ip: "",
    porta: "9100",
  });
  const [weight, setWeight] = useState({
    produtoId: "",
    dispositivoId: "",
    pesoBruto: "",
    tara: "0",
    origem: "MANUAL",
  });
  const [destination, setDestination] = useState({ type: "MESA", id: "" });
  const [calibration, setCalibration] = useState({
    dispositivoId: "",
    referencia: "1",
    leitura: "",
    tolerancia: "0.005",
  });
  const [reprint, setReprint] = useState<{ id: number; reason: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<Summary>("/equipamentos/resumo"));
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os equipamentos.",
        "error",
      );
    }
  }, [showToast]);
  useEffect(() => {
    void load();
  }, [load]);

  const selectedProduct = useMemo(
    () => data?.produtos.find((item) => item.id === Number(weight.produtoId)),
    [data, weight.produtoId],
  );
  const net = Math.max(
    0,
    Number(weight.pesoBruto || 0) - Number(weight.tara || 0),
  );
  const total = net * Number(selectedProduct?.preco ?? 0);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      showToast(message, "success");
      await load();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const selectLabelProduct = (value: string) => {
    const product = data?.produtos.find((item) => item.id === Number(value));
    setLabel((current) => ({
      ...current,
      produtoId: value,
      itemNome: product?.nome ?? current.itemNome,
      unidade: product?.unidadePeso ?? "UN",
    }));
  };

  const registerAndLaunch = async () => {
    if (!destination.id)
      return showToast("Informe a mesa ou comanda de destino.", "error");
    setBusy(true);
    try {
      const weighing = await apiFetch<{ id: number }>(
        "/equipamentos/pesagens",
        {
          method: "POST",
          body: {
            ...weight,
            produtoId: Number(weight.produtoId),
            dispositivoId: weight.dispositivoId
              ? Number(weight.dispositivoId)
              : null,
            pesoBruto: Number(weight.pesoBruto),
            tara: Number(weight.tara),
            chaveIdempotencia: createIdempotencyKey(),
          },
        },
      );
      await apiFetch(`/equipamentos/pesagens/${weighing.id}/lancar`, {
        method: "POST",
        body: {
          [destination.type === "MESA" ? "mesaId" : "comandaId"]: Number(
            destination.id,
          ),
        },
      });
      showToast(
        "Pesagem lançada no pedido sem possibilidade de reutilização.",
        "success",
      );
      await load();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível lançar a pesagem.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-[1560px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-orange-600">
              <Gauge size={14} /> Operação rastreável
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Rótulos e balança
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Prepare etiquetas, confira a pesagem e mantenha o histórico físico
              da operação.
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700"
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        </header>

        <nav
          className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1"
          aria-label="Áreas do módulo"
        >
          {[
            ["ROTULOS", "Rótulos", Printer],
            ["BALANCA", "Balança", Scale],
            ["HISTORICO", "Histórico", Tags],
          ].map(([value, title, Icon]) => (
            <button
              key={String(value)}
              onClick={() => setTab(value as typeof tab)}
              className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${tab === value ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Icon size={16} />
              {String(title)}
            </button>
          ))}
        </nav>

        {tab === "ROTULOS" && (
          <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr_.9fr]">
            <Workbench
              title="Modelo da etiqueta"
              caption="Defina o formato e os campos que irão para a impressora."
            >
              <div className="space-y-3">
                <Field label="Nome">
                  <input
                    className={input}
                    value={model.nome}
                    onChange={(event) =>
                      setModel({ ...model, nome: event.target.value })
                    }
                    placeholder="Produção refrigerada"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Largura (mm)">
                    <input
                      className={input}
                      type="number"
                      value={model.larguraMm}
                      onChange={(event) =>
                        setModel({ ...model, larguraMm: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Altura (mm)">
                    <input
                      className={input}
                      type="number"
                      value={model.alturaMm}
                      onChange={(event) =>
                        setModel({ ...model, alturaMm: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Impressora">
                  <select
                    className={input}
                    value={model.dispositivoId}
                    onChange={(event) =>
                      setModel({ ...model, dispositivoId: event.target.value })
                    }
                  >
                    <option value="">Selecione</option>
                    {data?.impressoras.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </Field>
                <div>
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Campos impressos
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {fields.map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={model.campos.includes(item)}
                          onChange={(event) =>
                            setModel({
                              ...model,
                              campos: event.target.checked
                                ? [...model.campos, item]
                                : model.campos.filter(
                                    (field) => field !== item,
                                  ),
                            })
                          }
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        apiFetch("/equipamentos/modelos", {
                          method: "POST",
                          body: {
                            ...model,
                            larguraMm: Number(model.larguraMm),
                            alturaMm: Number(model.alturaMm),
                            dispositivoId: Number(model.dispositivoId),
                          },
                        }),
                      "Modelo de rótulo criado.",
                    )
                  }
                  className="h-11 w-full rounded-xl bg-slate-950 text-sm font-black text-white disabled:opacity-50"
                >
                  Salvar modelo
                </button>
              </div>
            </Workbench>

            <Workbench
              title="Prévia física"
              caption="A etiqueta abaixo usa os dados atuais antes de entrar na fila."
            >
              <div className="mx-auto max-w-sm border-2 border-dashed border-slate-400 bg-white p-6 font-mono text-sm shadow-[0_8px_30px_rgba(15,23,42,.08)]">
                <strong className="block border-b-2 border-slate-900 pb-2 text-lg uppercase">
                  {label.itemNome || "NOME DO ITEM"}
                </strong>
                <p className="mt-3">Lote: {label.lote || "—"}</p>
                <p>Produção: {label.produzidoEm || "—"}</p>
                <p>Validade: {label.validadeEm || "—"}</p>
                <p>
                  Quantidade: {label.quantidade || "—"} {label.unidade}
                </p>
                <p className="mt-3 border-t border-slate-400 pt-2 text-xs">
                  Responsável: usuário conectado
                </p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Field label="Modelo">
                  <select
                    className={input}
                    value={label.modeloId}
                    onChange={(event) =>
                      setLabel({ ...label, modeloId: event.target.value })
                    }
                  >
                    <option value="">Selecione</option>
                    {data?.modelos
                      .filter((item) => item.ativo)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Produto">
                  <select
                    className={input}
                    value={label.produtoId}
                    onChange={(event) => selectLabelProduct(event.target.value)}
                  >
                    <option value="">Avulso</option>
                    {data?.produtos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Item">
                  <input
                    className={input}
                    value={label.itemNome}
                    onChange={(event) =>
                      setLabel({ ...label, itemNome: event.target.value })
                    }
                  />
                </Field>
                <Field label="Lote">
                  <input
                    className={input}
                    value={label.lote}
                    onChange={(event) =>
                      setLabel({ ...label, lote: event.target.value })
                    }
                  />
                </Field>
                <Field label="Produção">
                  <input
                    type="date"
                    className={input}
                    value={label.produzidoEm}
                    onChange={(event) =>
                      setLabel({ ...label, produzidoEm: event.target.value })
                    }
                  />
                </Field>
                <Field label="Validade">
                  <input
                    type="date"
                    className={input}
                    value={label.validadeEm}
                    onChange={(event) =>
                      setLabel({ ...label, validadeEm: event.target.value })
                    }
                  />
                </Field>
                <Field label="Quantidade">
                  <input
                    type="number"
                    step="0.001"
                    className={input}
                    value={label.quantidade}
                    onChange={(event) =>
                      setLabel({ ...label, quantidade: event.target.value })
                    }
                  />
                </Field>
                <Field label="Cópias">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className={input}
                    value={label.copias}
                    onChange={(event) =>
                      setLabel({ ...label, copias: event.target.value })
                    }
                  />
                </Field>
              </div>
              <button
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      apiFetch("/equipamentos/rotulos/emitir", {
                        method: "POST",
                        body: {
                          ...label,
                          modeloId: Number(label.modeloId),
                          produtoId: label.produtoId
                            ? Number(label.produtoId)
                            : null,
                          quantidade: label.quantidade
                            ? Number(label.quantidade)
                            : null,
                          produzidoEm: label.produzidoEm
                            ? `${label.produzidoEm}T12:00:00`
                            : null,
                          validadeEm: label.validadeEm
                            ? `${label.validadeEm}T12:00:00`
                            : null,
                          copias: Number(label.copias),
                        },
                      }),
                    "Etiqueta enviada para a fila de impressão.",
                  )
                }
                className="mt-4 h-11 w-full rounded-xl bg-orange-600 text-sm font-black text-white disabled:opacity-50"
              >
                Emitir etiqueta
              </button>
            </Workbench>

            <Workbench
              title="Modelos disponíveis"
              caption="A impressão sempre usa uma configuração versionada na emissão."
            >
              <div className="divide-y divide-slate-100">
                {data?.modelos.map((item) => (
                  <div key={item.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm text-slate-900">
                        {item.nome}
                      </strong>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-black ${item.ativo ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}
                      >
                        {item.ativo ? "ATIVO" : "INATIVO"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.larguraMm} × {item.alturaMm} mm ·{" "}
                      {item.dispositivo?.nome ?? "sem impressora"}
                    </p>
                  </div>
                ))}
              </div>
            </Workbench>
          </section>
        )}

        {tab === "BALANCA" && (
          <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr_.8fr]">
            <Workbench
              title="Equipamento"
              caption="Cadastre a conexão utilizada pelo agente local do Windows."
            >
              <div className="space-y-3">
                <Field label="Nome">
                  <input
                    className={input}
                    value={scale.nome}
                    onChange={(event) =>
                      setScale({ ...scale, nome: event.target.value })
                    }
                  />
                </Field>
                <Field label="Descrição">
                  <input
                    className={input}
                    value={scale.descricao}
                    onChange={(event) =>
                      setScale({ ...scale, descricao: event.target.value })
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Conexão">
                    <select
                      className={input}
                      value={scale.conexao}
                      onChange={(event) =>
                        setScale({ ...scale, conexao: event.target.value })
                      }
                    >
                      <option>USB</option>
                      <option>TCP</option>
                    </select>
                  </Field>
                  <Field label="Porta">
                    <input
                      className={input}
                      type="number"
                      value={scale.porta}
                      onChange={(event) =>
                        setScale({ ...scale, porta: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Destino / fila">
                  <input
                    className={input}
                    value={scale.ip}
                    onChange={(event) =>
                      setScale({ ...scale, ip: event.target.value })
                    }
                    placeholder="Nome USB ou IP local"
                  />
                </Field>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        apiFetch("/equipamentos/balancas", {
                          method: "POST",
                          body: { ...scale, porta: Number(scale.porta) },
                        }),
                      "Balança cadastrada.",
                    )
                  }
                  className="h-11 w-full rounded-xl bg-slate-950 text-sm font-black text-white"
                >
                  Cadastrar balança
                </button>
                <div className="border-t border-slate-200 pt-3">
                  {data?.balancas.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <strong>{item.nome}</strong>
                      <span
                        className={
                          item.ativo ? "text-emerald-700" : "text-slate-400"
                        }
                      >
                        {item.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Produtos vendidos por peso
                  </h3>
                  <div className="mt-2 max-h-56 divide-y divide-slate-100 overflow-y-auto">
                    {data?.produtos.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <div className="min-w-0">
                          <strong className="block truncate text-xs text-slate-900">
                            {item.nome}
                          </strong>
                          <span className="text-[11px] text-slate-500">
                            R$ {Number(item.preco).toFixed(2)} /{" "}
                            {item.unidadePeso}
                          </span>
                        </div>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () =>
                                apiFetch(
                                  `/equipamentos/produtos/${item.id}/peso`,
                                  {
                                    method: "PATCH",
                                    body: {
                                      vendidoPorPeso: !item.vendidoPorPeso,
                                      unidadePeso: item.unidadePeso,
                                      taraPadrao: Number(item.taraPadrao),
                                    },
                                  },
                                ),
                              item.vendidoPorPeso
                                ? "Venda por peso desativada."
                                : "Venda por peso ativada.",
                            )
                          }
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${item.vendidoPorPeso ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}
                        >
                          {item.vendidoPorPeso ? "ATIVO" : "ATIVAR"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Workbench>
            <Workbench
              title="Leitura e preço"
              caption="O cálculo acontece no backend e a leitura só pode ser usada uma vez."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Produto">
                  <select
                    className={input}
                    value={weight.produtoId}
                    onChange={(event) => {
                      const product = data?.produtos.find(
                        (item) => item.id === Number(event.target.value),
                      );
                      setWeight({
                        ...weight,
                        produtoId: event.target.value,
                        tara: String(product?.taraPadrao ?? 0),
                      });
                    }}
                  >
                    <option value="">Selecione</option>
                    {data?.produtos
                      .filter((item) => item.vendidoPorPeso)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome} · R$ {Number(item.preco).toFixed(2)}/
                          {item.unidadePeso}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Balança">
                  <select
                    className={input}
                    value={weight.dispositivoId}
                    onChange={(event) =>
                      setWeight({
                        ...weight,
                        dispositivoId: event.target.value,
                      })
                    }
                  >
                    <option value="">Entrada manual</option>
                    {data?.balancas
                      .filter((item) => item.ativo)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Peso bruto">
                  <input
                    className={input}
                    type="number"
                    min="0"
                    step="0.001"
                    value={weight.pesoBruto}
                    onChange={(event) =>
                      setWeight({ ...weight, pesoBruto: event.target.value })
                    }
                  />
                </Field>
                <Field label="Tara">
                  <input
                    className={input}
                    type="number"
                    min="0"
                    step="0.001"
                    value={weight.tara}
                    onChange={(event) =>
                      setWeight({ ...weight, tara: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="my-5 bg-slate-950 px-5 py-6 text-white">
                <span className="text-xs font-black uppercase tracking-[.16em] text-slate-400">
                  Peso líquido
                </span>
                <div className="mt-1 flex items-end justify-between gap-4">
                  <strong className="text-5xl font-black tabular-nums">
                    {net.toFixed(3)}{" "}
                    <small className="text-xl text-slate-400">
                      {selectedProduct?.unidadePeso ?? "KG"}
                    </small>
                  </strong>
                  <span className="text-xl font-black text-orange-400">
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="mb-3 grid grid-cols-[130px_1fr] gap-3">
                <Field label="Destino">
                  <select
                    className={input}
                    value={destination.type}
                    onChange={(event) =>
                      setDestination({
                        ...destination,
                        type: event.target.value,
                      })
                    }
                  >
                    <option value="MESA">Mesa</option>
                    <option value="COMANDA">Balcão</option>
                  </select>
                </Field>
                <Field
                  label={destination.type === "MESA" ? "Mesa" : "ID da comanda"}
                >
                  {destination.type === "MESA" ? (
                    <select
                      className={input}
                      value={destination.id}
                      onChange={(event) =>
                        setDestination({
                          ...destination,
                          id: event.target.value,
                        })
                      }
                    >
                      <option value="">Selecione</option>
                      {data?.mesas.map((table) => (
                        <option key={table.id} value={table.id}>
                          Mesa {table.numero} · {table.status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={input}
                      type="number"
                      min="1"
                      value={destination.id}
                      onChange={(event) =>
                        setDestination({
                          ...destination,
                          id: event.target.value,
                        })
                      }
                    />
                  )}
                </Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  disabled={busy || !weight.produtoId || net <= 0}
                  onClick={() =>
                    void run(
                      () =>
                        apiFetch("/equipamentos/pesagens", {
                          method: "POST",
                          body: {
                            ...weight,
                            produtoId: Number(weight.produtoId),
                            dispositivoId: weight.dispositivoId
                              ? Number(weight.dispositivoId)
                              : null,
                            pesoBruto: Number(weight.pesoBruto),
                            tara: Number(weight.tara),
                            chaveIdempotencia: createIdempotencyKey(),
                          },
                        }),
                      "Pesagem registrada e pronta para ser vinculada ao pedido.",
                    )
                  }
                  className="h-11 rounded-xl border border-orange-300 bg-orange-50 text-sm font-black text-orange-800 disabled:opacity-40"
                >
                  Somente registrar
                </button>
                <button
                  disabled={
                    busy || !weight.produtoId || net <= 0 || !destination.id
                  }
                  onClick={() => void registerAndLaunch()}
                  className="h-11 rounded-xl bg-orange-600 text-sm font-black text-white disabled:opacity-40"
                >
                  Pesar e lançar
                </button>
              </div>
            </Workbench>
            <Workbench
              title="Aferição"
              caption="Compare um peso conhecido e registre o resultado."
            >
              <div className="space-y-3">
                <Field label="Balança">
                  <select
                    className={input}
                    value={calibration.dispositivoId}
                    onChange={(event) =>
                      setCalibration({
                        ...calibration,
                        dispositivoId: event.target.value,
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    {data?.balancas
                      .filter((item) => item.ativo)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Peso de referência">
                  <input
                    className={input}
                    type="number"
                    step="0.001"
                    value={calibration.referencia}
                    onChange={(event) =>
                      setCalibration({
                        ...calibration,
                        referencia: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Leitura obtida">
                  <input
                    className={input}
                    type="number"
                    step="0.001"
                    value={calibration.leitura}
                    onChange={(event) =>
                      setCalibration({
                        ...calibration,
                        leitura: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Tolerância">
                  <input
                    className={input}
                    type="number"
                    step="0.001"
                    value={calibration.tolerancia}
                    onChange={(event) =>
                      setCalibration({
                        ...calibration,
                        tolerancia: event.target.value,
                      })
                    }
                  />
                </Field>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        apiFetch(
                          `/equipamentos/balancas/${calibration.dispositivoId}/afericoes`,
                          {
                            method: "POST",
                            body: {
                              referencia: Number(calibration.referencia),
                              leitura: Number(calibration.leitura),
                              tolerancia: Number(calibration.tolerancia),
                            },
                          },
                        ),
                      "Aferição registrada.",
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white text-sm font-black text-slate-800"
                >
                  Registrar aferição
                </button>
                <div className="border-t border-slate-200 pt-3">
                  {data?.afericoes.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2">
                      <CheckCircle2
                        size={16}
                        className={
                          item.aprovado ? "text-emerald-600" : "text-rose-600"
                        }
                      />
                      <div>
                        <strong className="block text-xs text-slate-900">
                          {item.dispositivo.nome}
                        </strong>
                        <span className="text-xs text-slate-500">
                          desvio {Number(item.desvio).toFixed(3)} ·{" "}
                          {item.aprovado ? "aprovada" : "reprovada"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Workbench>
          </section>
        )}

        {tab === "HISTORICO" && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-black text-slate-950">Emissões recentes</h2>
              <p className="text-xs text-slate-500">
                Toda reimpressão exige um motivo e cria uma nova linha
                auditável.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Modelo</th>
                    <th className="px-4 py-3">Lote</th>
                    <th className="px-4 py-3">Cópias</th>
                    <th className="px-4 py-3">Operador</th>
                    <th className="px-4 py-3">Emissão</th>
                    <th className="px-4 py-3 text-right">Reimpressão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.emissoes.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-bold text-slate-950">
                        {item.itemNome}
                        {item.reimpressaoDeId && (
                          <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-[10px] text-amber-800">
                            REIMPRESSÃO
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.modelo.nome}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.lote ?? "—"}
                      </td>
                      <td className="px-4 py-3">{item.copias}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.usuario.nome}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(item.criadoEm).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reprint?.id === item.id ? (
                          <div className="ml-auto flex max-w-sm gap-2">
                            <input
                              className={input}
                              autoFocus
                              placeholder="Motivo obrigatório"
                              value={reprint.reason}
                              onChange={(event) =>
                                setReprint({
                                  id: item.id,
                                  reason: event.target.value,
                                })
                              }
                            />
                            <button
                              disabled={
                                busy || reprint.reason.trim().length < 5
                              }
                              onClick={() =>
                                void run(async () => {
                                  await apiFetch(
                                    `/equipamentos/rotulos/${item.id}/reimprimir`,
                                    {
                                      method: "POST",
                                      body: { motivo: reprint.reason },
                                    },
                                  );
                                  setReprint(null);
                                }, "Reimpressão enviada para a fila.")
                              }
                              className="rounded-xl bg-slate-950 px-3 text-xs font-black text-white disabled:opacity-40"
                            >
                              Enviar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setReprint({ id: item.id, reason: "" })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black"
                          >
                            <RotateCcw size={13} /> Reimprimir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      {busy && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-xl">
          <LoaderCircle className="animate-spin" size={16} /> Processando
        </div>
      )}
    </main>
  );
}

function Workbench({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{caption}</p>
      </div>
      {children}
    </article>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
