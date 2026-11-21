# Registro de bugs e regressões

| ID | Severidade | Reprodução e causa | Correção | Verificação |
| --- | --- | --- | --- | --- |
| WEB-01 | Alta | Carregar a página antes do primeiro gesto já montava o seletor e baixava mídia. O Firefox solicitava também o banner de ~610 KB do template. | Montar o seletor após ligar ou pular e atribuir o src do banner ao entrar no canal. | Contagem e bytes por tipo em before.json/after.json. |
| WEB-02 | Alta | Abrir arte e pressionar Voltar voltava à Home. Um Voltar durante o pico da transição podia deixar o visualizador aberto. | Entrada própria no histórico, reconciliação de item/rota também no fim do glitch, retorno do foco. | Matriz e teste da pasta salva pelo Studio. |
| WEB-03 | Alta | Em timeout/sintaxe de dados ou sem JavaScript, a marcação estava inerte e sem conteúdo navegável. | Fallback estático com contatos e obras, listas defensivas e atualização viva com revalidação e backoff. | Teste sem JS, catálogo antigo e entradas inválidas. |
| WEB-04 | Média | Tela estreita, barra móvel e landscape comprimiam controles e chips. | Safe area, controles de 44 px, quebra de linha e área rolável no visualizador. | Matriz Playwright e fotos de desktop/celular. |
| WEB-05 | Alta | Rótulo falado não incluía o texto impresso na capa. Os versos roláveis não tinham foco. | Nome inclui o texto impresso, foco móvel somente na capa selecionada e verso interativo apenas ao virar. | axe-core na Home e no visualizador. |
| WEB-06 | Média | Recarregar repetia a abertura. Perder visibilidade não pausava todas as trilhas. | Abertura por sessão e boot=0, eventos de visibilidade e preferências de mudo, volume e Modo simples. | Teste integrado recarrega a mesma sessão. |
| WEB-07 | Média | A estática de 570 ms calculava pixels repetidamente e podia ficar suspensa em segundo plano. | Textura de baixa luminância reaproveitada, 330 ms planejados, qualidade adaptativa e encerramento ao ocultar. | Perfil de transição e memória. |
| WEB-08 | Média | Obra ausente deixava uma imagem quebrada. Filtros de ano se perdiam em links. | Placeholder, retry, retorno ao original quando WebP falha e estado ano no hash. | Testes de integração e inspeção de HTML em galeria. |
| WEB-09 | Baixa | Preview quadrada e metadados inconsistentes. | OpenGraph 1200×630 e fallback, Twitter, ícones e manifesto, descrição de rota e sitemap. | Lighthouse e validação dos arquivos locais. |
| STD-01 | Alta | Upload de disco, verso ou SFX não tinha caminho no contrato anterior. | Mídia registrada em prévia, drafts, histórico, validação e salvar/publicar. | Selftest e servidor da cópia salva. |
| STD-02 | Média | Adicionar propriedades a modelos de dados antigos poderia regravar arquivos sem mudança. | Campos novos nulos omitidos nos scripts e comparação de scripts normalizados. | Selftest compara conteúdo original e diff vazio. |
| STD-03 | Média | Não havia controle de loop com pontos nem edição de volume por faixa e evento. | Opções de áudio, análise e ajuste de WAV, seletor de efeitos, validação de limites. | Selftest de loop invertido, WAV e browser fixture. |

## Cobertura e limites

A matriz testa tamanhos de 360×640 a 3440×1440 em Chromium, com amostra mobile e desktop em Firefox e WebKit. Os perfis de baixo desempenho são emulados. Notch, barra dinâmica do Safari e saída sonora real, rubber-banding, zoom de sistema 200%, escala de fonte do Android e gamepad físico ainda precisam de dispositivo. O cálculo de FPS observa quadros do navegador e o cálculo de áudio mede o agendamento do primeiro oscilador. Os dados de interação não representam INP de campo.

A inspeção encontrou controles funcionais sem rolagem horizontal na matriz. Uma alteração de ordem de história foi testada de novo após a primeira rodada. Dados da população real, garantia de 3 flashes/s por ferramenta especializada, orçamento remoto completo de áudio e testes em aparelhos físicos continuam pendentes.
