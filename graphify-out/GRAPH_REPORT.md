# Graph Report - FrontendC  (2026-10-17)

## Corpus Check
- 164 files · ~155,739 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .css 2, .example 1, (none) 1)

## Summary
- 1296 nodes · 3508 edges · 73 communities (68 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5c431b6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- installation-binding.ts
- lucide-react
- ExportMenu.tsx
- distribuicoes/page.tsx
- api.ts
- useToast
- comandas/page.tsx
- @tanstack/react-query
- dispositivos/page.tsx
- verify-tenant-branding-isolation.cjs
- usePagedQuery
- PageLoader
- [id]/page.tsx
- scripts
- compilerOptions
- radar-xml/page.tsx
- PaymentModal.tsx
- package.json
- ficha-tecnica/page.tsx
- offline.ts
- admin/delivery/page.tsx
- DataTable
- middleware.ts
- lotes/page.tsx
- produtos/page.tsx
- conciliacao/page.tsx
- verify-data-sync.cjs
- dependencies
- manifest.json
- ThemeContext.tsx
- ponto/page.tsx
- ProductOptionsModal.tsx
- espelho/page.tsx
- devDependencies
- admin/historico/page.tsx
- admin/cardapio/page.tsx
- insumos/page.tsx
- Button.tsx
- ranking-vendas/page.tsx
- DeliveryAssistedOrderModal.tsx
- crud-client.ts
- mesas/page.tsx
- eslint.config.mjs
- financeiro/page.tsx
- compilerOptions
- next.config.js
- registro/page.tsx
- vercel.json
- apiFetch
- Design System: ControlaÊ
- fiscal/page.tsx
- estoque/page.tsx
- backend-proxy.ts
- [slug]/cardapio/page.tsx
- credito/page.tsx
- complementos/page.tsx
- clientes/page.tsx
- api/[...path]/route.ts
- next
- api/route.ts
- relatorio/page.tsx
- Product
- garcons/page.tsx
- verify-table-transfer.ts
- balcao/page.tsx
- tenant-navigation.ts
- ToastContext.tsx
- FrontendC
- verify-offline.cjs
- test-order-flow.ts
- Instalação do aplicativo

## God Nodes (most connected - your core abstractions)
1. `apiFetch()` - 128 edges
2. `useToast()` - 119 edges
3. `react` - 85 edges
4. `lucide-react` - 74 edges
5. `Button` - 67 edges
6. `DataTable()` - 61 edges
7. `usePagedQuery()` - 56 edges
8. `ConfirmationModal()` - 46 edges
9. `PageLoader()` - 45 edges
10. `next` - 45 edges

## Surprising Connections (you probably didn't know these)
- `verify()` --calls--> `POST()`  [EXTRACTED]
  scripts/verify-multi-tenant-installation.ts → app/api/installation/activate/route.ts
- `verify()` --calls--> `apiFetch()`  [EXTRACTED]
  scripts/verify-auth-session-cache.ts → app/lib/api.ts
- `verify()` --calls--> `proxyBackendRequest()`  [EXTRACTED]
  scripts/verify-multi-tenant-installation.ts → app/lib/backend-proxy.ts
- `createBinding()` --calls--> `sealInstallationBinding()`  [EXTRACTED]
  scripts/verify-multi-tenant-installation.ts → app/lib/installation-binding.ts
- `middleware()` --calls--> `requestedTenantSlug()`  [EXTRACTED]
  middleware.ts → app/lib/tenant-navigation.ts

## Import Cycles
- None detected.

## Communities (73 total, 5 thin omitted)

### Community 0 - "installation-binding.ts"
Cohesion: 0.17
Nodes (17): ActivationResponse, POST(), API_ORIGIN_COOKIE, CookieReader, createInstallationGate(), INSTALLATION_COOKIE, INSTALLATION_GATE_COOKIE, InstallationBinding (+9 more)

### Community 1 - "lucide-react"
Cohesion: 0.05
Nodes (68): SidebarVisibilityPage(), CourtesyReportItem, CourtesyReportPage(), dateInput(), CounterPage(), CounterOrder, CounterOrdersPage(), MainLayout() (+60 more)

### Community 2 - "ExportMenu.tsx"
Cohesion: 0.07
Nodes (53): CaixaResumo, CashTabs(), dataHora, formatarData(), formatarMoeda(), HistoricoCaixaPage(), moeda, Movimento (+45 more)

### Community 3 - "distribuicoes/page.tsx"
Cohesion: 0.16
Nodes (13): ComparacaoItem, ComparacaoResposta, Destino, Devolucao, DistribuicoesEstoquePage(), formatarData(), Insumo, LinhaDevolucao (+5 more)

### Community 4 - "api.ts"
Cohesion: 0.12
Nodes (22): API_PREFIX, ApiError, apiRequest(), ApiRequestOptions, extractDetails(), extractMessage(), isBodyInitLike(), LOGIN_PATH (+14 more)

### Community 5 - "useToast"
Cohesion: 0.20
Nodes (34): ComplementosPage(), TiposTamanhoPage(), CategoriasPage(), CentroCusto, CentrosCustoPage(), ContaBancaria, ContasBancariasPage(), FORM_VAZIO (+26 more)

### Community 6 - "comandas/page.tsx"
Cohesion: 0.09
Nodes (32): BooleanGrid(), ComandasPage(), Field(), Paper, Preview(), PrintDevice, Tab, tabs (+24 more)

### Community 7 - "@tanstack/react-query"
Cohesion: 0.17
Nodes (12): BrandingProvider(), ToastProvider(), geistMono, geistSans, metadata, RootLayout(), viewport, createQueryClient() (+4 more)

### Community 8 - "dispositivos/page.tsx"
Cohesion: 0.09
Nodes (34): Conexao, CONEXOES, CONFIGURED_PRINTER_AGENT_URL, DEFAULT_PRINTER_AGENT_CONNECTION, descricaoComModo(), descricaoSemMarcador(), deveUsarAgenteLocal(), Dispositivo (+26 more)

### Community 9 - "verify-tenant-branding-isolation.cjs"
Cohesion: 0.06
Nodes (31): typescript, assert, { join }, { readFileSync }, source, appDir, fs, path (+23 more)

### Community 10 - "usePagedQuery"
Cohesion: 0.14
Nodes (20): alvoDoVinculo(), Categoria, Dispositivo, DISPOSITIVOS_VAZIOS, PASSOS, Praca, PRACAS_VAZIAS, Produto (+12 more)

### Community 11 - "PageLoader"
Cohesion: 0.16
Nodes (13): MesaQrCode, MesaQrCodesPage(), MesaResumo, InlineLoaderProps, PageLoader(), PageLoaderProps, DashboardPage(), DashboardStats (+5 more)

### Community 12 - "[id]/page.tsx"
Cohesion: 0.18
Nodes (17): RequestBillModal(), RequestBillModalProps, LoadingMark(), isOfflineQueuedResult(), listOfflineOrderItems(), OFFLINE_SYNC_EVENT, OfflineQueuedResult, CANCELLATION_REASONS (+9 more)

### Community 13 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, build, dev, lint, start, test:api, test:auth-session-cache, test:category-printer (+16 more)

### Community 14 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+13 more)

### Community 15 - "radar-xml/page.tsx"
Cohesion: 0.09
Nodes (34): baixarBlob(), ErroImportacao, ImportarCardapioPage(), LinhaImportacao, moeda(), PreviewImportacao, TipoImportacao, Card (+26 more)

### Community 16 - "PaymentModal.tsx"
Cohesion: 0.17
Nodes (16): CreditCardBrand, FormaPagamentoAtiva, METODOS_PADRAO, METODOS_SUPORTADOS, PaymentItem, PaymentMethod, PaymentModal(), PaymentModalProps (+8 more)

### Community 17 - "package.json"
Cohesion: 0.15
Nodes (12): name, private, version, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, ts-node (+4 more)

### Community 18 - "ficha-tecnica/page.tsx"
Cohesion: 0.16
Nodes (12): Avaliacao, AvaliacoesPage(), Summary, FichaTecnicaItem, FORM_VAZIO, FormState, Insumo, Produto (+4 more)

### Community 19 - "offline.ts"
Cohesion: 0.15
Nodes (29): INITIAL_STATUS, OfflineStatus(), belongsToCurrentTenant(), browserAvailable(), CachedResponse, clearOfflineData(), deleteRecord(), discardOfflineMutation() (+21 more)

### Community 20 - "admin/delivery/page.tsx"
Cohesion: 0.13
Nodes (22): asTime(), Config, DAYS, DeliveryConfigPage(), Editor(), EMPTY_CONFIG, EMPTY_DRIVER, EMPTY_ZONE (+14 more)

### Community 21 - "DataTable"
Cohesion: 0.14
Nodes (22): PermissionGroup, PermissionSchema, ROLE_LABELS, User, ALIGN_CLASS, cn(), DataTable(), DataTableProps (+14 more)

### Community 22 - "middleware.ts"
Cohesion: 0.24
Nodes (15): POST(), installationCookieName(), installationGateCookieName(), isTenantSlug(), tenantCookieName(), bytesToBase64Url(), config, hasValidInstallationGate() (+7 more)

### Community 23 - "lotes/page.tsx"
Cohesion: 0.17
Nodes (18): diferencaTexto(), Insumo, InventarioEstoquePage(), Ajuste, ItemLote, ListaLotes, Lote, numero() (+10 more)

### Community 24 - "produtos/page.tsx"
Cohesion: 0.06
Nodes (48): AvailabilityRule, categoryColorStyle(), ComplementoGrupo, Dispositivo, minutesToTime(), parseStringList(), ProdutosPage(), PromotionRule (+40 more)

### Community 25 - "conciliacao/page.tsx"
Cohesion: 0.20
Nodes (14): Account, CardBatch, day(), DeskColumn(), Empty(), money(), monthStart(), Movement (+6 more)

### Community 26 - "verify-data-sync.cjs"
Cohesion: 0.16
Nodes (15): DataSyncBridge(), DATA_CHANGED_EVENT, DataChangeDetail, DataChangeTarget, isMutationMethod(), shouldPublishApiMutation(), subscribeLocalDataChanges(), connectTableSocket() (+7 more)

### Community 27 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, clsx, @ducanh2912/next-pwa, jspdf, lucide-react, next, node-fetch, react (+5 more)

### Community 28 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, categories, description, display, icons, id, name, orientation (+4 more)

### Community 29 - "ThemeContext.tsx"
Cohesion: 0.27
Nodes (10): applyTheme(), BrandTheme, ColorTheme, resolveBrandTheme(), systemTheme(), tenantThemeStorageKey(), ThemeContext, ThemeContextValue (+2 more)

### Community 30 - "ponto/page.tsx"
Cohesion: 0.12
Nodes (18): fetchList(), ACOES, Auditoria, AuditoriaPontoPage(), detalheLegivel(), Funcionario, DIAS_SEMANA, Escala (+10 more)

### Community 31 - "ProductOptionsModal.tsx"
Cohesion: 0.28
Nodes (10): ProductOptionsModal(), flavorKey(), FlavorSizeConfig, parseFlavors(), parseFlavorSizeConfig(), priceForFlavorSize(), configuracao, legado (+2 more)

### Community 32 - "espelho/page.tsx"
Cohesion: 0.24
Nodes (9): dataInput(), Espelho, EspelhoDia, EspelhoPontoPage(), Funcionario, intervaloCompleto(), minutosTexto(), Registro (+1 more)

### Community 33 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, eslint-config-next, fake-indexeddb, tailwindcss, @tailwindcss/postcss, ts-node, @types/node (+3 more)

### Community 34 - "admin/historico/page.tsx"
Cohesion: 0.33
Nodes (9): dataGrupo(), dataInput(), fimDoDia(), HistoricoEvento, HistoricoItem, HistoricoPedidosPage(), HistoricoResposta, inicioDoDia() (+1 more)

### Community 35 - "admin/cardapio/page.tsx"
Cohesion: 0.24
Nodes (9): Complemento, ComplementoGrupo, Modo, modos, ordenarPorOrdemNome(), Ordenavel, OrganizarCardapioPage(), ProdutoOrdenavel (+1 more)

### Community 36 - "insumos/page.tsx"
Cohesion: 0.22
Nodes (8): ConversaoForm, FORM_VAZIO, FormState, Grupo, Insumo, OpcaoFinanceira, Subgrupo, UNIDADES

### Community 37 - "Button.tsx"
Cohesion: 0.11
Nodes (19): moeda(), Tamanho, TipoTamanho, Categoria, Impressora, SETOR_BADGE, SETORES, EstoqueLocal (+11 more)

### Community 38 - "ranking-vendas/page.tsx"
Cohesion: 0.29
Nodes (7): currency, Period, PERIODS, positionClass(), RankedProduct, RankingResponse, RankingVendasPage()

### Community 39 - "DeliveryAssistedOrderModal.tsx"
Cohesion: 0.11
Nodes (20): CartItem, Category, Complement, ComplementGroup, CreatedOrder, DeliveryAssistedOrderModal(), EMPTY_FORM, Field() (+12 more)

### Community 40 - "crud-client.ts"
Cohesion: 0.09
Nodes (28): abaixoDoMinimo(), FORM_VAZIO, FormState, Insumo, MovimentacoesEstoqueContent(), MovimentacoesEstoquePage(), Movimento, sinal() (+20 more)

### Community 41 - "mesas/page.tsx"
Cohesion: 0.26
Nodes (10): formatTime(), Mesa, MesaStatus, TableCard(), TableCardProps, MesasPage(), MesaStatusSummary(), User (+2 more)

### Community 42 - "eslint.config.mjs"
Cohesion: 0.25
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 43 - "financeiro/page.tsx"
Cohesion: 0.17
Nodes (22): Account, asList(), BalanceBand(), CreateForm, CreateTitleModal(), Field(), FinancePage(), Flow (+14 more)

### Community 44 - "compilerOptions"
Cohesion: 0.29
Nodes (6): ../tsconfig.json, compilerOptions, isolatedModules, module, moduleResolution, extends

### Community 45 - "next.config.js"
Cohesion: 0.33
Nodes (4): { default: withPWAInit, runtimeCaching }, nextConfig, withPWA, @ducanh2912/next-pwa

### Community 46 - "registro/page.tsx"
Cohesion: 0.22
Nodes (10): Insumo, ItemRascunho, itemVazio(), ListaLotes, Lote, novaChaveIdempotencia(), RegistroEstoqueSimplificadoPage(), STATUS (+2 more)

### Community 50 - "apiFetch"
Cohesion: 0.14
Nodes (14): AdminDashboard(), Delivery, DeliveryPortalPage(), Portal, apiFetch(), invalidateAuthMeCache(), isQueueableApiMutation(), isTransientOfflineFailure() (+6 more)

### Community 51 - "Design System: ControlaÊ"
Cohesion: 0.10
Nodes (19): Buttons, Cards / Containers, Colors, Components, Design System: ControlaÊ, Do:, Do's and Don'ts, Don't: (+11 more)

### Community 52 - "fiscal/page.tsx"
Cohesion: 0.14
Nodes (16): AdminFiscalPage(), CheckProdutos, classeStatus(), ClienteFiscal, EmpresaFiscal, FilaFiscal, FORM_VAZIO, formatarData() (+8 more)

### Community 53 - "estoque/page.tsx"
Cohesion: 0.27
Nodes (9): carregarResumo(), EstoquePage(), formatarData(), Insumo, Lista, Meta, Movimento, RelatorioEstoque (+1 more)

### Community 54 - "backend-proxy.ts"
Cohesion: 0.25
Nodes (11): forwardedCookie(), HOP_BY_HOP_HEADERS, isolateBackendAuthCookie(), proxyBackendRequest(), configuredTimeout(), FetchImplementation, fetchWithTimeout(), authCookieName() (+3 more)

### Community 55 - "[slug]/cardapio/page.tsx"
Cohesion: 0.17
Nodes (12): CartItem, Catalog, Category, Complement, DeliveryQuote, deliveryStatusLabels, DeliveryTracking, money() (+4 more)

### Community 56 - "credito/page.tsx"
Cohesion: 0.24
Nodes (12): Agreement, CheckField(), Client, Credit, CreditPage(), date(), Field(), Metric() (+4 more)

### Community 57 - "complementos/page.tsx"
Cohesion: 0.25
Nodes (7): Complemento, COMPLEMENTO_VAZIO, ComplementoForm, ComplementoGrupo, GRUPO_VAZIO, GrupoForm, regraEscolha()

### Community 58 - "clientes/page.tsx"
Cohesion: 0.27
Nodes (10): Cliente, ClientesPage(), EMPTY, Field(), Form, Historico, HistoryModal(), ImportModal() (+2 more)

### Community 59 - "api/[...path]/route.ts"
Cohesion: 0.18
Nodes (10): DELETE, dynamic, GET, handler(), OPTIONS, PATCH, POST, PUT (+2 more)

### Community 60 - "next"
Cohesion: 0.25
Nodes (6): GET(), dynamic, runtime, GET(), installationBindingForTenant(), next

### Community 61 - "api/route.ts"
Cohesion: 0.20
Nodes (9): DELETE, dynamic, GET, handler(), OPTIONS, PATCH, POST, PUT (+1 more)

### Community 62 - "relatorio/page.tsx"
Cohesion: 0.36
Nodes (8): dateInput(), DeliveryReportPage(), Metric(), money(), Report, Row, Td(), Th()

### Community 63 - "Product"
Cohesion: 0.22
Nodes (8): Brand Commitments, Capabilities and Constraints, Operating Context, Platform, Product, Product Principles, Product Purpose, Users

### Community 64 - "garcons/page.tsx"
Cohesion: 0.46
Nodes (7): Metric(), money(), monthStart(), Report, Row, today(), WaiterClosingPage()

### Community 65 - "verify-table-transfer.ts"
Cohesion: 0.29
Nodes (6): resolveTableTransferTarget(), TableTransferTarget, TransferTable, result, source, tables

### Community 66 - "balcao/page.tsx"
Cohesion: 0.33
Nodes (5): CounterCategory, CounterCustomer, CounterProduct, ProductOptionsModalProps, Produto

### Community 67 - "tenant-navigation.ts"
Cohesion: 0.19
Nodes (16): InstallationPage(), activate(), resetInstallation(), InstallationStatus, getSocketUrl(), resolveSocketUrl(), API_ORIGIN_COOKIE_PREFIX, apiOriginCookieName() (+8 more)

### Community 68 - "ToastContext.tsx"
Cohesion: 0.40
Nodes (4): Toast, ToastContext, ToastContextType, ToastType

### Community 69 - "FrontendC"
Cohesion: 0.40
Nodes (4): Ativação da instalação, Desenvolvimento, FrontendC, Verificação

### Community 70 - "verify-offline.cjs"
Cohesion: 0.50
Nodes (3): fake-indexeddb, assert, { indexedDB, IDBKeyRange }

## Knowledge Gaps
- **11 isolated node(s):** `RFC-4180`, `@types/node-fetch`, `@tailwindcss/postcss`, `@types/node`, `@types/react` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 620 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Button.tsx` to `lucide-react`, `ExportMenu.tsx`, `distribuicoes/page.tsx`, `useToast`, `comandas/page.tsx`, `@tanstack/react-query`, `dispositivos/page.tsx`, `usePagedQuery`, `PageLoader`, `[id]/page.tsx`, `radar-xml/page.tsx`, `PaymentModal.tsx`, `package.json`, `ficha-tecnica/page.tsx`, `offline.ts`, `admin/delivery/page.tsx`, `DataTable`, `lotes/page.tsx`, `produtos/page.tsx`, `conciliacao/page.tsx`, `verify-data-sync.cjs`, `ThemeContext.tsx`, `ponto/page.tsx`, `ProductOptionsModal.tsx`, `espelho/page.tsx`, `admin/historico/page.tsx`, `admin/cardapio/page.tsx`, `insumos/page.tsx`, `ranking-vendas/page.tsx`, `DeliveryAssistedOrderModal.tsx`, `crud-client.ts`, `mesas/page.tsx`, `financeiro/page.tsx`, `registro/page.tsx`, `apiFetch`, `fiscal/page.tsx`, `estoque/page.tsx`, `[slug]/cardapio/page.tsx`, `credito/page.tsx`, `complementos/page.tsx`, `clientes/page.tsx`, `relatorio/page.tsx`, `garcons/page.tsx`, `balcao/page.tsx`, `tenant-navigation.ts`, `ToastContext.tsx`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `@types/node-fetch`, `@tailwindcss/postcss` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lucide-react` be split into smaller, more focused modules?**
  _Cohesion score 0.05359831376091539 - nodes in this community are weakly interconnected._
- **Why does `apiFetch()` connect `apiFetch` to `lucide-react`, `ExportMenu.tsx`, `distribuicoes/page.tsx`, `api.ts`, `useToast`, `comandas/page.tsx`, `dispositivos/page.tsx`, `usePagedQuery`, `PageLoader`, `[id]/page.tsx`, `radar-xml/page.tsx`, `PaymentModal.tsx`, `ficha-tecnica/page.tsx`, `offline.ts`, `admin/delivery/page.tsx`, `DataTable`, `lotes/page.tsx`, `produtos/page.tsx`, `conciliacao/page.tsx`, `ponto/page.tsx`, `espelho/page.tsx`, `admin/historico/page.tsx`, `admin/cardapio/page.tsx`, `Button.tsx`, `ranking-vendas/page.tsx`, `DeliveryAssistedOrderModal.tsx`, `crud-client.ts`, `mesas/page.tsx`, `financeiro/page.tsx`, `registro/page.tsx`, `fiscal/page.tsx`, `estoque/page.tsx`, `credito/page.tsx`, `clientes/page.tsx`, `relatorio/page.tsx`, `garcons/page.tsx`, `balcao/page.tsx`, `tenant-navigation.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `ExportMenu.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06516290726817042 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `installation-binding.ts`, `lucide-react`, `ExportMenu.tsx`, `comandas/page.tsx`, `@tanstack/react-query`, `PageLoader`, `[id]/page.tsx`, `radar-xml/page.tsx`, `package.json`, `ficha-tecnica/page.tsx`, `DataTable`, `middleware.ts`, `lotes/page.tsx`, `produtos/page.tsx`, `verify-data-sync.cjs`, `admin/historico/page.tsx`, `admin/cardapio/page.tsx`, `insumos/page.tsx`, `crud-client.ts`, `mesas/page.tsx`, `apiFetch`, `estoque/page.tsx`, `backend-proxy.ts`, `[slug]/cardapio/page.tsx`, `api/[...path]/route.ts`, `api/route.ts`, `balcao/page.tsx`, `tenant-navigation.ts`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1225071225071225 - nodes in this community are weakly interconnected._