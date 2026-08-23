# SETUP — stap voor stap

## A. Supabase

### 1. Project maken
1. Ga naar Supabase en klik **New project**.
2. Kies een naam, bv. `telco-kicker`.
3. Maak een sterk database password.
4. Wacht tot het project klaar is.

### 2. Database aanmaken
1. Links: **SQL Editor**.
2. Klik **New query**.
3. Open lokaal het bestand `schema.sql`.
4. Kopieer ALLES.
5. Plak in SQL Editor.
6. Klik **Run**.
7. Je moet nu in **Table Editor** de tabellen `players` en `matches` zien.

> Als je bij de laatste 2 regels over `supabase_realtime` een fout krijgt omdat de tabel al toegevoegd is:
> verwijder enkel die foutgevende regel(s) en run de rest opnieuw. De app zelf blijft werken; realtime kan je ook in Publications aanzetten.

### 3. Publieke browser key ophalen
1. Open **Project Settings**.
2. Ga naar **API / API Keys**.
3. Kopieer:
   - **Project URL**
   - **Publishable key** (`sb_publishable_...`)
4. Open `config.js`.
5. Vervang beide `PASTE_...` waarden.
6. Gebruik NOOIT een secret/service-role key in `config.js`.

### 4. Admin account maken
1. In Supabase: **Authentication > Users**.
2. Maak handmatig 1 admin user met jouw e-mailadres + wachtwoord.
3. Zet indien mogelijk publieke sign-ups uit in **Authentication settings**.
4. Test later op de site via het tandwiel rechtsboven.

De gewone collega's hebben GEEN account nodig.

---

## B. GitHub

### 5. Repository maken
1. GitHub > **New repository**.
2. Naam: `telco-kicker`.
3. Public is het makkelijkst voor gratis GitHub Pages.
4. Maak de repository.

### 6. Bestanden uploaden
Upload in de root van de repository:
- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `logo.png`
- `manifest.webmanifest`
- `sw.js`
- optioneel: `schema.sql`, README, setupdocument

Commit naar `main`.

### 7. GitHub Pages activeren
1. Repo > **Settings**.
2. Links **Pages**.
3. **Source** = `Deploy from a branch`.
4. Branch = `main`.
5. Folder = `/(root)`.
6. **Save**.

GitHub toont daarna je site-URL.

---

## C. Testen

### 8. Eerste test op je gsm
1. Open de GitHub Pages-link.
2. Ga naar **Spelers**.
3. Voeg 4 testspelers toe.
4. Ga naar **Match**.
5. Kies 4 spelers en vul bv. `5 - 3` in.
6. Controleer leaderboard en historiek.
7. Open dezelfde URL op een tweede gsm/pc.
8. Dezelfde data moet zichtbaar zijn.
9. Voeg op toestel 2 een match toe: toestel 1 zou automatisch moeten vernieuwen via Realtime.

### 9. Admin testen
1. Tik rechtsboven op ⚙.
2. Log in met de admin user uit Supabase.
3. Ga naar Historiek.
4. Bij een match verschijnt **beheer**.
5. Pas een score aan en test verwijderen.
6. Bij Spelers kan je een speler deactiveren.

---

## D. Op beginscherm zetten

### iPhone
Safari > Deelknop > **Zet op beginscherm**.

### Android
Chrome > menu > **Toevoegen aan startscherm** of **App installeren**.

---

## E. Hoe de ranking werkt

- Iedereen start op **1000 ELO**.
- Een teamrating = gemiddelde ELO van de 2 spelers.
- Win je tegen een sterker duo, dan stijg je meer.
- Win je tegen een duidelijk zwakker duo, dan stijg je minder.
- Score 5-3 of 10-7: de overwinning telt voor ELO als overwinning; de lengte geeft geen voordeel.
- Voor maandranking wordt dezelfde logica opnieuw berekend met enkel matchen van die maand.
- Minder dan 10 matchen staat als `voorlopig`.

---

## F. Hall of Fame

De Hall of Fame wordt automatisch uit de opgeslagen matchdata berekend.
Na afloop van een maand verschijnt de #1 van die maand als kampioen.
Je hoeft dus GEEN seizoen handmatig af te sluiten.

---

## G. Voor je de link naar 20 collega's stuurt

Test:
- 4 spelers toevoegen
- 5-3
- 10-8
- foutieve match via admin corrigeren
- admin logout
- test op iPhone en Android indien mogelijk
- test tweede toestel voor realtime

Daarna pas de groepslink delen.
