# FantesDay App

App mobile do **FantesDay** (hábitos, alimentação e treinos com gamificação), feito com **Expo SDK 58** e **Expo Router**. Ele consome a [FantesDay API](../FantesDay_API) e segue o design do canvas "FantesDay App" (tema escuro, Unbounded + Manrope, acento `#C8F55A`).

## Como rodar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Por padrão, o app usa a API publicada em `https://fantesday-api.onrender.com`. Para usar a API rodando na sua máquina, crie um `.env` a partir do `.env.example`, que já vem com `EXPO_PUBLIC_API_URL=local`:
   ```bash
   cp .env.example .env
   ```
   Com `local`, o app usa o IP da máquina que roda o Metro, na porta 8080 (no emulador Android, `http://10.0.2.2:8080`). Também dá para colocar um endereço completo. Depois de mudar o `.env`, reinicie com `npx expo start --clear`.
3. Inicie o app:
   ```bash
   npx expo start
   ```

> A leitura de código de barras (`expo-camera`) e o Face ID (`expo-local-authentication`) funcionam no Expo Go. Para testar o Face ID no iOS com o texto de permissão próprio, use um development build (`npx expo run:ios`).

## Estrutura

```
src/
├── app/                 # Rotas (Expo Router)
│   ├── (auth)/          # login, cadastro, esqueci-senha
│   ├── (tabs)/          # Hoje, Tarefas, Nutrição, Treinos (barra inferior própria)
│   ├── perfil/  tarefas/  atividades/
│   ├── refeicoes/  alimentos/          # refeição, busca, detalhe, cadastro, scanner
│   ├── treinos/  rotinas/  exercicios/ # treino ao vivo, resumo, histórico, catálogo
│   ├── rank/  ranking/                 # rank de força, mapa muscular, selos, rankings
│   └── celebracao/                     # animações: nível, rank, sequência, ranking
├── api/                 # client.ts (fetch + refresh automático), endpoints.ts, types.ts
├── auth/                # AuthContext (sessão, Face ID) e armazenamento seguro
├── components/          # ui.tsx (kit do guia de estilo), Icon, Toast
├── hooks/               # useApi / useAction
├── theme/               # tokens do guia de estilo
└── utils/               # formatação pt-BR, ranks
assets/ranks/            # selos dos 9 ranks
```

## Autenticação

- O `token` (1 h) fica só em memória. O `refreshToken` fica no Keychain/Keystore (`expo-secure-store`).
- Quando a API responde `401`, o client chama `/api/auth/refresh` uma vez, mesmo com várias requisições ao mesmo tempo, e repete a requisição.
- **Face ID:** com a preferência ligada, o app não entra sozinho ao abrir. Ele pede a biometria e então renova a sessão com o refresh token guardado.

## Comandos

```bash
npx tsc --noEmit   # checagem de tipos
npx expo-doctor    # diagnóstico de dependências
```
