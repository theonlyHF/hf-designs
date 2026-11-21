# Alterações por área

- **index.html, css/style.css, js/main.js**: boot por sessão, modo simples, foco e gestos, área segura, histórico do visualizador, estados de imagem, controles de 44 px e metadados por rota. O CRT, o seletor e as rotas públicas foram preservados.
- **js/options.js, js/audio.js**: normalização de campos opcionais, faixas por escopo e efeitos personalizados, volume, mudo, suspensão, filtros e crossfade. O GoatCounter usa o endpoint de contagem em vez de carregar um script externo.
- **js/glitch.js, js/catalog-live.js**: ruído de baixa luminância, redução adaptativa e paginação da atualização com backoff.
- **assets, data/thumbnails.js, tools/optimize-images.mjs**: derivadas WebP, fallback JPEG, metadados, preview panorâmica e ícones. PWA com manifesto, sem service worker.
- **Studio Catalog, OptionValidation, StudioPublication, StudioWorkflow, Program e Artwork**: contrato opcional, validação, integração dos caminhos e prévia, imagens e save incremental.
- **Studio AudioOptionsEditor, WaveformEditor, SoundEditor**: edição por faixa e efeito, forma de onda WAV e prévia sonora.
- **Studio CoverManager, CoverOptionsEditor, CoverCropEditor, CasePreview**: editor de caixa, arte de disco, verso e lombada, recortes de frente, prévia e gestão de capas.

## Decisões e pendências

- WebP foi escolhido para a entrega inicial. Os originais e JPEGs preexistentes seguem disponíveis. Miniaturas de obras futuras salvas pelo Studio usam JPEG até rodar a ferramenta de derivação.
- A reprodução por pontos de loop e crossfade segue a granularidade do HTMLAudio e a latência da rede. Loop sample-accurate para mídia comprimida, análise de MP3/OGG/M4A no Studio, controles A/B no app, conversão FFmpeg e normalização continuam pendentes. O ajuste visual de loop/corte no Studio usa WAV PCM 16 bits.
- A prévia WinForms mostra os novos atributos principais. A simulação 3D, recortes independentes de verso, lombada, CD e celular, guias magnéticas e aplicar estilo em lote continuam pendentes. O navegador mostra o movimento e o giro de CD reais.
- Movimento de foco opcional por Gamepad API foi implementado. Validação com controle físico, iOS com Web Share e Android nativo continua pendente.
- A medição de estresse é local. Repositório do Studio separado e sem remote configurado. A publicação, o histórico autenticado e o merge real de rascunhos receberam cobertura de serialização e pasta local, com validação remota pendente.
