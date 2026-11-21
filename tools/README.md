# Desenvolvimento e testes

O site abre pelo index.html e continua estático. Para simular Pages e a atualização do catálogo, rode `node tools/serve.mjs . 4173` e abra o endereço impresso.

- Instale Playwright, axe-core, Lighthouse e sharp como ferramentas locais de desenvolvimento, fora da pasta servida. Use `HF_QA_MODULES` para apontar para a pasta da instalação. Execute `npx playwright install chromium firefox webkit`.
- `node tests/audit.mjs . after` gera a matriz e capturas. Use `before` com o checkout do commit ad22014. `HF_QA_EDGE` permite testar com o Edge instalado. `HF_ENGINES` escolhe motores separados por vírgula.
- `node tools/optimize-images.mjs .` atualiza WebP, metadados de miniaturas, ícones e prévia de compartilhamento. O JPEG legado e a arte original ficam disponíveis.
- `node tests/studio-integration.mjs http://127.0.0.1:4175/` testa uma cópia preenchida com `--selftest caminho-do-log pasta-da-copia`. A cópia precisa conter o marcador `.hf-test-fixture`. Use uma pasta descartável.
- `node tests/profile.mjs http://127.0.0.1:4173/ qa/profile-after.json` mede duração, quadros, heap e agendamento da vinheta. Execute com uma única sessão de navegador de teste usando o servidor local.
