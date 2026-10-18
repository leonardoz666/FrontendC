const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'app/components/ui/DataTable.tsx'), 'utf8')
const searchEffect = source.match(/\/\/ Avisa o servidor[\s\S]*?useEffect\(\(\) => \{([\s\S]*?)\n\s*\}, \[([^\]]*)\]\)/)

const checks = [
  {
    name: 'mantém o callback de busca mais recente em uma referência estável',
    pass: /const onSearchRef = useRef\(onSearch\)/.test(source),
  },
  {
    name: 'notifica a busca pela referência estável',
    pass: Boolean(searchEffect && /onSearchRef\.current\?\.\(debouncedSearch\.trim\(\)\)/.test(searchEffect[1])),
  },
  {
    name: 'não reinicia o efeito quando um callback inline muda de identidade',
    pass: Boolean(searchEffect && !searchEffect[2].split(',').map(value => value.trim()).includes('onSearch')),
  },
]

let failed = 0
for (const check of checks) {
  if (check.pass) console.log(`OK  ${check.name}`)
  else {
    failed += 1
    console.error(`FALHA  ${check.name}`)
  }
}

if (failed) {
  console.error(`\n${failed} proteção(ões) contra loop de callbacks instáveis ausente(s).`)
  process.exit(1)
}

console.log('\nEstabilidade dos callbacks da DataTable verificada.')
