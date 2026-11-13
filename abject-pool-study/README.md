# The Allure of the Abject Body — Visual Pool Study

A responsive, minimal, English-language study app with drag-to-pool or tap-to-pool interactions. Each image can be assigned to multiple emotion pools. The private dashboard shows aggregate statistics split by the researcher-only group and exports anonymised, image-level responses as CSV.

## Run locally

Requires **Node.js 20+**; no `npm install` needed.

```bash
cd abject-pool-study
ADMIN_PASSWORD="choose-a-strong-password" node server.js
```

On Windows PowerShell:

```powershell
$env:ADMIN_PASSWORD="choose-a-strong-password"
node server.js
```

Open `http://localhost:3000` in your browser. Open **Researcher** (upper right) and enter the admin password.

## Publish for participants

Deploy this folder on a Node.js hosting service with `node server.js` as its startup command; set the `ADMIN_PASSWORD` environment variable. **Use HTTPS and a persistent disk**. The app saves data to `data/db.json`, and images to `public/uploads/`. Hosts that wipe disk on redeploy will erase responses and images. Back up both locations. If the host provides a `PORT` environment variable, the app uses it.

**Important:** This is a small research prototype, *not* a hardened platform for personal or clinical data. Do not collect names or sensitive personal information. The server intentionally stores no participant names, emails or IP addresses in the response dataset; your web host may still keep access logs. If using real identifiable portraits, obtain appropriate permission, check copyright and institutional research ethics, and supply contextual credit. Inform respondents what data you collect and how you use it. Make sure the institution agrees with the data retention plan before public deployment.

## Prepare your real study

1. The preloaded 24 pictures are **low-resolution DEMO crops** from your own uploaded visual-reference screenshot, not validated research examples. They have no hidden group classification. Delete them before collecting actual responses.
2. Upload 20–40 high-quality images with original credits through Researcher. Select a private group for each: `constructed` (an intentional make-up, costume, prosthetic or digital transformation), `lived` (a confirmed real bodily difference, with reliable consent/context), or `unclassified`.
3. The participant view hides the group and source credits. It randomises the order for each new session. Do not assume a disability, condition, intersex status or identity from appearance alone.
4. Run a pilot with a small number of people first, then remove pilot responses in the dashboard.
5. Share the public URL and export CSV from the private dashboard to analyze results. Responses are stored on the hosting server, not browser-local only.

## Analysis notes

- Pool categories are **non-exclusive**: someone can select Beautiful + Disturbing + Interesting for one image.
- The group graph shows the percentage of rated images within that group receiving each tag (not the percentage of participants). Percentages can exceed 100% when added together.
- This is exploratory visual research. Group differences are confounded by casting, photography, context, gender presentation, and many other factors. Do not infer why specific people responded in a particular way or make claims about population prevalence.
