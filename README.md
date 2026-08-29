# Tel&Co Kicker League V8 — ALL

Deze versie bouwt verder op de werkende V7 en voegt veilig toe:
- 1v1 + 2v2
- ELO
- profielfoto's via Supabase Storage
- klikbare player profiles
- best partner / nemesis / favoriete tegenstander
- variation %
- 'tijd om te spelen'
- vernieuwde TV mode
- realtime refresh
- fullscreen result takeover op TV

## Eerst éénmalig
Open Supabase > SQL Editor en voer `supabase-migration.sql` uit.

Deze migration verwijdert GEEN bestaande spelers of matchen.

## Daarna
1. Upload alle websitebestanden naar je GitHub Pages repo.
2. Commit changes.
3. Open https://telencokicker.be/ en doe Ctrl+F5.

`config.js` en `CNAME` zijn reeds ingevuld.
