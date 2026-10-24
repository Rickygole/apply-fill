import base64
import json
import sys
from pathlib import Path

import yaml


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: export_profile.py PROFILE_YAML OUT_JSON [RESUME_PDF]")
    src = yaml.safe_load(Path(sys.argv[1]).read_text())
    g = lambda section, key, default="": (src.get(section) or {}).get(key, default) or default

    salary = g("compensation", "salary_target_usd", None)
    links = {k: v for k, v in (src.get("links") or {}).items() if v and not str(v).startswith("TODO")}

    profile = {
        "first_name": g("identity", "first_name"),
        "last_name": g("identity", "last_name"),
        "full_name": g("identity", "full_name"),
        "email": g("identity", "email"),
        "phone": g("identity", "phone"),
        "address_line1": g("address", "line1"),
        "address_line2": g("address", "line2"),
        "city": g("address", "city"),
        "state": g("address", "state"),
        "postal_code": g("address", "postal_code"),
        "country": g("address", "country"),
        "linkedin": links.get("linkedin", ""),
        "github": links.get("github", ""),
        "website": links.get("website", ""),
        "scholar": links.get("google_scholar", ""),
        "authorized_us": bool(g("work_authorization", "authorized_us", False)),
        "requires_sponsorship": bool(g("work_authorization", "requires_sponsorship", False)),
        "sponsorship_explanation": g("work_authorization", "sponsorship_statement"),
        "authorization_explanation": g("work_authorization", "authorized_statement"),
        "start_date": g("availability", "earliest_start"),
        "notice_period": g("availability", "notice_period"),
        "gender": g("eeo", "gender"),
        "race": g("eeo", "race_ethnicity"),
        "hispanic_latino": bool(g("eeo", "hispanic_latino", False)),
        "veteran_status": g("eeo", "veteran_status"),
        "disability_status": g("eeo", "disability_status"),
        "salary": str(salary) if salary else g("compensation", "salary_statement"),
        "relocate": bool(g("preferences", "willing_to_relocate", False)),
        "why_interested": " ".join(g("screener_defaults", "why_interested").split()),
        "years_experience": str(g("screener_defaults", "years_experience_ml")),
        "degree": g("screener_defaults", "highest_degree"),
        "pronouns": g("screener_defaults", "pronouns"),
        "current_employer": g("screener_defaults", "current_employer"),
        "current_title": g("screener_defaults", "current_title"),
        "over_18": True,
        "restriction": False,
        "previously_employed": False,
        "interviewed_before": False,
        "onsite_ok": True,
        "accept_acknowledgements": True,
        "terminated": False,
        "relatives_at_company": False,
        "criminal_conviction": False,
    }

    out = {"profile": profile}
    if len(sys.argv) > 3:
        pdf = Path(sys.argv[3])
        out["resume"] = {
            "name": pdf.name,
            "type": "application/pdf",
            "data": base64.b64encode(pdf.read_bytes()).decode(),
        }
    Path(sys.argv[2]).write_text(json.dumps(out, indent=2))
    print(f"wrote {sys.argv[2]}")


if __name__ == "__main__":
    main()
