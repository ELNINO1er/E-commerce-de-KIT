# KIC — Prompts d'images (Midjourney / DALL·E 3)

Repris du projet Claude Design « Landing page KIC ». Correspondance slot → fichier attendu dans
`img/` : voir le tableau du [README](README.md#images).

Slots : `kic-hero-product`, `kic-about-splash`, `kic-cat-beurre`, `kic-cat-poudre`, `kic-cat-pate`,
`kic-cat-feves`, `kic-news-bg`, `kic-footer-wave`.

## 1. Hero — `kic-hero-product`
Photorealistic product hero: a premium matte-black glass jar of "KIC" pure cocoa butter, levitating slightly tilted in mid-air, macro detail on the creamy pale-gold butter surface, glossy dark chocolate liquid splash curling behind it, roasted cacao beans and cracked cocoa pod shards frozen mid-explosion around the jar, deep chocolate-black background (#1C100B), warm amber rim light from the upper right, cinematic studio lighting, shallow depth of field, ultra sharp, 8k, commercial food photography, isolated subject, clean negative space above and below --ar 1:1

## 2. À propos — `kic-about-splash`
Levitating chunks of raw dark chocolate, broken cacao pod halves and roasted cacao beans flying through the air in a dynamic radial burst, subtle directional motion blur on the outer fragments, bright warm amber-yellow seamless studio background (#F4C430), hard top light with soft bounce, hyper-detailed macro texture on every fragment, high-end food photography, no props, no hands --ar 5:4

## 3. Poudre de cacao — `kic-cat-poudre`
Top-down and slightly angled shot of an open ceramic bowl filled with rich raw organic cocoa powder, a fine powder explosion puffing upward and to the left, thin ribbons of dark melted chocolate splashing around the rim, scattered cacao nibs on a dark brown stone surface, moody warm side lighting, premium packaging aesthetic, deep chocolate background, photorealistic, 8k --ar 3:2

## 4. Footer — `kic-footer-wave`
A wide luxury banner: a realistic creamy wave of dark chocolate and milk swirling and splashing horizontally across the frame, glossy caramel highlights, droplets suspended in the air, chocolate drips falling from the top edge, warm ambient amber lighting, near-black chocolate background, ultra-detailed liquid simulation, product hero banner style, 8k --ar 21:9

## Variantes utiles
- Beurre de cacao (`kic-cat-beurre`) : prompt 1 + « creamy pale butter splash, wide crop, subject on the right third ».
- Pâte de cacao (`kic-cat-pate`) : « stacked squares of artisanal dark chocolate with a molten cocoa mass pouring over them, dark background, macro ».
- Fèves torréfiées (`kic-cat-feves`) : « bowl of glossy roasted cacao beans, beans spilling and bouncing, warm amber-gold background ».

## Note technique
`kic-hero-product` et `kic-about-splash` sont affichés en `object-fit: contain` avec un
`drop-shadow()` : il leur faut un **PNG détouré (fond transparent)**. Les six autres sont en
`object-fit: cover` derrière un voile dégradé — un JPEG classique suffit.
