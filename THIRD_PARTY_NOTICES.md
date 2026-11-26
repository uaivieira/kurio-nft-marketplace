# Avisos de terceiros

Material de terceiros incorporado ao código-fonte (e não apenas instalado como dependência do `package.json`). As licenças das dependências npm acompanham cada pacote em `node_modules`.

## Iconly

- **Onde:** `src/components/icons/index.tsx`, de `HomeIcon` a `DiscountIcon` (ícones de interface: início, estrela, setas, filtro, coração, busca, usuário, carrinho, carteira, entre outros).
- **Origem:** [Iconly](https://iconly.pro), via `react-iconly` 2.2.10. Só as variantes usadas nos frames do Figma foram copiadas como SVG local, pintadas com `currentColor`; o runtime da biblioteca não é carregado.
- **Licença:** MIT.

## Simple Icons

- **Onde:** `src/components/icons/index.tsx`, de `FacebookIcon` a `YoutubeIcon` (marcas das redes sociais do rodapé e do compartilhamento: Facebook, Instagram, X, LinkedIn e YouTube).
- **Origem:** [Simple Icons](https://simpleicons.org) 9.
- **Licença:** CC0 1.0 (domínio público). As marcas continuam pertencendo aos respectivos titulares.

## Lucide

- **Onde:** `src/components/icons/glyphs.tsx` (glifos utilitários: mais e menos, atualizar, restaurar, chave inglesa, alertas, carregando, fechar, confirmação, seta, círculos e informação).
- **Origem:** geometria dos ícones de [Lucide](https://lucide.dev), incorporada como SVG local para não enviar o runtime da biblioteca.
- **Licença:** ISC.

## Roboto Mono

- **Onde:** `public/fonts/roboto-mono-latin-400-normal.woff2` e `public/fonts/roboto-mono-latin-700-normal.woff2`.
- **Origem:** família [Roboto Mono](https://fonts.google.com/specimen/Roboto+Mono) do Google Fonts, auto-hospedada (subconjunto latino, pesos 400 e 700).
- **Licença:** a definida pelo Google Fonts para a família (consulte a página de licença da fonte).

## Artes e ícones do Figma

As artes de NFT (`assets-src/nft/`, `public/nft/`), o ícone de scanner da barra mobile (`ScanIcon`), o envelope de agradecimento do recibo (`ThankYouIcon`) e os logotipos coloridos dos botões "Continuar com Google/Facebook" (`GoogleLogoIcon`, `FacebookLogoIcon`) foram exportados do arquivo Figma do desafio. Os logotipos continuam pertencendo aos respectivos titulares.
