"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  LoaderCircle,
  MapPin,
  Minus,
  PhoneCall,
  Plus,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { useToast } from "@/contexts/ToastContext";

type Size = { id: number; nome: string; valor: number };
type Complement = { id: number; nome: string; valor: number };
type ComplementGroup = {
  id: number;
  nome: string;
  obrigatorio: boolean;
  minEscolhas: number;
  maxEscolhas: number | null;
  complementos: Complement[];
};
type Product = {
  id: number;
  nome: string;
  descricao?: string | null;
  preco: number;
  valorPromo?: number | null;
  tipo?: string;
  tipoTamanho?: { tamanhos: Size[] } | null;
  gruposComplemento?: Array<{ grupo: ComplementGroup }>;
};
type Category = { id: number; nome: string; produtos: Product[] };
type CartItem = {
  key: string;
  produtoId: number;
  nome: string;
  quantidade: number;
  tamanhoId?: number;
  detalhe: string;
  complementos: Array<{ complementoId: number }>;
  observacao?: string;
  unitPrice: number;
};
type Quote = {
  taxaEntrega: number;
  pedidoMinimo: number;
  estimativaMin: number;
  zona: { id: number; nome: string };
};
type CreatedOrder = {
  deliveryPedidoId: number;
  total: number;
  codigoEntrega?: string | null;
  trackingToken: string;
};

const money = (value: number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const EMPTY_FORM = {
  origem: "TELEFONE",
  nome: "",
  telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "Salvador",
  uf: "BA",
  referencia: "",
  agendadoPara: "",
};

export function DeliveryAssistedOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [sizeId, setSizeId] = useState<number | null>(null);
  const [complementIds, setComplementIds] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [notificationConsent, setNotificationConsent] = useState(false);
  const [created, setCreated] = useState<CreatedOrder | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<Category[]>("/delivery/catalog")
      .then(setCategories)
      .catch((error) =>
        showToast(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o cardápio.",
          "error",
        ),
      )
      .finally(() => setLoading(false));
  }, [open, showToast]);

  const products = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return categories
      .flatMap((category) =>
        category.produtos.map((product) => ({
          ...product,
          category: category.nome,
        })),
      )
      .filter(
        (product) =>
          !normalized ||
          `${product.nome} ${product.descricao ?? ""} ${product.category}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalized),
      );
  }, [categories, query]);
  const selectedSize = selected?.tipoTamanho?.tamanhos.find(
    (item) => item.id === sizeId,
  );
  const selectedComplements =
    selected?.gruposComplemento
      ?.flatMap((item) => item.grupo.complementos)
      .filter((item) => complementIds.includes(item.id)) ?? [];
  const selectedPrice =
    Number(
      selectedSize?.valor ?? selected?.valorPromo ?? selected?.preco ?? 0,
    ) + selectedComplements.reduce((sum, item) => sum + Number(item.valor), 0);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantidade,
    0,
  );

  const setField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (["cep", "bairro", "agendadoPara"].includes(field)) setQuote(null);
  };
  const chooseProduct = (product: Product) => {
    setSelected(product);
    setSizeId(product.tipoTamanho?.tamanhos?.[0]?.id ?? null);
    setComplementIds([]);
    setQuantity(1);
    setObservation("");
  };
  const toggleComplement = (group: ComplementGroup, complementId: number) => {
    const groupIds = new Set(group.complementos.map((item) => item.id));
    const current = complementIds.filter((item) => groupIds.has(item));
    if (complementIds.includes(complementId))
      setComplementIds((value) =>
        value.filter((item) => item !== complementId),
      );
    else if (group.maxEscolhas === 1)
      setComplementIds((value) => [
        ...value.filter((item) => !groupIds.has(item)),
        complementId,
      ]);
    else if (group.maxEscolhas === null || current.length < group.maxEscolhas)
      setComplementIds((value) => [...value, complementId]);
  };
  const addItem = () => {
    if (!selected) return;
    if (selected.tipo === "POR_TAMANHO" && !sizeId)
      return showToast("Escolha o tamanho.", "error");
    for (const link of selected.gruposComplemento ?? []) {
      const ids = new Set(link.grupo.complementos.map((item) => item.id));
      const count = complementIds.filter((item) => ids.has(item)).length;
      const minimum = link.grupo.obrigatorio
        ? Math.max(1, link.grupo.minEscolhas)
        : link.grupo.minEscolhas;
      if (count < minimum)
        return showToast(
          `Escolha pelo menos ${minimum} opção em ${link.grupo.nome}.`,
          "error",
        );
    }
    const key = `${selected.id}:${sizeId ?? ""}:${[...complementIds].sort().join(",")}:${observation.trim()}`;
    const item: CartItem = {
      key,
      produtoId: selected.id,
      nome: selected.nome,
      quantidade: quantity,
      tamanhoId: sizeId ?? undefined,
      detalhe: [
        selectedSize?.nome,
        ...selectedComplements.map((value) => value.nome),
        observation.trim(),
      ]
        .filter(Boolean)
        .join(" · "),
      complementos: complementIds.map((complementoId) => ({ complementoId })),
      observacao: observation.trim() || undefined,
      unitPrice: selectedPrice,
    };
    setCart((current) => {
      const existing = current.find((value) => value.key === key);
      return existing
        ? current.map((value) =>
            value.key === key
              ? { ...value, quantidade: value.quantidade + quantity }
              : value,
          )
        : [...current, item];
    });
    setSelected(null);
  };
  const calculateQuote = async () => {
    if (!form.bairro.trim()) return showToast("Informe o bairro.", "error");
    try {
      const result = await apiFetch<Quote>("/delivery/quote", {
        method: "POST",
        body: {
          bairro: form.bairro,
          cep: form.cep,
          agendadoPara: form.agendadoPara
            ? new Date(form.agendadoPara).toISOString()
            : undefined,
        },
      });
      setQuote(result);
      return result;
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível calcular a entrega.",
        "error",
      );
      return null;
    }
  };
  const createOrder = async () => {
    if (
      form.nome.trim().length < 2 ||
      form.telefone.replace(/\D/g, "").length < 10
    )
      return showToast("Informe nome e telefone válidos.", "error");
    if (
      !form.logradouro.trim() ||
      !form.bairro.trim() ||
      !form.cidade.trim() ||
      form.uf.trim().length !== 2
    )
      return showToast("Complete o endereço.", "error");
    if (!cart.length) return showToast("Adicione pelo menos um item.", "error");
    setSubmitting(true);
    try {
      const currentQuote = quote ?? (await calculateQuote());
      if (!currentQuote) return;
      if (subtotal < Number(currentQuote.pedidoMinimo))
        throw new Error(
          `O pedido mínimo é ${money(Number(currentQuote.pedidoMinimo))}.`,
        );
      const result = await apiFetch<CreatedOrder>("/delivery/orders", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: {
          ...form,
          aceitaNotificacoes: notificationConsent,
          agendadoPara: form.agendadoPara
            ? new Date(form.agendadoPara).toISOString()
            : undefined,
          itens: cart.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            tamanhoId: item.tamanhoId,
            complementos: item.complementos,
            observacao: item.observacao,
          })),
        },
      });
      setCreated(result);
      await onCreated();
      showToast(`Pedido #${result.deliveryPedidoId} criado.`, "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o pedido.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const close = () => {
    if (submitting) return;
    setForm(EMPTY_FORM);
    setCart([]);
    setQuote(null);
    setCreated(null);
    setSelected(null);
    setNotificationConsent(false);
    onClose();
  };
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 p-0 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assisted-order-title"
    >
      <section className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden bg-slate-100 shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2
              id="assisted-order-title"
              className="text-2xl font-black text-slate-950"
            >
              Novo pedido assistido
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Registre a ligação ou conversa e monte a entrega no mesmo fluxo do
              cliente.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="rounded-full bg-slate-100 p-2 text-slate-500"
          >
            <X size={20} />
          </button>
        </header>
        {created ? (
          <div className="grid flex-1 place-items-center p-6">
            <div className="max-w-md text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check size={30} />
              </span>
              <h3 className="mt-5 text-3xl font-black text-slate-950">
                Pedido #{created.deliveryPedidoId} criado
              </h3>
              <p className="mt-2 text-slate-600">
                Total confirmado: {money(Number(created.total))}
              </p>
              {created.codigoEntrega && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <span className="text-sm font-bold text-emerald-700">
                    Código de recebimento
                  </span>
                  <strong className="mt-1 block text-3xl tracking-[0.25em] text-emerald-950">
                    {created.codigoEntrega}
                  </strong>
                  <p className="mt-1 text-xs text-emerald-700">
                    Envie este código ao cliente.
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={close}
                className="mt-6 h-12 w-full rounded-xl bg-slate-950 font-black text-white"
              >
                Voltar ao monitor
              </button>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_390px]">
            <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.85fr)_minmax(340px,1.15fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={18} className="text-orange-600" />
                    <h3 className="font-black text-slate-950">
                      Atendimento e destino
                    </h3>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field label="Origem">
                      <select
                        value={form.origem}
                        onChange={(event) =>
                          setField("origem", event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="TELEFONE">Telefone</option>
                        <option value="WHATSAPP">WhatsApp</option>
                      </select>
                    </Field>
                    <Field label="Telefone">
                      <input
                        inputMode="tel"
                        value={form.telefone}
                        onChange={(event) =>
                          setField("telefone", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Nome" wide>
                      <input
                        value={form.nome}
                        onChange={(event) =>
                          setField("nome", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="CEP">
                      <input
                        inputMode="numeric"
                        value={form.cep}
                        onChange={(event) =>
                          setField("cep", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Bairro">
                      <input
                        value={form.bairro}
                        onChange={(event) =>
                          setField("bairro", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Rua ou avenida" wide>
                      <input
                        value={form.logradouro}
                        onChange={(event) =>
                          setField("logradouro", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Número">
                      <input
                        value={form.numero}
                        onChange={(event) =>
                          setField("numero", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Complemento">
                      <input
                        value={form.complemento}
                        onChange={(event) =>
                          setField("complemento", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Cidade">
                      <input
                        value={form.cidade}
                        onChange={(event) =>
                          setField("cidade", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="UF">
                      <input
                        value={form.uf}
                        onChange={(event) =>
                          setField(
                            "uf",
                            event.target.value.toUpperCase().slice(0, 2),
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Referência" wide>
                      <input
                        value={form.referencia}
                        onChange={(event) =>
                          setField("referencia", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Agendar para" wide>
                      <input
                        type="datetime-local"
                        value={form.agendadoPara}
                        onChange={(event) =>
                          setField("agendadoPara", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <input type="checkbox" checked={notificationConsent} onChange={(event) => setNotificationConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
                    <span className="text-xs leading-5 text-emerald-800"><strong className="block text-sm text-emerald-950">Cliente autorizou atualizações no WhatsApp</strong>Marque somente após confirmar a preferência durante o atendimento.</span>
                  </label>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={18} className="text-orange-600" />
                    <h3 className="font-black text-slate-950">Cardápio</h3>
                  </div>
                  <label className="relative mt-4 block">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar produto"
                      className={`${inputClass} pl-9`}
                    />
                  </label>
                  {loading ? (
                    <div className="grid h-48 place-items-center">
                      <LoaderCircle className="animate-spin text-orange-600" />
                    </div>
                  ) : (
                    <div className="mt-3 grid max-h-[510px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {products.map((product) => (
                        <button
                          type="button"
                          key={product.id}
                          onClick={() => chooseProduct(product)}
                          className="rounded-xl border border-slate-200 p-3 text-left hover:border-orange-400 hover:bg-orange-50"
                        >
                          <strong className="block text-sm text-slate-950">
                            {product.nome}
                          </strong>
                          <span className="mt-1 block text-xs text-slate-500">
                            {product.tipo === "POR_TAMANHO"
                              ? "Escolher tamanho"
                              : money(
                                  Number(product.valorPromo ?? product.preco),
                                )}
                          </span>
                        </button>
                      ))}
                      {!products.length && (
                        <p className="col-span-2 py-10 text-center text-sm text-slate-400">
                          Nenhum produto disponível.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </div>
            <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-white">
              <header className="border-b border-slate-100 p-5">
                <h3 className="text-lg font-black text-slate-950">
                  Comanda da entrega
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {cart.length
                    ? `${cart.length} item(ns) configurado(s)`
                    : "Escolha os itens no cardápio."}
                </p>
              </header>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                {cart.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex justify-between gap-3">
                      <strong className="text-sm text-slate-950">
                        {item.quantidade}× {item.nome}
                      </strong>
                      <strong className="text-sm">
                        {money(item.unitPrice * item.quantidade)}
                      </strong>
                    </div>
                    {item.detalhe && (
                      <p className="mt-1 text-xs text-slate-500">
                        {item.detalhe}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setCart((current) =>
                          current.filter((value) => value.key !== item.key),
                        )
                      }
                      className="mt-2 text-xs font-bold text-red-600"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <footer className="border-t border-slate-200 p-4">
                <button
                  type="button"
                  onClick={() => void calculateQuote()}
                  className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-300 font-black text-orange-700"
                >
                  <MapPin size={17} />{" "}
                  {quote ? "Recalcular entrega" : "Calcular entrega"}
                </button>
                {quote && (
                  <div className="mb-3 rounded-xl bg-slate-100 p-3 text-sm">
                    <div className="flex justify-between">
                      <span>{quote.zona.nome}</span>
                      <strong>{money(Number(quote.taxaEntrega))}</strong>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Previsão de {quote.estimativaMin} min
                    </p>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Itens</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="mt-1 flex justify-between text-xl font-black text-slate-950">
                  <span>Total</span>
                  <span>
                    {money(subtotal + Number(quote?.taxaEntrega ?? 0))}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void createOrder()}
                  disabled={submitting || !cart.length}
                  className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {submitting && (
                    <LoaderCircle size={18} className="animate-spin" />
                  )}{" "}
                  Criar pedido
                </button>
              </footer>
            </aside>
          </div>
        )}
      </section>
      {selected && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/60 p-4">
          <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-950">
                  {selected.nome}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Configure antes de adicionar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full bg-slate-100 p-2"
              >
                <X size={18} />
              </button>
            </div>
            {selected.tipoTamanho?.tamanhos?.length ? (
              <fieldset className="mt-5">
                <legend className="font-black">Tamanho</legend>
                <div className="mt-2 space-y-1">
                  {selected.tipoTamanho.tamanhos.map((size) => (
                    <label
                      key={size.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                    >
                      <span>{size.nome}</span>
                      <span className="flex items-center gap-3">
                        <strong>{money(Number(size.valor))}</strong>
                        <input
                          type="radio"
                          name="assisted-size"
                          checked={sizeId === size.id}
                          onChange={() => setSizeId(size.id)}
                          className="accent-orange-600"
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <strong className="mt-5 block text-orange-700">
                {money(selectedPrice)}
              </strong>
            )}
            {selected.gruposComplemento?.map((link) => (
              <fieldset key={link.grupo.id} className="mt-5">
                <legend className="font-black">
                  {link.grupo.nome}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    {link.grupo.obrigatorio ? "obrigatório" : "opcional"}
                  </span>
                </legend>
                <div className="mt-2 space-y-1">
                  {link.grupo.complementos.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      <span>{item.nome}</span>
                      <span className="flex items-center gap-3">
                        <span>+ {money(Number(item.valor))}</span>
                        <input
                          type="checkbox"
                          checked={complementIds.includes(item.id)}
                          onChange={() => toggleComplement(link.grupo, item.id)}
                          className="accent-orange-600"
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <label className="mt-5 block">
              <span className="font-black">Observação</span>
              <textarea
                rows={2}
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3"
              />
            </label>
            <footer className="mt-5 flex gap-3">
              <div className="flex items-center rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="p-3"
                >
                  <Minus size={16} />
                </button>
                <strong className="w-7 text-center">{quantity}</strong>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => value + 1)}
                  className="p-3"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="flex h-12 flex-1 items-center justify-between rounded-xl bg-orange-600 px-4 font-black text-white"
              >
                <span>Adicionar</span>
                <span>{money(selectedPrice * quantity)}</span>
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
