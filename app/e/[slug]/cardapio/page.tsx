"use client";

import Image from "next/image";
import { use, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChefHat,
  Clock3,
  LoaderCircle,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { deliveryStatusLabels, money, type CartItem, type Catalog, type DeliveryQuote, type DeliveryTracking, type Product, type PublicSession } from './model'

export default function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedComplements, setSelectedComplements] = useState<number[]>([]);
  const [observation, setObservation] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState({
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "Salvador",
    uf: "BA",
    referencia: "",
  });
  const [scheduledAt, setScheduledAt] = useState("");
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(
    null,
  );
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [deliveryTracking, setDeliveryTracking] =
    useState<DeliveryTracking | null>(null);
  const [deliveryCode, setDeliveryCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState<number | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionData, setSessionData] = useState<PublicSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [billConfirmation, setBillConfirmation] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notificationConsent, setNotificationConsent] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mesa = new URLSearchParams(window.location.search).get("mesa");
    const url = `/api/public/${encodeURIComponent(slug)}/catalog${mesa ? `?mesa=${encodeURIComponent(mesa)}` : ""}`;
    fetch(url)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Cardápio indisponível");
        return body as Catalog;
      })
      .then(setCatalog)
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Cardápio indisponível",
        ),
      )
      .finally(() => setLoading(false));
  }, [slug]);

  const categories = useMemo(() => {
    if (!catalog) return [];
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return catalog.categorias
      .map((category) => ({
        ...category,
        produtos: category.produtos.filter(
          (product) =>
            (!categoryId || category.id === categoryId) &&
            (!normalized ||
              `${product.nome} ${product.descricao ?? ""}`
                .toLocaleLowerCase("pt-BR")
                .includes(normalized)),
        ),
      }))
      .filter((category) => category.produtos.length);
  }, [catalog, query, categoryId]);
  const imageUrl = (photo?: string | null) =>
    photo
      ? `/api/public/${encodeURIComponent(slug)}/media/${encodeURIComponent(photo.split("/").pop() || "")}`
      : null;
  const openProduct = (product: Product) => {
    setSelected(product);
    setSelectedSizeId(product.tipoTamanho?.tamanhos?.[0]?.id ?? null);
    setSelectedComplements([]);
    setObservation("");
    setQuantity(1);
  };
  const selectedSize = selected?.tipoTamanho?.tamanhos?.find(
    (size) => size.id === selectedSizeId,
  );
  const selectedComplementObjects =
    selected?.gruposComplemento
      ?.flatMap((link) => link.grupo.complementos)
      .filter((item) => selectedComplements.includes(item.id)) ?? [];
  const selectedUnitPrice =
    Number(
      selectedSize?.valor ?? selected?.valorPromo ?? selected?.preco ?? 0,
    ) +
    selectedComplementObjects.reduce(
      (sum, item) => sum + Number(item.valor),
      0,
    );
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantidade,
    0,
  );
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantidade, 0);
  const isDelivery = catalog?.contexto.canal === "DELIVERY";
  const deliveryTotal = cartTotal + Number(deliveryQuote?.taxaEntrega ?? 0);

  const toggleComplement = (
    group: NonNullable<Product["gruposComplemento"]>[number]["grupo"],
    complementId: number,
  ) => {
    const ids = new Set(group.complementos.map((item) => item.id));
    const selectedInGroup = selectedComplements.filter((id) => ids.has(id));
    if (selectedComplements.includes(complementId))
      setSelectedComplements((current) =>
        current.filter((id) => id !== complementId),
      );
    else if (group.maxEscolhas === 1)
      setSelectedComplements((current) => [
        ...current.filter((id) => !ids.has(id)),
        complementId,
      ]);
    else if (
      group.maxEscolhas === null ||
      selectedInGroup.length < group.maxEscolhas
    )
      setSelectedComplements((current) => [...current, complementId]);
  };

  const addToCart = () => {
    if (!selected) return;
    if (selected.tipo === "POR_TAMANHO" && !selectedSizeId) {
      setCheckoutError("Escolha um tamanho.");
      return;
    }
    for (const link of selected.gruposComplemento ?? []) {
      const ids = new Set(link.grupo.complementos.map((item) => item.id));
      const count = selectedComplements.filter((id) => ids.has(id)).length;
      const minimum = link.grupo.obrigatorio
        ? Math.max(1, link.grupo.minEscolhas)
        : link.grupo.minEscolhas;
      if (count < minimum) {
        setCheckoutError(
          `Escolha pelo menos ${minimum} opção em ${link.grupo.nome}.`,
        );
        return;
      }
    }
    const key = `${selected.id}:${selectedSizeId ?? ""}:${[...selectedComplements].sort().join(",")}:${observation.trim()}`;
    const item: CartItem = {
      key,
      product: selected,
      quantidade: quantity,
      tamanhoId: selectedSizeId ?? undefined,
      tamanhoNome: selectedSize?.nome,
      complementIds: selectedComplements,
      complementNames: selectedComplementObjects.map((value) => value.nome),
      observacao: observation.trim(),
      unitPrice: selectedUnitPrice,
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
    setCheckoutError("");
  };

  const quoteDelivery = async () => {
    setCheckoutError("");
    setDeliveryQuote(null);
    try {
      const response = await fetch(
        `/api/public/${encodeURIComponent(slug)}/delivery/quote`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            bairro: deliveryAddress.bairro,
            cep: deliveryAddress.cep,
            agendadoPara: scheduledAt
              ? new Date(scheduledAt).toISOString()
              : undefined,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível calcular a entrega.");
      setDeliveryQuote(body);
      return body as DeliveryQuote;
    } catch (reason) {
      setCheckoutError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível calcular a entrega.",
      );
      return null;
    }
  };

  const loadDeliveryOrder = async (open = true) => {
    const token = window.sessionStorage.getItem(`controlae-delivery:${slug}`);
    setDeliveryCode(
      window.sessionStorage.getItem(`controlae-delivery-code:${slug}`),
    );
    if (open) setTrackingOpen(true);
    if (!token) {
      setDeliveryTracking(null);
      return;
    }
    setSessionLoading(true);
    setCheckoutError("");
    try {
      const response = await fetch(
        `/api/public/${encodeURIComponent(slug)}/delivery/order`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível acompanhar o pedido.");
      setDeliveryTracking(body);
    } catch (reason) {
      setDeliveryTracking(null);
      setCheckoutError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível acompanhar o pedido.",
      );
    } finally {
      setSessionLoading(false);
    }
  };

  const sendOrder = async () => {
    if (
      !catalog ||
      cart.length === 0 ||
      (!catalog.contexto.mesa && !isDelivery)
    )
      return;
    setSubmitting(true);
    setCheckoutError("");
    try {
      if (isDelivery) {
        if (
          guestName.trim().length < 2 ||
          guestPhone.replace(/\D/g, "").length < 10
        )
          throw new Error("Informe nome e telefone para a entrega.");
        if (
          !deliveryAddress.logradouro.trim() ||
          !deliveryAddress.bairro.trim() ||
          !deliveryAddress.cidade.trim() ||
          deliveryAddress.uf.trim().length !== 2
        )
          throw new Error("Complete o endereço de entrega.");
        const quote = deliveryQuote ?? (await quoteDelivery());
        if (!quote) return;
        if (cartTotal < Number(quote.pedidoMinimo))
          throw new Error(
            `O pedido mínimo é ${money(Number(quote.pedidoMinimo))}.`,
          );
        const pendingStorageKey = `controlae-delivery-pending:${slug}`;
        let pending: { trackingToken: string; idempotencyKey: string } | null =
          null;
        try {
          pending = JSON.parse(
            window.sessionStorage.getItem(pendingStorageKey) || "null",
          );
        } catch {
          pending = null;
        }
        const trackingToken =
          pending?.trackingToken ||
          crypto.randomUUID().replace(/-/g, "") +
            crypto.randomUUID().replace(/-/g, "");
        const idempotencyKey = pending?.idempotencyKey || crypto.randomUUID();
        window.sessionStorage.setItem(
          pendingStorageKey,
          JSON.stringify({ trackingToken, idempotencyKey }),
        );
        const response = await fetch(
          `/api/public/${encodeURIComponent(slug)}/delivery/orders`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "idempotency-key": idempotencyKey,
            },
            body: JSON.stringify({
              nome: guestName,
              telefone: guestPhone,
              ...deliveryAddress,
              agendadoPara: scheduledAt
                ? new Date(scheduledAt).toISOString()
                : undefined,
              trackingToken,
              aceitaTermos: termsAccepted,
              aceitaNotificacoes: notificationConsent,
              itens: cart.map((item) => ({
                produtoId: item.product.id,
                quantidade: item.quantidade,
                tamanhoId: item.tamanhoId,
                complementos: item.complementIds.map((complementoId) => ({
                  complementoId,
                })),
                observacao: item.observacao || undefined,
              })),
            }),
          },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Não foi possível enviar o pedido.");
        window.sessionStorage.setItem(
          `controlae-delivery:${slug}`,
          trackingToken,
        );
        window.sessionStorage.removeItem(pendingStorageKey);
        if (typeof body.codigoEntrega === "string") {
          window.sessionStorage.setItem(
            `controlae-delivery-code:${slug}`,
            body.codigoEntrega,
          );
          setDeliveryCode(body.codigoEntrega);
        }
        setOrderSuccess(Number(body.deliveryPedidoId));
        setCart([]);
        setCheckoutOpen(false);
        setDeliveryQuote(null);
        await loadDeliveryOrder(true);
        return;
      }
      const mesaToken =
        new URLSearchParams(window.location.search).get("mesa") || "";
      const storageKey = `controlae-public-session:${slug}:${mesaToken}`;
      let sessionToken = window.sessionStorage.getItem(storageKey);
      if (!sessionToken) {
        const sessionResponse = await fetch(
          `/api/public/${encodeURIComponent(slug)}/sessions`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              mesaToken,
              nome: guestName,
              telefone: guestPhone,
              aceitaTermos: termsAccepted,
            }),
          },
        );
        const sessionBody = await sessionResponse.json();
        if (!sessionResponse.ok)
          throw new Error(
            sessionBody.error || "Não foi possível iniciar a sessão.",
          );
        if (typeof sessionBody.sessionToken !== "string")
          throw new Error("A sessão retornada é inválida.");
        sessionToken = sessionBody.sessionToken;
        window.sessionStorage.setItem(storageKey, sessionBody.sessionToken);
      }
      const idempotencyKey = crypto.randomUUID();
      const orderResponse = await fetch(
        `/api/public/${encodeURIComponent(slug)}/orders`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${sessionToken}`,
            "idempotency-key": idempotencyKey,
          },
          body: JSON.stringify({
            itens: cart.map((item) => ({
              produtoId: item.product.id,
              quantidade: item.quantidade,
              tamanhoId: item.tamanhoId,
              complementos: item.complementIds.map((complementoId) => ({
                complementoId,
              })),
              observacao: item.observacao || undefined,
            })),
          }),
        },
      );
      const orderBody = await orderResponse.json();
      if (!orderResponse.ok)
        throw new Error(orderBody.error || "Não foi possível enviar o pedido.");
      setOrderSuccess(Number(orderBody.pedidoId));
      setCart([]);
      setCheckoutOpen(false);
    } catch (reason) {
      setCheckoutError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar o pedido.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentSession = () => {
    const mesaToken =
      new URLSearchParams(window.location.search).get("mesa") || "";
    return window.sessionStorage.getItem(
      `controlae-public-session:${slug}:${mesaToken}`,
    );
  };
  const loadSession = async () => {
    setSessionOpen(true);
    setSessionLoading(true);
    setCheckoutError("");
    setBillConfirmation(false);
    try {
      const token = currentSession();
      if (!token) {
        setSessionData(null);
        return;
      }
      const response = await fetch(
        `/api/public/${encodeURIComponent(slug)}/session`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível consultar os pedidos.");
      setSessionData(body);
    } catch (reason) {
      setSessionData(null);
      setCheckoutError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível consultar os pedidos.",
      );
    } finally {
      setSessionLoading(false);
    }
  };
  const requestBill = async () => {
    const token = currentSession();
    if (!token) return;
    setSessionLoading(true);
    setCheckoutError("");
    try {
      const response = await fetch(
        `/api/public/${encodeURIComponent(slug)}/request-bill`,
        { method: "POST", headers: { authorization: `Bearer ${token}` } },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível solicitar a conta.");
      setSessionData((current) =>
        current
          ? {
              ...current,
              comanda: { ...current.comanda, status: "FECHAMENTO" },
            }
          : current,
      );
      setBillConfirmation(false);
    } catch (reason) {
      setCheckoutError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível solicitar a conta.",
      );
    } finally {
      setSessionLoading(false);
    }
  };
  const sendFeedback = async () => {
    const token = currentSession();
    if (!token || feedbackRating < 1) return;
    setSessionLoading(true);
    setCheckoutError("");
    try {
      const response = await fetch(
        `/api/public/${encodeURIComponent(slug)}/feedback`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nota: feedbackRating, texto: feedbackText }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível enviar a avaliação.");
      setFeedbackSent(true);
    } catch (reason) {
      setCheckoutError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar a avaliação.",
      );
    } finally {
      setSessionLoading(false);
    }
  };

  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <ChefHat
            className="mx-auto animate-pulse text-orange-600"
            size={38}
          />
          <p className="mt-3 font-bold text-slate-700">
            Preparando o cardápio…
          </p>
        </div>
      </main>
    );
  if (error || !catalog)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <ChefHat className="mx-auto text-slate-300" size={44} />
          <h1 className="mt-4 text-2xl font-black text-slate-950">
            Cardápio indisponível
          </h1>
          <p className="mt-2 text-slate-600">
            {error || "Confira o endereço e tente novamente."}
          </p>
        </div>
      </main>
    );

  return (
    <main
      className="min-h-screen bg-slate-50 pb-16"
      style={
        {
          "--menu-primary": catalog.estabelecimento.corPrimaria || "#f97316",
        } as React.CSSProperties
      }
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-5 sm:px-6">
          {catalog.estabelecimento.logoUrl ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-200">
              <Image
                src={imageUrl(catalog.estabelecimento.logoUrl) || ""}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <ChefHat size={28} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black text-slate-950">
              {catalog.estabelecimento.nome}
            </h1>
            <p className="truncate text-sm text-slate-500">
              {catalog.estabelecimento.slogan ||
                "Escolha com calma. A cozinha cuida do resto."}
            </p>
          </div>
          {catalog.contexto.mesa ? (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">
                <MapPin size={16} /> Mesa {catalog.contexto.mesa}
              </div>
              <button
                type="button"
                onClick={() => void loadSession()}
                className="text-xs font-black text-orange-700 hover:underline"
              >
                Meus pedidos
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm font-black text-orange-800">
                <Truck size={16} /> Entrega
              </div>
              <button
                type="button"
                onClick={() => void loadDeliveryOrder()}
                className="text-xs font-black text-orange-700 hover:underline"
              >
                Acompanhar pedido
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-3 sm:px-6">
          <label className="relative block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar prato ou bebida"
              className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <nav
            className="flex gap-2 overflow-x-auto pb-1"
            aria-label="Categorias"
          >
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${categoryId === null ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
            >
              Todos
            </button>
            {catalog.categorias.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${categoryId === category.id ? "bg-orange-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
              >
                {category.nome}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-9 px-4 py-7 sm:px-6">
        {orderSuccess && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
          >
            <CheckCircle2 className="shrink-0" />
            <div>
              <strong className="block">
                Pedido #{orderSuccess} enviado à cozinha
              </strong>
              <span className="text-sm">
                Você pode continuar escolhendo outros itens.
              </span>
            </div>
          </div>
        )}
        {categories.map((category) => (
          <section key={category.id}>
            <h2 className="text-xl font-black text-slate-950">
              {category.nome}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.produtos.map((product) => {
                const photo = imageUrl(product.foto);
                const price = Number(product.valorPromo ?? product.preco);
                return (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => openProduct(product)}
                    className="group flex min-h-32 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <div className="min-w-0 flex-1 p-4">
                      <h3 className="font-black text-slate-950">
                        {product.nome}
                      </h3>
                      {product.descricao && (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                          {product.descricao}
                        </p>
                      )}
                      <strong className="mt-4 block text-orange-700">
                        {product.tipo === "POR_TAMANHO"
                          ? "Escolha o tamanho"
                          : money(price)}
                      </strong>
                    </div>
                    <div className="relative w-32 shrink-0 bg-slate-100">
                      {photo ? (
                        <Image
                          src={photo}
                          alt=""
                          fill
                          sizes="128px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <ChefHat
                          className="absolute inset-0 m-auto text-slate-300"
                          size={28}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {categories.length === 0 && (
          <div className="py-20 text-center">
            <Search className="mx-auto text-slate-300" size={32} />
            <p className="mt-3 font-bold text-slate-600">
              Nenhum item encontrado.
            </p>
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_30px_rgba(15,23,42,.12)]">
          <button
            type="button"
            onClick={() => {
              setCheckoutError("");
              setCheckoutOpen(true);
            }}
            className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between rounded-2xl bg-orange-600 px-5 font-black text-white hover:bg-orange-700"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={20} /> Ver pedido ({cartQuantity})
            </span>
            <span>{money(cartTotal)}</span>
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-950/60 p-0 sm:place-items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="public-product-title"
        >
          <section className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="public-product-title"
                    className="text-2xl font-black text-slate-950"
                  >
                    {selected.nome}
                  </h2>
                  {selected.descricao && (
                    <p className="mt-2 leading-6 text-slate-600">
                      {selected.descricao}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Fechar"
                  className="rounded-full bg-slate-100 p-2 text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
              {selected.tipoTamanho?.tamanhos?.length ? (
                <fieldset className="mt-5">
                  <legend className="font-black text-slate-900">
                    Escolha o tamanho
                  </legend>
                  <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {selected.tipoTamanho.tamanhos.map((size) => (
                      <label
                        key={size.id}
                        className="flex cursor-pointer items-center justify-between px-4 py-3"
                      >
                        <span>{size.nome}</span>
                        <span className="flex items-center gap-3">
                          <strong>{money(Number(size.valor))}</strong>
                          <input
                            type="radio"
                            name="public-size"
                            checked={selectedSizeId === size.id}
                            onChange={() => setSelectedSizeId(size.id)}
                            className="h-4 w-4 accent-orange-600"
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <strong className="mt-5 block text-xl text-orange-700">
                  {money(Number(selected.valorPromo ?? selected.preco))}
                </strong>
              )}
              {selected.gruposComplemento?.map((link) => (
                <fieldset key={link.grupo.id} className="mt-5">
                  <legend className="font-black text-slate-900">
                    {link.grupo.nome}{" "}
                    <span className="text-xs font-semibold text-slate-500">
                      {link.grupo.obrigatorio ? "obrigatório" : "opcional"}
                      {link.grupo.maxEscolhas
                        ? ` · até ${link.grupo.maxEscolhas}`
                        : ""}
                    </span>
                  </legend>
                  <div className="mt-2 space-y-1">
                    {link.grupo.complementos.map((item) => (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${selectedComplements.includes(item.id) ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-white"}`}
                      >
                        <span>{item.nome}</span>
                        <span className="flex items-center gap-3">
                          <span>+ {money(Number(item.valor))}</span>
                          <input
                            type="checkbox"
                            checked={selectedComplements.includes(item.id)}
                            onChange={() =>
                              toggleComplement(link.grupo, item.id)
                            }
                            className="h-4 w-4 accent-orange-600"
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <label className="mt-5 block">
                <span className="font-black text-slate-900">Observação</span>
                <textarea
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Ex.: sem cebola"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>
              {checkoutError && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
                >
                  {checkoutError}
                </p>
              )}
            </div>
            <footer className="flex items-center gap-3 border-t border-slate-200 bg-white p-4">
              <div className="flex items-center rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Diminuir quantidade"
                  className="p-3"
                >
                  <Minus size={17} />
                </button>
                <strong className="w-7 text-center">{quantity}</strong>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => Math.min(99, value + 1))
                  }
                  aria-label="Aumentar quantidade"
                  className="p-3"
                >
                  <Plus size={17} />
                </button>
              </div>
              <button
                type="button"
                onClick={addToCart}
                className="flex h-12 flex-1 items-center justify-between rounded-xl bg-orange-600 px-4 font-black text-white hover:bg-orange-700"
              >
                <span>Adicionar</span>
                <span>{money(selectedUnitPrice * quantity)}</span>
              </button>
            </footer>
          </section>
        </div>
      )}

      {checkoutOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-950/60 sm:place-items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="public-checkout-title"
        >
          <section className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <header className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2
                  id="public-checkout-title"
                  className="text-2xl font-black text-slate-950"
                >
                  Conferir pedido
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isDelivery
                    ? "Endereço, horário e resumo da entrega"
                    : `Mesa ${catalog.contexto.mesa}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                disabled={submitting}
                aria-label="Fechar"
                className="rounded-full bg-slate-100 p-2 text-slate-600"
              >
                <X size={20} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <div>
                      <strong className="text-slate-950">
                        {item.quantidade}x {item.product.nome}
                      </strong>
                      {(item.tamanhoNome ||
                        item.complementNames.length ||
                        item.observacao) && (
                        <p className="mt-1 text-xs text-slate-500">
                          {[
                            item.tamanhoNome,
                            ...item.complementNames,
                            item.observacao,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
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
                    <strong className="whitespace-nowrap text-slate-900">
                      {money(item.unitPrice * item.quantidade)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-black text-slate-800">
                    Seu nome{" "}
                    {!isDelivery && (
                      <span className="font-normal text-slate-400">
                        (opcional)
                      </span>
                    )}
                  </span>
                  <input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    maxLength={120}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label>
                  <span className="text-sm font-black text-slate-800">
                    Telefone{" "}
                    {!isDelivery && (
                      <span className="font-normal text-slate-400">
                        (opcional)
                      </span>
                    )}
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                    maxLength={18}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>
              {isDelivery && (
                <section className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
                  <div className="flex items-center gap-2 text-orange-900">
                    <MapPin size={18} />
                    <h3 className="font-black">Onde vamos entregar?</h3>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="text-sm font-bold text-slate-700">
                        CEP
                      </span>
                      <input
                        inputMode="numeric"
                        value={deliveryAddress.cep}
                        onChange={(event) => {
                          setDeliveryAddress((current) => ({
                            ...current,
                            cep: event.target.value,
                          }));
                          setDeliveryQuote(null);
                        }}
                        maxLength={9}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label>
                      <span className="text-sm font-bold text-slate-700">
                        Bairro
                      </span>
                      <input
                        value={deliveryAddress.bairro}
                        onChange={(event) => {
                          setDeliveryAddress((current) => ({
                            ...current,
                            bairro: event.target.value,
                          }));
                          setDeliveryQuote(null);
                        }}
                        maxLength={120}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="text-sm font-bold text-slate-700">
                        Rua ou avenida
                      </span>
                      <input
                        value={deliveryAddress.logradouro}
                        onChange={(event) =>
                          setDeliveryAddress((current) => ({
                            ...current,
                            logradouro: event.target.value,
                          }))
                        }
                        maxLength={160}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label>
                      <span className="text-sm font-bold text-slate-700">
                        Número
                      </span>
                      <input
                        value={deliveryAddress.numero}
                        onChange={(event) =>
                          setDeliveryAddress((current) => ({
                            ...current,
                            numero: event.target.value,
                          }))
                        }
                        maxLength={20}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label>
                      <span className="text-sm font-bold text-slate-700">
                        Complemento
                      </span>
                      <input
                        value={deliveryAddress.complemento}
                        onChange={(event) =>
                          setDeliveryAddress((current) => ({
                            ...current,
                            complemento: event.target.value,
                          }))
                        }
                        maxLength={120}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label>
                      <span className="text-sm font-bold text-slate-700">
                        Cidade
                      </span>
                      <input
                        value={deliveryAddress.cidade}
                        onChange={(event) =>
                          setDeliveryAddress((current) => ({
                            ...current,
                            cidade: event.target.value,
                          }))
                        }
                        maxLength={120}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label>
                      <span className="text-sm font-bold text-slate-700">
                        UF
                      </span>
                      <input
                        value={deliveryAddress.uf}
                        onChange={(event) =>
                          setDeliveryAddress((current) => ({
                            ...current,
                            uf: event.target.value.toUpperCase().slice(0, 2),
                          }))
                        }
                        maxLength={2}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm uppercase outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="text-sm font-bold text-slate-700">
                        Referência
                      </span>
                      <input
                        value={deliveryAddress.referencia}
                        onChange={(event) =>
                          setDeliveryAddress((current) => ({
                            ...current,
                            referencia: event.target.value,
                          }))
                        }
                        maxLength={200}
                        placeholder="Ex.: portaria ao lado da farmácia"
                        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="text-sm font-bold text-slate-700">
                        Agendar para{" "}
                        <span className="font-normal text-slate-500">
                          (opcional)
                        </span>
                      </span>
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(event) => {
                          setScheduledAt(event.target.value);
                          setDeliveryQuote(null);
                        }}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => void quoteDelivery()}
                    disabled={!deliveryAddress.bairro.trim()}
                    className="mt-4 h-11 w-full rounded-xl border border-orange-300 bg-white font-black text-orange-800 disabled:opacity-50"
                  >
                    {deliveryQuote ? "Recalcular entrega" : "Calcular entrega"}
                  </button>
                  {deliveryQuote && (
                    <div className="mt-3 flex items-end justify-between gap-4 rounded-xl bg-white p-3 text-sm">
                      <span className="text-slate-600">
                        {deliveryQuote.zona.nome}
                        <small className="block">
                          Previsão de {deliveryQuote.estimativaMin} min
                        </small>
                      </span>
                      <strong className="text-base text-slate-950">
                        {money(Number(deliveryQuote.taxaEntrega))}
                      </strong>
                    </div>
                  )}
                </section>
              )}
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-orange-600"
                />
                <span className="text-xs leading-5 text-slate-600">
                  <strong className="block text-sm text-slate-800">
                    Aceito os termos de atendimento
                  </strong>
                  {catalog.termos.resumo}
                </span>
              </label>
              {isDelivery && (
                <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <input type="checkbox" checked={notificationConsent} onChange={(event) => setNotificationConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
                  <span className="text-xs leading-5 text-emerald-800"><strong className="block text-sm text-emerald-950">Receber atualizações no WhatsApp</strong>Usaremos o telefone informado somente para avisar mudanças deste pedido. Esta opção é voluntária.</span>
                </label>
              )}
              {checkoutError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
                >
                  {checkoutError}
                </p>
              )}
            </div>
            <footer className="border-t border-slate-200 bg-white p-4">
              <button
                type="button"
                onClick={() => void sendOrder()}
                disabled={submitting || cart.length === 0 || !termsAccepted}
                className="flex h-14 w-full items-center justify-between rounded-2xl bg-emerald-600 px-5 font-black text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {submitting ? (
                    <LoaderCircle className="animate-spin" size={19} />
                  ) : (
                    <ShoppingBag size={19} />
                  )}{" "}
                  {submitting
                    ? "Enviando…"
                    : isDelivery
                      ? "Confirmar entrega"
                      : "Enviar à cozinha"}
                </span>
                <span>{money(isDelivery ? deliveryTotal : cartTotal)}</span>
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                O preço e a disponibilidade serão conferidos novamente antes do
                envio.
              </p>
            </footer>
          </section>
        </div>
      )}

      {trackingOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-950/60 sm:place-items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivery-tracking-title"
        >
          <section className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <header className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2
                  id="delivery-tracking-title"
                  className="text-2xl font-black text-slate-950"
                >
                  Acompanhar entrega
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Atualize para ver cada avanço do pedido.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrackingOpen(false)}
                aria-label="Fechar"
                className="rounded-full bg-slate-100 p-2 text-slate-600"
              >
                <X size={20} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {sessionLoading ? (
                <div className="grid min-h-48 place-items-center">
                  <LoaderCircle className="animate-spin text-orange-600" />
                </div>
              ) : deliveryTracking ? (
                <>
                  <div className="rounded-2xl bg-slate-950 p-5 text-white">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-300">
                        Pedido #{deliveryTracking.id}
                      </span>
                      <Truck size={22} className="text-orange-400" />
                    </div>
                    <strong className="mt-2 block text-2xl">
                      {deliveryStatusLabels[deliveryTracking.status] ||
                        deliveryTracking.status}
                    </strong>
                    <p className="mt-2 text-sm text-slate-300">
                      {deliveryTracking.logradouro}
                      {deliveryTracking.numero
                        ? `, ${deliveryTracking.numero}`
                        : ""}{" "}
                      · {deliveryTracking.bairro}
                    </p>
                  </div>
                  <div className="mt-4 space-y-1 border-l-2 border-orange-200 pl-5">
                    {deliveryTracking.historico.map((item, index) => (
                      <div
                        key={`${item.status}-${item.criadoEm}-${index}`}
                        className="relative py-2"
                      >
                        <span className="absolute -left-[1.62rem] top-3 h-3 w-3 rounded-full border-2 border-white bg-orange-500" />
                        <strong className="block text-sm text-slate-900">
                          {deliveryStatusLabels[item.status] || item.status}
                        </strong>
                        <span className="text-xs text-slate-500">
                          {new Date(item.criadoEm).toLocaleString("pt-BR")}
                        </span>
                        {item.motivo && (
                          <p className="mt-1 text-xs text-red-600">
                            {item.motivo}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-100 p-4">
                    <span className="font-bold text-slate-600">
                      Total com entrega
                    </span>
                    <strong className="text-xl text-slate-950">
                      {money(Number(deliveryTracking.total))}
                    </strong>
                  </div>
                  {deliveryCode && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <span className="block text-xs font-bold text-emerald-700">
                        Código para confirmar o recebimento
                      </span>
                      <strong className="mt-1 block text-3xl tracking-[0.3em] text-emerald-950">
                        {deliveryCode}
                      </strong>
                      <p className="mt-1 text-xs text-emerald-700">
                        Informe este código ao entregador somente quando receber
                        o pedido.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-14 text-center">
                  <Truck className="mx-auto text-slate-300" size={34} />
                  <h3 className="mt-3 font-black text-slate-800">
                    Nenhum pedido salvo neste aparelho
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Depois de confirmar uma entrega, o acompanhamento aparece
                    aqui.
                  </p>
                </div>
              )}
              {checkoutError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
                >
                  {checkoutError}
                </p>
              )}
            </div>
            {deliveryTracking && (
              <footer className="border-t border-slate-200 p-4">
                <button
                  type="button"
                  onClick={() => void loadDeliveryOrder(false)}
                  disabled={sessionLoading}
                  className="h-12 w-full rounded-xl border border-orange-300 font-black text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                >
                  Atualizar acompanhamento
                </button>
              </footer>
            )}
          </section>
        </div>
      )}

      {sessionOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-950/60 sm:place-items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="public-session-title"
        >
          <section className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <header className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2
                  id="public-session-title"
                  className="text-2xl font-black text-slate-950"
                >
                  Meus pedidos
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Mesa {catalog.contexto.mesa}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSessionOpen(false)}
                aria-label="Fechar"
                className="rounded-full bg-slate-100 p-2 text-slate-600"
              >
                <X size={20} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {sessionLoading ? (
                <div className="grid min-h-48 place-items-center">
                  <LoaderCircle className="animate-spin text-orange-600" />
                </div>
              ) : sessionData ? (
                <>
                  <div className="flex items-center justify-between rounded-xl bg-slate-100 p-4">
                    <span className="font-bold text-slate-600">
                      Total da conta
                    </span>
                    <strong className="text-xl text-slate-950">
                      {money(Number(sessionData.comanda.total))}
                    </strong>
                  </div>
                  <div className="mt-4 space-y-3">
                    {sessionData.comanda.pedidos.map((order) => (
                      <article
                        key={order.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex justify-between">
                          <strong className="text-slate-950">
                            Pedido #{order.id}
                          </strong>
                          <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">
                            {order.status}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {order.itens.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between gap-3 text-sm"
                            >
                              <span className="text-slate-700">
                                {item.quantidade}x {item.produto.nome}{" "}
                                <small className="text-slate-400">
                                  ({item.status})
                                </small>
                              </span>
                              <strong>
                                {money(
                                  Number(item.precoUnitario) * item.quantidade,
                                )}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-14 text-center">
                  <Clock3 className="mx-auto text-slate-300" size={32} />
                  <h3 className="mt-3 font-black text-slate-800">
                    Nenhum pedido nesta sessão
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Adicione itens ao carrinho para começar.
                  </p>
                </div>
              )}
              {checkoutError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
                >
                  {checkoutError}
                </p>
              )}
            </div>
            {sessionData && sessionData.comanda.status === "ABERTA" && (
              <footer className="border-t border-slate-200 p-4">
                {billConfirmation ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-bold text-amber-900">
                      Depois de solicitar, novos pedidos ficam bloqueados até a
                      equipe reabrir a mesa.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBillConfirmation(false)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black text-slate-700"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => void requestBill()}
                        disabled={sessionLoading}
                        className="rounded-xl bg-amber-600 px-4 py-3 font-black text-white disabled:opacity-50"
                      >
                        Confirmar conta
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBillConfirmation(true)}
                    className="h-12 w-full rounded-xl border border-orange-300 font-black text-orange-700 hover:bg-orange-50"
                  >
                    Solicitar a conta
                  </button>
                )}
              </footer>
            )}
          </section>
        </div>
      )}
      {sessionOpen && sessionData?.comanda.status === "FECHAMENTO" && (
        <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          {feedbackSent ? (
            <div className="flex items-center justify-center gap-2 font-bold text-emerald-700">
              <CheckCircle2 size={19} /> Avaliação enviada
            </div>
          ) : (
            <>
              <p className="text-center font-black text-slate-900">
                Como foi sua experiência?
              </p>
              <div
                className="mt-3 flex justify-center gap-2"
                aria-label="Nota do atendimento"
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFeedbackRating(rating)}
                    aria-label={`${rating} estrela${rating > 1 ? "s" : ""}`}
                    className={`grid h-9 w-9 place-items-center rounded-full font-black ${feedbackRating >= rating ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={feedbackText}
                  onChange={(event) => setFeedbackText(event.target.value)}
                  maxLength={1000}
                  placeholder="Comentário opcional"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-orange-400"
                />
                <button
                  type="button"
                  onClick={() => void sendFeedback()}
                  disabled={sessionLoading || feedbackRating < 1}
                  className="rounded-xl bg-orange-600 px-4 font-black text-white disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
