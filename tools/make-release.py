# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under
# the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
# OF ANY KIND, either express or implied. See the License for the specific language
# governing permissions and limitations under the License.

# Builds dist/Form-Fixer.zip for a GitHub release. Run: python3 tools/make-release.py (needs the gh command).
import base64, html, json, os, re, shutil, subprocess, zipfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
body{font:16px/1.6 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#1d1d1d;max-width:820px;margin:0 auto;padding:24px}
img{max-width:100%;height:auto;border:1px solid #8a8a8a;border-radius:8px}
code{background:#f0f0f0;padding:2px 5px;border-radius:4px;font-size:15px}
h1,h2,h3{line-height:1.25}a{color:#0d66d0}table{border-collapse:collapse}th,td{border:1px solid #8a8a8a;padding:6px 10px;text-align:left;vertical-align:top}a:focus-visible{outline:3px solid #0d66d0;outline-offset:2px}
</style></head><body><main>
"""

PAGES = {"INSTALL.md": "Install Form Fixer.html", "USE.md": "Use Form Fixer.html", "KEYBOARD.md": "Keyboard and screen reader guide.html", "samples/Form%20Fixer%20demo.pdf": "Form Fixer demo.pdf"}

def render(md_name, title):
    md = open(os.path.join(ROOT, md_name), encoding="utf-8").read()
    body = subprocess.run(["gh", "api", "markdown", "--input", "-"], input=json.dumps({"text": md, "mode": "markdown"}),
                          capture_output=True, text=True, check=True).stdout
    body = re.sub(r'src="(docs/images/[^"]+\.png)"', embed, body)
    for md, page in PAGES.items():
        body = body.replace('href="' + md + '"', 'href="' + html.escape(page) + '"')
    body = re.sub(r'<a [^>]*class="anchor"[^>]*>.*?</a>', "", body)
    body = re.sub(r'<a [^>]*href="docs/images/[^"]+"[^>]*>(<img [^>]*>)</a>', r"\1", body)
    return PAGE.replace("{title}", title) + body + "\n</main></body></html>\n"

def embed(m):
    path = os.path.join(ROOT, html.unescape(m.group(1)))
    data = base64.b64encode(open(path, "rb").read()).decode()
    return 'src="data:image/png;base64,' + data + '"'

shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(DIST)
files = {
    "Form Fixer/Form Fixer.jsx": os.path.join(ROOT, "indesign", "Form Fixer.jsx"),
    "Form Fixer/Form Fixer.js": os.path.join(ROOT, "acrobat", "Form Fixer.js"),
    "Form Fixer/Form Fixer demo.pdf": os.path.join(ROOT, "samples", "Form Fixer demo.pdf"),
    "Form Fixer/Form Fixer sample.pdf": os.path.join(ROOT, "samples", "Form Fixer sample.pdf"),
    "Form Fixer/LICENSE.txt": os.path.join(ROOT, "LICENSE"),
}
out = os.path.join(DIST, "Form-Fixer.zip")
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for name, src in files.items():
        z.write(src, name)
    z.writestr("Form Fixer/Install Form Fixer.html", render("INSTALL.md", "Install Form Fixer"))
    z.writestr("Form Fixer/Use Form Fixer.html", render("USE.md", "Use Form Fixer"))
    z.writestr("Form Fixer/Keyboard and screen reader guide.html", render("KEYBOARD.md", "Form Fixer keyboard and screen reader guide"))
print(out)
