# Tel&Co Kicker League — Next Level V4

Nieuw in V4:
- Volledig lichtere Tel&Co-look
- Groot en duidelijk Tel&Co Adviesbureau-logo
- Business Partner-logo in header en TV-mode
- 1v1 én 2v2 in dezelfde ELO-ranking
- 1v1/2v2 aantallen zichtbaar per speler
- Profielfoto upload via Supabase Storage
- Realtime TV-dashboard
- Variation score, streaks, climber en priority players

Installatie:
1. Zet je bestaande Supabase URL en publishable/anon key in `config.js`.
2. Run `upgrade.sql` één keer in Supabase SQL Editor.
3. Upload daarna alle bestanden naar de root van je GitHub Pages repo.
4. Gewone site: `telencokicker.be`
5. TV: `telencokicker.be/tv.html`

Belangrijk:
- `upgrade.sql` maakt de tweede speler in elk team optioneel zodat 1v1 kan worden opgeslagen.
- Bestaande 2v2-matchen blijven behouden.
- 1v1 gebruikt dezelfde ELO-logica: individuele rating tegen individuele rating.
- 2v2 gebruikt het gemiddelde van beide teamratings.
