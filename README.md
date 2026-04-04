# Bela Vista Manager

Sistema de gestão para o Mini Mercado Bela Vista. Controle de validade de produtos, calculadora de precificação, gestão de fiado e empréstimo de vasilhames — tudo em uma interface web acessível de qualquer dispositivo.

**Acesse:** [bela-vista-manager.vercel.app](https://bela-vista-manager.vercel.app/)

---

## Funcionalidades

### Controle de Validade
- Cadastro de produtos com data de vencimento e quantidade
- Cards de resumo: total, em dia, alerta (7 dias) e vencidos
- Badges visuais por status (verde, amarelo, vermelho)
- Filtro por nome, status e mês de vencimento

### Calculadora de Preço
- Calcula preço de venda a partir do custo e margem desejada
- Exibe lucro por unidade e margem aplicada
- Histórico de todos os cálculos salvos
- Busca por nome do produto

### Controle de Fiado
- Cadastro de clientes com nome e telefone
- Registro de dívidas com descrição, valor e data
- Marcação de pagamento individual
- Resumo de total a receber e total já recebido
- Filtro por cliente, mês e ano
- Modal com histórico completo por cliente

### Controle de Vasilhame
- Registro de empréstimos de cascos de cerveja e refrigerante retornável
- Cerveja Litrinho: Original, Brahma, Bohemia
- Cerveja 600ml: Original, Brahma, Bohemia
- Refrigerante retornável 2L
- Tipo muda automaticamente conforme a marca selecionada (Caixa c/ 24, Avulsa ou Garrafa 2L)
- Controle de devolução com data
- Resumo: emprestados, devolvidos e clientes com casco pendente
- Filtro por cliente, status, mês e ano

---

## Tecnologias

| Tecnologia | Uso |
|---|---|
| **HTML / CSS / JavaScript** | Frontend completo |
| **Supabase** | Banco de dados PostgreSQL (cloud) |
| **Vercel** | Hospedagem e deploy |
| **Google Fonts** | Inter (tipografia) |

---

## Arquitetura

O sistema é um site estático que se comunica diretamente com o Supabase via JavaScript no navegador. Não há backend — toda a lógica de dados é feita via API do Supabase.

```
public/
  index.html          # Página principal com as 4 abas
  css/
    style.css          # Estilos e responsividade
  js/
    supabase-config.js # Configuração do Supabase
    app.js             # Lógica de todas as abas (CRUD + filtros)
  logo.png             # Logo do Mini Mercado Bela Vista
  favicon.svg          # Ícone da aba do navegador
vercel.json            # Configuração de deploy na Vercel
```

---

## Como Acessar

O sistema está hospedado na Vercel e pode ser acessado de qualquer dispositivo pelo link:

**[bela-vista-manager.vercel.app](https://bela-vista-manager.vercel.app/)**

Não é necessário instalar nada. Basta abrir o link no navegador.

### Rodar Localmente

```bash
git clone https://github.com/mbu3no/bela-vista-manager.git
cd bela-vista-manager
npm install
npm run dev
```

Acesse `http://localhost:3000` no navegador.

---

## Responsividade

O sistema é responsivo e funciona em:
- Desktop (sidebar lateral com abas)
- Tablet (layout adaptado)
- Celular (sidebar vira barra superior com scroll horizontal)

---

## Licença

MIT
