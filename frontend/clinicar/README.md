# Frontend CliniCar

Interface Angular 21 LTS com TypeScript 5.9, RxJS, Bootstrap e Bootstrap Icons. Utilize Node.js 22.14.0 para instalar e compilar as dependências.

As instruções de execução completa com backend, MySQL, Nginx e Mailpit estão no [README principal](../../README.md).

## Comandos

Execute nesta pasta:

```powershell
npm ci
npm start
```

O servidor de desenvolvimento utiliza `http://localhost:4200`. Para acesso integrado à API, utilize o ambiente Docker descrito no README principal.

```powershell
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
npx playwright test
```

O build é gerado em `dist/clinicar/browser`. Os testes unitários utilizam Jasmine/Karma e ChromeHeadless. Os testes Playwright iniciam uma prévia na porta 4301 e usam respostas simuladas da API, sem gravar cadastros ou enviar mensagens reais. A execução local utiliza Google Chrome; o CI utiliza Chromium.

As páginas administrativas são carregadas sob demanda. Componentes compartilhados organizam paginação, seleção de cadastros, formatação, notificações e ajuda contextual. Os layouts mantêm o padrão visual do CliniCar e possuem adaptações para tablet e celular.
