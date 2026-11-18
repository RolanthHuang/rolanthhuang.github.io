"""Export read-only Google Docs PDFs into the staged GitHub Pages site."""

import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def export_pdf(language, access_token):
    document_id = os.environ.get(f"CV_DOC_ID_{language}", "")
    if not re.fullmatch(r"[A-Za-z0-9_-]+", document_id):
        raise SystemExit(f"{language} CV document ID is missing or invalid.")

    endpoint = (
        f"https://www.googleapis.com/drive/v3/files/{document_id}/export"
        "?mimeType=application%2Fpdf"
    )
    request = Request(endpoint, headers={"Authorization": f"Bearer {access_token}"})
    try:
        with urlopen(request, timeout=30) as response:
            if response.headers.get_content_type() != "application/pdf":
                raise SystemExit(f"{language} CV export did not return a PDF.")
            pdf = response.read()
    except HTTPError as error:
        raise SystemExit(f"{language} CV export failed (Drive HTTP {error.code}).") from None
    except (URLError, TimeoutError):
        raise SystemExit(f"{language} CV export could not reach Google Drive.") from None

    if not pdf.startswith(b"%PDF-") or not pdf.rstrip().endswith(b"%%EOF"):
        raise SystemExit(f"{language} CV export returned an incomplete or invalid PDF.")
    return pdf


def main():
    destination = Path(sys.argv[1])
    access_token = os.environ.get("DRIVE_ACCESS_TOKEN")
    if not access_token:
        raise SystemExit("Google Drive access token is missing.")

    exports = {language: export_pdf(language, access_token) for language in ("ZH", "EN")}
    for language, pdf in exports.items():
        (destination / f"Yi-Hsuan_Huang_CV_{language}.pdf").write_bytes(pdf)
    print("Validated and staged both CV PDFs.")


if __name__ == "__main__":
    main()
