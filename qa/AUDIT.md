# Auditoria inicial

Base reproduzível: ad22014 (origin/main), em checkout separado. O site publicado respondeu HTTP 200. O checkout anterior preserva alterações locais. O estado publicado é a base do PR.

- HTML estático, dados em scripts globais, CSS com CRT, palco central e media queries. Main monta templates conforme o hash. Rotas de galerias sobrevivem a links diretos. Coverflow já tem pointer capture, navegação por teclado e seleção do disco. O skip link já intercepta o hash.
- Boot usa o botão físico e marca a sessão, mas usa localStorage para a marca e só encurta o boot posterior. A tela está inert desde o HTML, inclusive quando os scripts falham. O áudio Web Audio já é criado no gesto. Trilhas locais usam HTMLAudio e síntese de reserva. Não há pausa garantida ao ocultar a página.
- Glitch gera aleatoriedade por pixel durante 570 ms, com limite de ~30 redesenhos/s e sem descarte antecipado para aba oculta. Possui fade para movimento reduzido.
- Galerias aplicam categoria e destaque por rota, chips de ano em memória, dimensões de miniatura quando disponíveis. Viewer usa dialog nativo, atalho e pinça. Grava o item com replaceState, de modo que Voltar pode sair da galeria.
- A atualização busca catálogo vivo via local/Raw/API com carimbo; tentativas a cada 5 s e sem backoff. Dados iniciais dependem do script de designs; uma entrada de capa inválida pode invalidar o conjunto.
- Metas e recursos confirmados: viewport sem safe-area, sem Twitter, social preview quadrada, woff2 local e JS defer. O CSS mobile reduz alguns alvos abaixo de 44 px. Há regras svh/dvh com fallback incompleto.
- A linha de base do navegador, os bytes e a matriz são gravados por tests/audit.mjs em qa/before.json. Capturas selecionadas ficam em qa/shots. Emulação de CPU/rede é uma aproximação do aparelho físico.

## Sequência

Contrato opcional e compatível, robustez/foco/boot e viewer, desempenho/metadados, integração Studio e QA comparativo. O catálogo publicado fica intacto durante a implementação.

## Resultados

Host Windows com Intel Core i3-N305. A matriz foi executada em Edge/Chromium, Firefox e WebKit. Foram 14 tamanhos em Chromium e duas amostras em cada motor adicional. A emulação usou DPR 1/2/3, toque, mouse, movimento reduzido e forced-colors. Na última rodada, 18 execuções terminaram sem exceção, 404 ou rolagem horizontal. O botão Voltar fechou o visualizador em todas. Axe-core em Home e visualizador, a 390 e 1280 px, retornou zero violações. São testes automatizados de laboratório.

| Medida | Antes | Depois |
| --- | ---: | ---: |
| 360×640, CPU 6× + Slow 4G, carga pré-boot | 499.461 bytes / 18 req. | 230.776 bytes / 14 req. |
| 360×640, LCP no perfil lento | 5,78 s | 5,24 s |
| 360×640, CLS até o boot | 0 | 0 |
| 360×640, CLS agregado incluindo navegação | não medido | 0,065 |
| 360×640, soma de bloqueios >50 ms até o boot | 2.858 ms | 532 ms |
| 360×640, maior interação observada | não medido | 568 ms |
| 1280×720, CPU 3×, carga pré-boot | 545.072 bytes / 19 req. | 230.776 bytes / 14 req. |
| 1280×720, LCP no perfil 3× | 0,88 s | 1,36 s |
| 1280×720, CLS após navegação | 0,016 | 0,020 |
| 6×, média de quadros durante transição | 9,3 fps | 26,6 fps |
| 3×, média de quadros durante transição | 20,4 fps | 33,1 fps |
| 1×, média de quadros durante transição | 35,9 fps | 25,4 fps |
| 1×, duração média da transição | 622 ms | 319 ms |
| 6×, duração média da transição | 1.140 ms | 471 ms |
| 1×, heap após 100 trocas e GC | 1,85 → 2,22 MB | 2,01 → 2,50 MB |
| 6×, gesto a primeiro oscilador agendado | 61 ms | 38 ms |

A carga inicial de Chromium ficou distribuída em 20,4 KB de HTML, 61,8 KB de CSS, 124,3 KB de JavaScript, 22,6 KB de fonte e 1,8 KB de SVG. Áudio e imagens da galeria foram solicitados depois do boot. Os valores brutos variam com o despacho do navegador. As amostras de interação em laboratório são uma aproximação e não estabelecem o INP de campo.

| Lighthouse | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mobile antes | 98 | 96 | 100 | 100 | 1,07 s | 0 | 158 ms |
| Mobile depois | 97 | 96 | 100 | 100 | 1,21 s | 0 | 190 ms |
| Desktop antes | 100 | 96 | 100 | 100 | 0,30 s | 0 | 17 ms |
| Desktop depois | 100 | 96 | 100 | 100 | 0,30 s | 0 | 0 ms |

O perfil Lighthouse é separado do perfil 6×. A carga inicial e as pontuações passaram as metas. LCP, CLS agregado e duração das interações no perfil mais lento ficaram fora da meta. As metas de FPS também ficaram abertas. A transição usa menos tempo no cenário medido, mas o número de quadros caiu a 1× e a fase de renderização/decodificação do seletor ainda pode atrasar o pico. O teste de 100 navegações observou crescimento de cerca de 0,50 MB depois de GC e não prova estabilidade em sessões mais longas. Nenhum teste automatizado confirmou INP de campo ou latência até a saída física do som.

O selftest do Studio passou em Release e salvou uma cópia descartável com faixa WAV, SFX, arte de verso/CD e caixa DVD. A prévia copiou recursos novos. O teste do navegador confirmou a capa inicial, arte, rótulo, furo, requisição da trilha, retorno do histórico e boot de sessão em desktop e celular emulado. O catálogo também permaneceu navegável sem JS e quando os scripts de áudio e catálogo foram bloqueados.

## Verificação manual para os dois aparelhos

Roteiro para o Galaxy A04e em Chrome e Firefox Android. Abra uma sessão nova, gire para paisagem antes de ligar, ligue, deslize três capas, abra uma caixa e entre pelo CD. Amplie um pôster com pinça e dois toques, deslize a arte e feche com Voltar. Abra um app e retorne para conferir se a trilha retoma uma única vez. Ative o Modo simples e repita com zoom de sistema e ampliação de texto. Verifique toque, rolagem, volume, barra dinâmica e controle físico. O A04e físico ficou pendente.

Roteiro para o N305 em navegador visível. Teste em janela 1280×720 e tela cheia. Navegue com setas, Home, End, Enter e Esc, troque a aba durante o glitch e confira se fica interativa ao voltar. Abra o visualizador, use zoom de 200%, copie uma URL e cole em uma aba nova. Confira focos e som com teclado, depois a mesma sequência com gamepad físico. Os perfis automatizados foram executados no N305 deste workspace. A rodada manual e o gamepad físico ficaram pendentes.

[Capturas antes/depois](shots/) · [Sinais e pendências](BUGS.md)
