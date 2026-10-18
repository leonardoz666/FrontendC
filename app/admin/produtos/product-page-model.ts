import type { CSSProperties } from 'react'

export type TipoTamanho = { id: number; nome: string; tamanhos?: Array<{ id: number; nome: string; valor: number | string; ordem: number }> }
export type Dispositivo = { id: number; nome: string; tipo: string; ativo: boolean }
export type ComplementoGrupo = { id: number; nome: string; obrigatorio: boolean; minEscolhas: number; maxEscolhas: number | null; ativo: boolean }
export type SalesHistory = { totalQuantidade: number; totalValor: number; porCanal: Array<{ canal: string; quantidade: number; valor: number }>; porDia: Array<{ data: string; quantidade: number; valor: number }> }
export type SalesChannel = 'SALAO' | 'BALCAO' | 'DELIVERY' | 'AUTOATENDIMENTO'
export type AvailabilityRule = { id?: number; diaSemana: number; inicioMinuto: number; fimMinuto: number; canal: SalesChannel; ativo: boolean }
export type PromotionRule = { id?: number; valor: number | string; inicio: string; fim: string; canal: SalesChannel; prioridade: number; ativo: boolean }

export const SALES_CHANNELS: Array<{ value: SalesChannel; label: string }> = [{ value: 'SALAO', label: 'Salão' }, { value: 'BALCAO', label: 'Balcão' }, { value: 'DELIVERY', label: 'Delivery' }, { value: 'AUTOATENDIMENTO', label: 'Autoatendimento' }]
export const WEEK_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const minutesToTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
export const timeToMinutes = (value: string) => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes }
export const toLocalDateTime = (value: string) => { const date = new Date(value); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16) }
export function categoryColorStyle(categoryId: number, selected = false) { const hue = Math.round((categoryId * 137.508) % 360); return { '--category-bg': `hsl(${hue} 82% ${selected ? '89%' : '95%'})`, '--category-border': `hsl(${hue} 62% ${selected ? '62%' : '84%'})`, '--category-text': `hsl(${hue} 68% 30%)`, '--category-bg-dark': `hsl(${hue} 42% ${selected ? '24%' : '18%'})`, '--category-border-dark': `hsl(${hue} 48% ${selected ? '52%' : '36%'})`, '--category-text-dark': `hsl(${hue} 82% 82%)` } as CSSProperties }
export function parseStringList(value?: string | null): string[] { if (!value) return []; try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [] } catch { return [] } }
