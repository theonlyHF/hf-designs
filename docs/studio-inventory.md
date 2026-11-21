# Inventário do HF Designs Studio

Base f6ee74b. WinForms/GDI+ com StudioTheme, um único EXE .NET Framework, sem NuGet.

| Área | Implementação atual |
| --- | --- |
| SoundEditor / ScreenChoice | MP3, OGG, WAV, M4A de até 10 MB. Um arquivo por slot de boot, início, contato, galerias e cada capa. Quatro vinhetas sintetizadas, restaurar padrão e página local de teste com volume. HomeEditor mantém cor, fundo e efeito. |
| CoverManager / CoverDetails / ArtChoice | Capas ordenáveis, criação/remoção, categoria, título e verso textual, cor, imagem do catálogo ou upload, moldura personalizável, fundo padrão de tecido, texto central editável, estilos salvos localmente. |
| CasePreview | Frente/verso/CD e formato quadrado/vertical. Quatro estilos de disco (prata, arcade, impressão, óptico), arte da frente nas opções correspondentes. |
| CoverCropEditor / CoverCrop | Ajuste independente de posição X/Y e zoom da frente nos formatos quadrado e vertical. |
| Catalog / CatalogSnapshot / Repository | JavaScriptSerializer, listas estáticas e espelho JSON vivo. ReferencedFiles / ReferencedImages dirigem upload, save e mídia de prévia. BuildPreview copia caminhos fixos e mídia registrada, PreparePreviewAudit gera diagnóstico. |
| StudioDraft / SavedDraft / Snapshot / RecordUndo | Objetos serializados do catálogo, mídia em staging, exportação ZIP, merge por item, histórico do Git e desfazer/refazer. |
| DescribeChanges / ValidatePublication | Diff de design/capa por item e de Home completo, validação estrutural e verificação de disponibilidade de mídia e links. |

Adicionar configurações opcionais no Home e na capa, preservando slots/sintetizadores, estilos e recortes existentes. Fazer referências de mídia, validação, diff e round-trip antes de confiar nos novos controles para publicação.
