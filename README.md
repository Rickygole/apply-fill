# Apply Fill

A Chrome extension that fills job application forms from a profile you save once. It fills, highlights what it touched, and stops. You review and press submit yourself.

## What it handles

- Text fields, textareas, native selects, radio groups and checkboxes, matched by label, `aria-*`, `autocomplete`, placeholder and field name
- Greenhouse style react-select dropdowns (relocation, sponsorship, EEO questions)
- Workday: Select One dropdowns, search prompts (country phone code, field of study, how did you hear), Yes/No radios, month and year date boxes
- Workday My Experience: adds and fills one Work Experience panel per job, Education panels with degree, field of study, GPA and years, and your website links
- Common screening questions: under 18, terminated for cause, interviewed or applied before, open to on site or hybrid work, relatives at the company, current employee or student of the company, worked there before, and the "if yes, please explain" box after the sponsorship question
- Ashby style Yes/No button pairs
- Resume upload is optional: save a PDF and it goes into the resume field, or leave it empty and attach a tailored resume yourself each time
- Forms inside iframes, so Greenhouse boards embedded on company sites work too
- Screening questions: work authorization, sponsorship, non-compete, 18+, relocation, prior employment
- Voluntary self-ID: gender, race, Hispanic or Latino, veteran and disability status

Questions that appear only after an earlier answer (like race after the Hispanic question) are picked up on a second look.

Filled fields get a green outline. Required fields it could not answer get an orange outline and are listed in the popup. It never overwrites something you already typed.

## Install

1. Open `chrome://extensions` and turn on Developer mode
2. Click Load unpacked and pick this folder
3. Click the extension icon, then Edit profile, fill it in, Save

## Use

A green Fill application button shows up in the bottom right corner whenever you land on an application form. Click it, review, submit yourself. Click again after a multi-step form moves to the next page.

Where it shows up:

- About 80 job sites and applicant tracking systems: Greenhouse, Lever, Ashby, Workday, SmartRecruiters, iCIMS, Taleo, SuccessFactors, ADP, LinkedIn, Indeed, Glassdoor, Handshake, Wellfound, USAJobs, Dice, ZipRecruiter and more, plus any `jobs.`, `careers.` or `.jobs` domain
- Any page whose URL or title looks like a job application and has at least two applicant fields
- Any other page with three or more applicant fields (name, email, phone, resume, links, address, screening questions)
- Never on login pages

If a site is missed, open the extension popup and tick Always show the button on that site.

The x next to the button hides it for that page until you close the tab. To turn the button off everywhere, untick it at the top of the profile page.

`Alt+Shift+F` and the toolbar icon still work on any page.

## Importing a profile

The options page imports and exports JSON shaped like this. Import only fills boxes that are empty, so anything you typed stays. The resume part is optional.

```json
{
  "profile": { "first_name": "Ada", "last_name": "Lovelace", "email": "ada@example.com", "authorized_us": true },
  "resume": { "name": "resume.pdf", "type": "application/pdf", "data": "<base64>" }
}
```

Work experience and education are lists in the profile:

```json
"experience": [{ "title": "Research Assistant", "company": "Acme University", "location": "Baltimore, MD", "from": "01/2025", "current": true, "description": "..." }],
"education": [{ "school": "Acme University", "degree": "Master of Science", "field": "Computer Science", "field_alt": "Computer and Information Science", "gpa": "4.0", "from": "2025", "to": "2026" }]
```

`field_alt` is tried when the site's field of study list does not have your exact major.

`tools/export_profile.py` builds that file from a `profile.yaml` in the lazy-apply format:

```
python tools/export_profile.py profile.yaml private/profile.json path/to/resume.pdf
```

`private/` is git ignored. Keep anything with real personal data in there.

## Privacy

Everything lives in `chrome.storage.local` on your machine. The extension makes no network requests. It asks for access to all sites because application forms are often embedded in an iframe from a different domain than the page you are on.

## Limits

- Terms and consent checkboxes are left for you on purpose.
- If an entry already has text in it, the extension leaves that entry alone. Clear junk first if you want it refilled.
- Free text questions specific to a company are left blank on purpose.
- Dropdowns that load options from a server (school or location search) are filled by typing, which works less reliably.

## License

MIT
