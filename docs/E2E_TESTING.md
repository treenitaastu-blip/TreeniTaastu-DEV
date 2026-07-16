# Põhivoogude E2E-testid

Testid kasutavad Playwrighti ja käivitavad lokaalselt production-laadse Vite'i buildi `e2e` režiimis. Andmebaasi- ja autentimispäringud lähevad ainult eraldatud Supabase stagingu projekti.

## Esmane seadistus

1. Kopeeri `.env.e2e.example` failiks `.env.e2e.local`.
2. Lisa stagingu publishable key.
3. Lisa eraldi stagingu testkasutaja `E2E_USER_EMAIL` ja `E2E_USER_PASSWORD`.
4. Ära kasuta productioni ega päris kliendi kasutajat.

CI-s või arvutis, kus Chrome'i pole, paigalda Playwrighti Chromium:

```bash
npx playwright install chromium
```

Testiseadistus katkestab käivituse automaatselt, kui Supabase URL sisaldab productioni projekti viidet või ei vasta lubatud stagingu projektile.

## Käivitamine

```bash
npm run test:e2e
npm run test:e2e:desktop
npm run test:e2e:mobile
npm run test:e2e:ui
```

HTML-raport:

```bash
npm run test:e2e:report
```

## Kaetud vood

- landeri kriitiline sisu;
- login/signup navigatsioon ja vormide kontrollid;
- parooli nähtavus ja taastamisvaate avamine;
- anonüümse kasutaja suunamine kaitstud lehtedelt;
- hinnad, privaatsus, kasutustingimused ja 404;
- stagingu testkasutaja login ning kliendi avaleht;
- admini ligipääsupiirang;
- staatilise programmi ja PT tellimuse ligipääsupiirangud;
- väljalogimine.

Testid ei saada parooli taastamise kirju, ei tee Stripe'i makseid ega kasuta päris kliendiandmeid.
