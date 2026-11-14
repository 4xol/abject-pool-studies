# The Allure of the Abject Body — Visual Pool Study (Purple v3)

Minimal black-and-purple, mobile-first visual study for **Vercel + Supabase**.

### Participant pools

**Intriguing · Pleasant · Beautiful · Disturbing**

- Multiple pools per image, selectable by tap or drag.
- No free-text questions. Participants cannot see private image groups.
- Random image order, skip, go back, anonymous submission.
- Researcher uploads images, labels private constructed/lived groups, views statistics and exports CSV.
- UI uses screenshot-inspired colors: black `#000000`, charcoal `#1a1a1a`, purple `#4e2f88`.

### Deploy

Unzip, upload **the contents** to the **GitHub repository root** (`index.html` must be visible at the root) and import into Vercel (Framework: Other, root: `./`, no build). Please read `SETUP_中文.md`.

### Important for upgrades

If your Supabase database already used the v2 pools, run `supabase/UPDATE_EXISTING_DATABASE.sql` before participants submit to this version. New installs run `supabase/setup.sql` instead. **Old answers are preserved as written** and are not automatically reinterpreted. Export and clear previous test responses before starting a new wave.

Keep your own previously configured **public** Supabase URL + publishable/anon key in `config.js` if replacing an existing deployment. Do not publish service-role keys.

The 24 demo images are placeholder screenshot crops, not verified study stimuli; they must be replaced for research. Images can be uploaded through Researcher → Images once Supabase is connected.
