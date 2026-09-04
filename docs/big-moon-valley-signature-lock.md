# Archived: Big Moon Valley compatibility lock

Status: **RETIRED FROM ACTIVE LANERIQ PRODUCT SHELL**

Current authority: **LANERIQ AI Living Intelligence UI™ / LIUI-2026.2**.

Big Moon Valley was an earlier LANERIQ visual direction. Its historical assets, CSS selectors and internal `moon-city` preset may remain only where backward compatibility or migration safety requires them. They must not determine the current LANERIQ homepage, global navigation, product-shell composition or active wallpaper choices.

Current product rules:

- Homepage first paint: **Future City + People**.
- Homepage stack: **Hero → Intent Composer → Create Image / Design UI → Style → Templates → Build CTA**.
- Creation journey: **Idea → Plan → Build → Preview → Launch → Manage**.
- Global navigation: **Home / Projects / Create / Templates / More**.
- `AdaptiveWallpaperEngine` must not override Page 1.
- Historical `moon-city` preferences are migrated to a non-moon LIUI fallback for the current LANERIQ shell.
- Big Moon Valley must not appear in current LANERIQ wallpaper choices.
- Generated customer projects that already persist a historical wallpaper reference may keep compatibility handling; this does not restore Big Moon as the LANERIQ product design standard.

CI should treat this file as historical migration guidance only. The executable design source of truth is `lib/product/laneriq-18-page-master.js`, with LIUI presentation enforced by the current LIUI surface gates.
