# Segurança em Hardware — Seminário 05

Apresentação interativa (HTML/CSS/JS + Three.js) para a disciplina **Arquitetura e Organização de Computadores** (ARQ054701 — IFSC Gaspar).

**Autor:** Guilherme Vinícius de Souza

## Conteúdo

1. Segurança em Hardware
2. A CPU não espera — execução especulativa e fora de ordem
3. O cache dedura — ataques de canal lateral via cache
4. Escutar o cofre
5. Meltdown
6. Spectre
7. A conta chega — impacto de desempenho das correções
8. O fantasma volta — novas variantes
9. Blindagem — mitigações
10. Desempenho x Segurança

## Como abrir

Basta abrir o arquivo `index.html` em um navegador moderno (Chrome, Edge ou Firefox). Não precisa de servidor nem instalação — o Three.js já está incluído localmente.

## Atalhos de teclado

| Tecla | Ação |
|---|---|
| → ↓ PageDown Espaço Enter | Próximo slide |
| ← ↑ PageUp Backspace | Slide anterior |
| Home / End | Primeiro / último slide |
| 1–9, 0 | Ir direto para o slide (0 = slide 10) |
| F | Tela cheia |
| T | Iniciar/pausar cronômetro |
| R | Reiniciar cronômetro |

## Estrutura

| Arquivo | Descrição |
|---|---|
| `index.html` | Estrutura e textos dos slides |
| `style.css` | Estilos visuais (efeito glitch, layout) |
| `script.js` | Navegação entre slides e animações 3D |
| `three.min.js` | Biblioteca Three.js (gráficos 3D) |
