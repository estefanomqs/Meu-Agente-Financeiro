# Configuração do Ambiente Local

Detectamos que o **Node.js** não está instalado no seu sistema. Este projeto é uma aplicação React moderna que requer o Node.js para gerenciar dependências e rodar o servidor de desenvolvimento.

## Passos para Configuração

### 1. Instalar Node.js
1. Acesse [nodejs.org](https://nodejs.org/).
2. Baixe a versão **LTS** (Long Term Support) recomendada (atualmente v20 ou v22).
3. Instale o software seguindo as instruções do instalador (next, next, finish).
4. **Reinicie** o seu terminal ou o Antigravity (se necessário) após a instalação para que o comando `npm` seja reconhecido.

### 2. Configurar o Projeto
Após instalar o Node.js, abra este projeto novamente e execute os seguintes comandos no terminal:

```bash
# 1. Instalar as dependências listadas no package.json
npm install

# 2. Rodar o servidor de desenvolvimento
npm run dev
```

### 3. Acessar o App
O terminal mostrará um link local, geralmente `http://localhost:5173/`, que você pode abrir no navegador.

## Estrutura do Projeto
- **package.json**: Lista as bibliotecas usadas (React, Vite, Firebase, etc).
- **vite.config.ts**: Configuração do bundler Vite.
- **index.html**: Ponto de entrada da aplicação.
- **App.tsx**: Componente principal.
