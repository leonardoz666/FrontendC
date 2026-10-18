# Graph Report - FrontendC  (2026-10-18)

## Corpus Check
- 184 files · ~172,641 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .css 2, .example 1, (none) 1)

## Summary
- 1453 nodes · 3931 edges · 76 communities (71 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24a723b5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- installation-binding.ts
- lucide-react
- ExportMenu.tsx
- insumos/page.tsx
- api.ts
- Button
- CaixaDashboard.tsx
- @tanstack/react-query
- dispositivos/page.tsx
- verify-tenant-branding-isolation.cjs
- useToast
- PageLoader
- [id]/page.tsx
- scripts
- compilerOptions
- radar-xml/page.tsx
- PaymentModal.tsx
- package.json
- relatorios/page.tsx
- offline.ts
- admin/delivery/page.tsx
- DataTable
- equipamentos/page.tsx
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
- comandas/page.tsx
- abastecimento/page.tsx
- ranking-vendas/page.tsx
- DeliveryAssistedOrderModal.tsx
- crud-client.ts
- marketing/page.tsx
- eslint.config.mjs
- financeiro/page.tsx
- compilerOptions
- sw.ts
- operacao/page.tsx
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
- gateway/page.tsx
- react
- DataSyncBridge.tsx
- relatorio/page.tsx
- Product
- garcons/page.tsx
- verify-table-transfer.ts
- producao/page.tsx
- tenant-navigation.ts
- @tanstack/react-query
- FrontendC
- verify-offline.cjs
- test-order-flow.ts
- Instalação do aplicativo
- inventario/page.tsx
- integracoes/page.tsx
- recrutamento/page.tsx

## God Nodes (most connected - your core abstractions)
1. `apiFetch()` - 151 edges
2. `useToast()` - 139 edges
3. `react` - 100 edges
4. `lucide-react` - 86 edges
5. `Button` - 67 edges
6. `DataTable()` - 61 edges
7. `usePagedQuery()` - 48 edges
8. `ConfirmationModal()` - 46 edges
9. `PageLoader()` - 45 edges
10. `fetchList()` - 32 edges

## Surprising Connections (you probably didn't know these)
- `verify()` --calls--> `apiFetch()`  [EXTRACTED]
  scripts/verify-auth-session-cache.ts → app/lib/api.ts
- `verify()` --calls--> `proxyBackendRequest()`  [EXTRACTED]
  scripts/verify-multi-tenant-installation.ts → app/lib/backend-proxy.ts
- `createBinding()` --calls--> `sealInstallationBinding()`  [EXTRACTED]
  scripts/verify-multi-tenant-installation.ts → app/lib/installation-binding.ts
- `validInstallationGate()` --calls--> `resolveInstallationSecret()`  [EXTRACTED]
  middleware.ts → app/lib/installation-secret.ts
- `verify()` --calls--> `tenantSlugFromPathname()`  [EXTRACTED]
  scripts/verify-multi-tenant-installation.ts → app/lib/tenant-navigation.ts

## Import Cycles
- None detected.

## Communities (76 total, 5 thin omitted)

### Community 0 - "installation-binding.ts"
Cohesion: 0.14
Nodes (32): POST(), RedeemResponse, ActivationResponse, POST(), POST(), GET(), API_ORIGIN_COOKIE, CookieReader (+24 more)

### Community 1 - "lucide-react"
Cohesion: 0.05
Nodes (70): SidebarVisibilityPage(), CourtesyReportItem, CourtesyReportPage(), dateInput(), CounterOrdersPage(), MainLayout(), resolveSupportHref(), NAV_ICONS (+62 more)

### Community 2 - "ExportMenu.tsx"
Cohesion: 0.07
Nodes (53): CaixaResumo, CashTabs(), dataHora, formatarData(), formatarMoeda(), HistoricoCaixaPage(), moeda, Movimento (+45 more)

### Community 3 - "insumos/page.tsx"
Cohesion: 0.08
Nodes (44): ComplementosPage(), ComparacaoItem, ComparacaoResposta, Destino, Devolucao, DistribuicoesEstoquePage(), formatarData(), Insumo (+36 more)

### Community 4 - "api.ts"
Cohesion: 0.13
Nodes (18): API_PREFIX, ApiError, apiRequest(), ApiRequestOptions, extractDetails(), extractMessage(), isBodyInitLike(), LOGIN_PATH (+10 more)

### Community 5 - "Button"
Cohesion: 0.10
Nodes (46): Categoria, CategoriasPage(), Impressora, SETOR_BADGE, SETORES, CentroCusto, CentrosCustoPage(), ContaBancaria (+38 more)

### Community 6 - "CaixaDashboard.tsx"
Cohesion: 0.18
Nodes (16): CaixaDashboard(), CashPanelProps, CashStatus, CashTabs(), dateTime, formatMoney(), formatPaymentType(), Metric() (+8 more)

### Community 7 - "@tanstack/react-query"
Cohesion: 0.23
Nodes (8): ToastProvider(), geistMono, geistSans, metadata, RootLayout(), viewport, createQueryClient(), Providers()

### Community 8 - "dispositivos/page.tsx"
Cohesion: 0.10
Nodes (33): Conexao, CONEXOES, CONFIGURED_PRINTER_AGENT_URL, DEFAULT_PRINTER_AGENT_CONNECTION, descricaoComModo(), descricaoSemMarcador(), deveUsarAgenteLocal(), Dispositivo (+25 more)

### Community 9 - "verify-tenant-branding-isolation.cjs"
Cohesion: 0.06
Nodes (31): typescript, assert, { join }, { readFileSync }, source, appDir, fs, path (+23 more)

### Community 10 - "useToast"
Cohesion: 0.09
Nodes (29): Avaliacao, AvaliacoesPage(), Summary, moeda(), Tamanho, TiposTamanhoPage(), TipoTamanho, EstoqueGruposPage() (+21 more)

### Community 11 - "PageLoader"
Cohesion: 0.19
Nodes (18): Mesa, TableCard(), InlineLoaderProps, PageLoader(), PageLoaderProps, DashboardPage(), DashboardStats, redirectToLogin() (+10 more)

### Community 12 - "[id]/page.tsx"
Cohesion: 0.17
Nodes (18): RequestBillModal(), RequestBillModalProps, LoadingMark(), isOfflineQueuedResult(), listOfflineOrderItems(), OFFLINE_SYNC_EVENT, OfflineQueuedResult, formatItemCardContent() (+10 more)

### Community 13 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, build, dev, lint, start, test:api, test:auth-session-cache, test:category-printer (+16 more)

### Community 14 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+14 more)

### Community 15 - "radar-xml/page.tsx"
Cohesion: 0.08
Nodes (38): baixarBlob(), ErroImportacao, ImportarCardapioPage(), LinhaImportacao, moeda(), PreviewImportacao, TipoImportacao, formatTime() (+30 more)

### Community 16 - "PaymentModal.tsx"
Cohesion: 0.17
Nodes (16): CreditCardBrand, FormaPagamentoAtiva, METODOS_PADRAO, METODOS_SUPORTADOS, PaymentItem, PaymentMethod, PaymentModal(), PaymentModalProps (+8 more)

### Community 17 - "package.json"
Cohesion: 0.12
Nodes (15): name, overrides, braces, postcss, private, version, eslint, eslint-config-next (+7 more)

### Community 18 - "relatorios/page.tsx"
Cohesion: 0.17
Nodes (22): DataTable(), DetailRow, Dimension, Empty(), ExportJob, Field(), isoDate(), JobsView() (+14 more)

### Community 19 - "offline.ts"
Cohesion: 0.14
Nodes (34): INITIAL_STATUS, OfflineStatus(), belongsToCurrentTenant(), browserAvailable(), cacheApiPayload(), CachedResponse, cacheKey(), clearOfflineData() (+26 more)

### Community 20 - "admin/delivery/page.tsx"
Cohesion: 0.13
Nodes (22): asTime(), Config, DAYS, DeliveryConfigPage(), Editor(), EMPTY_CONFIG, EMPTY_DRIVER, EMPTY_ZONE (+14 more)

### Community 21 - "DataTable"
Cohesion: 0.13
Nodes (21): AdminUsersPage(), PermissionGroup, PermissionSchema, ROLE_LABELS, User, ALIGN_CLASS, cn(), DataTableProps (+13 more)

### Community 22 - "equipamentos/page.tsx"
Cohesion: 0.12
Nodes (18): Calibration, Device, Emission, EquipmentPage(), Field(), fields, Model, Product (+10 more)

### Community 23 - "lotes/page.tsx"
Cohesion: 0.10
Nodes (30): FichaTecnicaItem, FORM_VAZIO, FormState, Insumo, Produto, Ajuste, ItemLote, ListaLotes (+22 more)

### Community 24 - "produtos/page.tsx"
Cohesion: 0.07
Nodes (44): AvailabilityRule, categoryColorStyle(), ComplementoGrupo, Dispositivo, minutesToTime(), parseStringList(), ProdutosPage(), PromotionRule (+36 more)

### Community 25 - "conciliacao/page.tsx"
Cohesion: 0.20
Nodes (14): Account, CardBatch, day(), DeskColumn(), Empty(), money(), monthStart(), Movement (+6 more)

### Community 26 - "verify-data-sync.cjs"
Cohesion: 0.19
Nodes (12): DATA_CHANGED_EVENT, DataChangeDetail, DataChangeTarget, isMutationMethod(), shouldPublishApiMutation(), assert, { createQueryClient }, {
  DATA_CHANGED_EVENT,
  isMutationMethod,
  publishLocalDataChange,
  shouldPublishApiMutation,
  subscribeLocalDataChanges,
} (+4 more)

### Community 27 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, clsx, jspdf, lucide-react, next, node-fetch, react, react-dom (+5 more)

### Community 28 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, categories, description, display, icons, id, name, orientation (+4 more)

### Community 29 - "ThemeContext.tsx"
Cohesion: 0.27
Nodes (10): applyTheme(), BrandTheme, ColorTheme, resolveBrandTheme(), systemTheme(), tenantThemeStorageKey(), ThemeContext, ThemeContextValue (+2 more)

### Community 30 - "ponto/page.tsx"
Cohesion: 0.17
Nodes (12): DIAS_SEMANA, Escala, Espelho, EspelhoDia, formatarMinutos(), Funcionario, FUNCIONARIO_VAZIO, FuncionarioForm (+4 more)

### Community 31 - "ProductOptionsModal.tsx"
Cohesion: 0.28
Nodes (10): ProductOptionsModal(), flavorKey(), FlavorSizeConfig, parseFlavors(), parseFlavorSizeConfig(), priceForFlavorSize(), configuracao, legado (+2 more)

### Community 32 - "espelho/page.tsx"
Cohesion: 0.24
Nodes (9): dataInput(), Espelho, EspelhoDia, EspelhoPontoPage(), Funcionario, intervaloCompleto(), minutosTexto(), Registro (+1 more)

### Community 33 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, fake-indexeddb, serwist, tailwindcss, @tailwindcss/postcss, ts-node (+4 more)

### Community 34 - "admin/historico/page.tsx"
Cohesion: 0.33
Nodes (9): dataGrupo(), dataInput(), fimDoDia(), HistoricoEvento, HistoricoItem, HistoricoPedidosPage(), HistoricoResposta, inicioDoDia() (+1 more)

### Community 35 - "admin/cardapio/page.tsx"
Cohesion: 0.13
Nodes (18): Complemento, ComplementoGrupo, Modo, modos, ordenarPorOrdemNome(), Ordenavel, OrganizarCardapioPage(), ProdutoOrdenavel (+10 more)

### Community 36 - "comandas/page.tsx"
Cohesion: 0.21
Nodes (14): BooleanGrid(), ComandasPage(), Field(), Paper, Preview(), PrintDevice, Tab, tabs (+6 more)

### Community 37 - "abastecimento/page.tsx"
Cohesion: 0.19
Nodes (14): AbastecimentoPage(), Empty(), Field(), key(), money(), Purchase, PurchaseItem, quantity() (+6 more)

### Community 38 - "ranking-vendas/page.tsx"
Cohesion: 0.29
Nodes (7): currency, Period, PERIODS, positionClass(), RankedProduct, RankingResponse, RankingVendasPage()

### Community 39 - "DeliveryAssistedOrderModal.tsx"
Cohesion: 0.11
Nodes (20): CartItem, Category, Complement, ComplementGroup, CreatedOrder, DeliveryAssistedOrderModal(), EMPTY_FORM, Field() (+12 more)

### Community 40 - "crud-client.ts"
Cohesion: 0.13
Nodes (23): dataInput(), FORM_VAZIO, FormState, NotaFiscal, NotasFiscaisPage(), RelatorioFiscal, RegistroCrud, UseCrudOptions (+15 more)

### Community 41 - "marketing/page.tsx"
Cohesion: 0.23
Nodes (13): Bio, Campaign, Field(), inDays(), Influencer, ListPanel(), MarketingPage(), money() (+5 more)

### Community 42 - "eslint.config.mjs"
Cohesion: 0.25
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 43 - "financeiro/page.tsx"
Cohesion: 0.17
Nodes (21): Account, asList(), BalanceBand(), CreateForm, CreateTitleModal(), Field(), FinancePage(), Flow (+13 more)

### Community 44 - "compilerOptions"
Cohesion: 0.29
Nodes (6): ../tsconfig.json, compilerOptions, isolatedModules, module, moduleResolution, extends

### Community 45 - "sw.ts"
Cohesion: 0.22
Nodes (6): serwist, WorkerGlobalScope, nextConfig, withSerwist, serwist, @serwist/next

### Community 46 - "operacao/page.tsx"
Cohesion: 0.25
Nodes (10): elapsed(), HealthResponse, HealthState, Measure(), OperationalHealthPage(), ServiceHealth, ServiceRow(), stateLabel (+2 more)

### Community 50 - "apiFetch"
Cohesion: 0.11
Nodes (17): MesaQrCode, MesaQrCodesPage(), MesaResumo, Delivery, DeliveryPortalPage(), Portal, PageData, PublicVacanciesPage() (+9 more)

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
Cohesion: 0.08
Nodes (30): DELETE, dynamic, GET, handler(), OPTIONS, PATCH, POST, PUT (+22 more)

### Community 55 - "[slug]/cardapio/page.tsx"
Cohesion: 0.17
Nodes (12): CartItem, Catalog, Category, Complement, DeliveryQuote, deliveryStatusLabels, DeliveryTracking, money() (+4 more)

### Community 56 - "credito/page.tsx"
Cohesion: 0.24
Nodes (12): Agreement, CheckField(), Client, Credit, CreditPage(), date(), Field(), Metric() (+4 more)

### Community 57 - "complementos/page.tsx"
Cohesion: 0.20
Nodes (10): Complemento, COMPLEMENTO_VAZIO, ComplementoForm, ComplementoGrupo, GRUPO_VAZIO, GrupoForm, regraEscolha(), cn() (+2 more)

### Community 58 - "clientes/page.tsx"
Cohesion: 0.27
Nodes (10): Cliente, ClientesPage(), EMPTY, Field(), Form, Historico, HistoryModal(), ImportModal() (+2 more)

### Community 59 - "gateway/page.tsx"
Cohesion: 0.31
Nodes (9): Action(), Config, dateTime(), GatewayPage(), Metric(), money(), Report, StatusTrack() (+1 more)

### Community 60 - "react"
Cohesion: 0.18
Nodes (8): State, dynamic, runtime, CounterOrder, TenantLink, TenantLinkProps, next, react

### Community 61 - "DataSyncBridge.tsx"
Cohesion: 0.39
Nodes (6): DataSyncBridge(), subscribeLocalDataChanges(), getSocketUrl(), resolveSocketUrl(), connectTableSocket(), socket.io-client

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
Cohesion: 0.20
Nodes (7): resolveTableTransferTarget(), TableTransferTarget, TransferTable, assert, result, source, tables

### Community 66 - "producao/page.tsx"
Cohesion: 0.32
Nodes (7): Modal(), Preparation, PreparationItem, ProducaoPage(), Product, q(), Supply

### Community 67 - "tenant-navigation.ts"
Cohesion: 0.18
Nodes (23): GET(), InstallationPage(), activate(), resetInstallation(), InstallationStatus, API_ORIGIN_COOKIE_PREFIX, AUTH_COOKIE_PREFIX, INSTALLATION_COOKIE_PREFIX (+15 more)

### Community 68 - "@tanstack/react-query"
Cohesion: 0.25
Nodes (6): QUERY_RETRY, QUERY_STALE_TIME_MS, Funcionario, FuncionarioComBiometria, TIPOS, @tanstack/react-query

### Community 69 - "FrontendC"
Cohesion: 0.40
Nodes (4): Ativação da instalação, Desenvolvimento, FrontendC, Verificação

### Community 70 - "verify-offline.cjs"
Cohesion: 0.50
Nodes (3): fake-indexeddb, assert, { indexedDB, IDBKeyRange }

### Community 73 - "inventario/page.tsx"
Cohesion: 0.43
Nodes (6): InventarioEstoquePage(), Inventory, InventoryItem, number(), q(), Supply

### Community 74 - "integracoes/page.tsx"
Cohesion: 0.33
Nodes (6): Integration, IntegrationsPage(), Panel(), Queue, QueueItem, Template

### Community 75 - "recrutamento/page.tsx"
Cohesion: 0.40
Nodes (5): Candidate, Panel(), RecruitmentPage(), stages, Vacancy

## Knowledge Gaps
- **11 isolated node(s):** `RFC-4180`, `@types/node-fetch`, `@tailwindcss/postcss`, `@types/node`, `@types/react` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 682 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `lucide-react`, `ExportMenu.tsx`, `insumos/page.tsx`, `Button`, `CaixaDashboard.tsx`, `@tanstack/react-query`, `dispositivos/page.tsx`, `useToast`, `PageLoader`, `[id]/page.tsx`, `radar-xml/page.tsx`, `PaymentModal.tsx`, `package.json`, `relatorios/page.tsx`, `offline.ts`, `admin/delivery/page.tsx`, `DataTable`, `equipamentos/page.tsx`, `lotes/page.tsx`, `produtos/page.tsx`, `conciliacao/page.tsx`, `ThemeContext.tsx`, `ponto/page.tsx`, `ProductOptionsModal.tsx`, `espelho/page.tsx`, `admin/historico/page.tsx`, `admin/cardapio/page.tsx`, `comandas/page.tsx`, `abastecimento/page.tsx`, `ranking-vendas/page.tsx`, `DeliveryAssistedOrderModal.tsx`, `crud-client.ts`, `marketing/page.tsx`, `financeiro/page.tsx`, `operacao/page.tsx`, `apiFetch`, `fiscal/page.tsx`, `estoque/page.tsx`, `[slug]/cardapio/page.tsx`, `credito/page.tsx`, `complementos/page.tsx`, `clientes/page.tsx`, `gateway/page.tsx`, `DataSyncBridge.tsx`, `relatorio/page.tsx`, `garcons/page.tsx`, `producao/page.tsx`, `tenant-navigation.ts`, `@tanstack/react-query`, `inventario/page.tsx`, `integracoes/page.tsx`, `recrutamento/page.tsx`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `@types/node-fetch`, `@tailwindcss/postcss` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `installation-binding.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14174972314507198 - nodes in this community are weakly interconnected._
- **Why does `apiFetch()` connect `apiFetch` to `lucide-react`, `ExportMenu.tsx`, `insumos/page.tsx`, `api.ts`, `Button`, `CaixaDashboard.tsx`, `dispositivos/page.tsx`, `useToast`, `PageLoader`, `[id]/page.tsx`, `radar-xml/page.tsx`, `PaymentModal.tsx`, `relatorios/page.tsx`, `offline.ts`, `admin/delivery/page.tsx`, `DataTable`, `equipamentos/page.tsx`, `lotes/page.tsx`, `produtos/page.tsx`, `conciliacao/page.tsx`, `ponto/page.tsx`, `espelho/page.tsx`, `admin/historico/page.tsx`, `admin/cardapio/page.tsx`, `comandas/page.tsx`, `abastecimento/page.tsx`, `ranking-vendas/page.tsx`, `DeliveryAssistedOrderModal.tsx`, `crud-client.ts`, `marketing/page.tsx`, `financeiro/page.tsx`, `operacao/page.tsx`, `fiscal/page.tsx`, `estoque/page.tsx`, `backend-proxy.ts`, `credito/page.tsx`, `clientes/page.tsx`, `gateway/page.tsx`, `react`, `DataSyncBridge.tsx`, `relatorio/page.tsx`, `garcons/page.tsx`, `producao/page.tsx`, `@tanstack/react-query`, `inventario/page.tsx`, `integracoes/page.tsx`, `recrutamento/page.tsx`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Should `lucide-react` be split into smaller, more focused modules?**
  _Cohesion score 0.05450165612767239 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `ExportMenu.tsx`, `insumos/page.tsx`, `Button`, `CaixaDashboard.tsx`, `dispositivos/page.tsx`, `useToast`, `PageLoader`, `[id]/page.tsx`, `radar-xml/page.tsx`, `PaymentModal.tsx`, `package.json`, `relatorios/page.tsx`, `offline.ts`, `admin/delivery/page.tsx`, `DataTable`, `equipamentos/page.tsx`, `lotes/page.tsx`, `produtos/page.tsx`, `conciliacao/page.tsx`, `ponto/page.tsx`, `ProductOptionsModal.tsx`, `espelho/page.tsx`, `admin/historico/page.tsx`, `admin/cardapio/page.tsx`, `comandas/page.tsx`, `abastecimento/page.tsx`, `ranking-vendas/page.tsx`, `DeliveryAssistedOrderModal.tsx`, `marketing/page.tsx`, `financeiro/page.tsx`, `operacao/page.tsx`, `apiFetch`, `estoque/page.tsx`, `[slug]/cardapio/page.tsx`, `credito/page.tsx`, `complementos/page.tsx`, `clientes/page.tsx`, `gateway/page.tsx`, `react`, `relatorio/page.tsx`, `garcons/page.tsx`, `producao/page.tsx`, `tenant-navigation.ts`, `@tanstack/react-query`, `inventario/page.tsx`, `integracoes/page.tsx`, `recrutamento/page.tsx`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Should `ExportMenu.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06516290726817042 - nodes in this community are weakly interconnected._