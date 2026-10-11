import {
  formatarNumeroQuantidade,
  formatarQuantidade,
  quantidadeParaInput,
} from '../app/lib/quantity'

const casos: Array<[string, string, string]> = [
  ['inteiro sem zeros', formatarQuantidade('20.000', 'UN'), '20 un'],
  ['fração sem zeros finais', formatarQuantidade('2.500', 'KG'), '2,5 kg'],
  ['fração preservada', formatarQuantidade('0.125', 'L'), '0,125 l'],
  ['número sem unidade', formatarNumeroQuantidade('20.000'), '20'],
  ['precisão de ficha técnica', formatarQuantidade('0.1234', 'KG', 4), '0,1234 kg'],
  ['valor para edição', quantidadeParaInput('20.000'), '20'],
]

for (const [nome, recebido, esperado] of casos) {
  if (recebido !== esperado) {
    throw new Error(`${nome}: esperado "${esperado}", recebido "${recebido}"`)
  }
}

console.log(`${casos.length} verificações de quantidade passaram`)
