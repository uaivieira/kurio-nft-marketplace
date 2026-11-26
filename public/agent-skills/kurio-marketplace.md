---
name: kurio-marketplace
description: Browse the Kurio demo NFT marketplace, read NFT details and build a cart for a human to review and confirm.
---

# Kurio marketplace

Kurio is a demonstration marketplace. Its backend is simulated in the browser, so every price, wallet, payment and order is fictitious. Never present a Kurio order as a real purchase.

## What an agent can do

- Search the catalog and open NFT pages.
- Read editions, prices (ETH as exact decimal strings) and availability.
- Add editions to the cart, change quantities and read the price quote.
- Never place an order on the user's behalf: the checkout has a review step that a human must confirm.

## WebMCP tools

When the browser exposes `navigator.modelContext`, the site registers these tools after the page loads. They call the same API as the interface, so results match what the user sees.

| Tool | Input | Result |
|---|---|---|
| `search_nfts` | `q`, `collections`, `networks`, `minPrice`, `maxPrice`, `sort`, `page` (all optional) | Page of NFTs with id, name, price, availability and network |
| `get_nft` | `nftId` | Editions with price, availability and per-order limit |
| `add_to_cart` | `nftId`, `editionId`, `quantity` | Updated cart |
| `get_cart` | none | Cart lines and the quote (subtotal, discount, network fee, total) |
| `open_page` | `path` (internal route, for example `/cart`) | Navigates the open tab |

Forms (search, log in, sign up, coupon, checkout, profile, password and wallets) carry declarative WebMCP annotations (`toolname`, `tooldescription`) and are never submitted automatically.

## Without WebMCP

- Catalog: `/mercado?q=<text>&sort=<recent|price-asc|price-desc|name>&minPrice=<eth>&maxPrice=<eth>&page=<n>`; `collections` and `networks` are JSON arrays, for example `networks=["polygon"]`
- NFT detail: `/nft/<id>`, for example `/nft/emerald-ape-042`
- Cart: `/cart`; checkout: `/checkout` (requires login)
- Demo account: `ana@kurio.test` / `Kurio#2026` (fictitious)
