# Apply Fill

A Chrome extension that fills job application forms from a profile you save once. It fills, highlights what it touched, and stops. You review and press submit yourself.

## What it handles

- Text fields, textareas, native selects, radio groups and checkboxes, matched by label, `aria-*`, `autocomplete`, placeholder and field name
- Greenhouse style react-select dropdowns (relocation, sponsorship, EEO questions)
- Ashby style Yes/No button pairs
- Resume upload: attaches your saved PDF to the resume field and skips cover letter fields
- Forms inside iframes, so Greenhouse boards embedded on company sites work too
- Screening questions: work authorization, sponsorship, non-compete, 18+, relocation, prior employment
- Voluntary self-ID: gender, race, Hispanic or Latino, veteran and disability status

Filled fields get a green outline. Required fields it could not answer get an orange outline and are listed in the popup. It never overwrites something you already typed.

## Install

1. Open `chrome://extensions` and turn on Developer mode
2. Click Load unpacked and pick this folder
3. Click the extension icon, then Edit profile, fill it in, attach your resume, Save

## Use

Open an application page and press `Alt+Shift+F`, or click the icon and hit Fill this page. Run it again after a multi-step form moves to the next page.

## Importing a profile

The options page imports and exports JSON shaped like this:

```json
{
  "profile": { "first_name": "Ada", "last_name": "Lovelace", "email": "ada@example.com", "authorized_us": true },
  "resume": { "name": "resume.pdf", "type": "application/pdf", "data": "<base64>" }
}
```

`tools/export_profile.py` builds that file from a `profile.yaml` in the lazy-apply format:

```
python tools/export_profile.py profile.yaml private/profile.json path/to/resume.pdf
```

`private/` is git ignored. Keep anything with real personal data in there.

## Privacy

Everything lives in `chrome.storage.local` on your machine. The extension makes no network requests. It asks for access to all sites because application forms are often embedded in an iframe from a different domain than the page you are on.

## Limits

- Workday's custom dropdowns are not handled yet. Its text fields work.
- Free text questions specific to a company are left blank on purpose.
- Dropdowns that load options from a server (school or location search) are filled by typing, which works less reliably.

## License

MIT
