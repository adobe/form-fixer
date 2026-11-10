# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under
# the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
# OF ANY KIND, either express or implied. See the License for the specific language
# governing permissions and limitations under the License.

# Builds the install and use guide illustrations. Run: python3 docs/images/make-illustrations.py (needs Google Chrome).
import os, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CSS = """
*{box-sizing:border-box}body{margin:0;font:15px/1.4 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1d1d1d;background:#f4f5f7}
.stage{width:WIDTHpx;height:HEIGHTpx;padding:28px;display:flex;gap:28px;align-items:center;justify-content:center}
.win{background:#fff;border:1px solid #8a8a8a;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.12);overflow:hidden}
.bar{background:#e6e6e6;border-bottom:1px solid #b3b3b3;padding:8px 12px;font-weight:600;display:flex;gap:8px;align-items:center}
.dots span{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;background:#8a8a8a}
.winbtns{margin-left:auto;letter-spacing:14px;color:#4b4b4b}
.row{padding:7px 14px;display:flex;gap:8px;align-items:center}
.sel{background:#0d66d0;color:#fff}
.menu{background:#fff;border:1px solid #8a8a8a;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,.18);padding:6px 0;min-width:250px}
.menu .row{padding:6px 16px}.sep{border-top:1px solid #c8c8c8;margin:5px 0}
.muted{color:#4b4b4b}.icon{width:18px;text-align:center}
.file{display:inline-flex;align-items:center;gap:8px;border:2px solid #0d66d0;border-radius:8px;padding:8px 12px;background:#fff;font-weight:600}
.arrow{font-size:40px;color:#0d66d0;font-weight:700}
.field{border:1px solid #6e6e6e;border-radius:6px;padding:8px 10px;font-family:Menlo,Consolas,monospace;font-size:14px;background:#fff}
.btn{border:1px solid #6e6e6e;border-radius:6px;padding:5px 14px;background:#fff}.btn.primary{background:#0d66d0;color:#fff;border-color:#0d66d0}
.card{background:#fff;border:1px solid #8a8a8a;border-radius:12px;padding:18px;width:230px;height:190px}
.num{display:inline-block;width:30px;height:30px;border-radius:50%;background:#0d66d0;color:#fff;text-align:center;line-height:30px;font-weight:700;margin-bottom:8px}
h3{margin:0 0 6px;font-size:17px}p{margin:0}
.idf{background:#2e2e2e;border:1px solid #1e1e1e;border-radius:4px;padding:5px 8px;color:#f2f2f2}.idb{border:1px solid #f2f2f2;border-radius:14px;padding:4px 16px}
.hl{outline:3px solid #6cb4ff;outline-offset:1px}.hlb{outline:3px solid #0d66d0;outline-offset:3px;border-radius:4px}
.co{display:inline-block;width:24px;height:24px;border-radius:50%;background:#0d66d0;color:#fff;text-align:center;line-height:24px;font-weight:700;font-size:13px;flex:none}
"""
FOLDER = "&#128193;"; DOC = "&#128196;"

def page(w, h, body):
    return f"<!doctype html><html lang='en'><head><meta charset='utf-8'><style>{CSS.replace('WIDTH',str(w)).replace('HEIGHT',str(h))}</style></head><body><div class='stage'>{body}</div></body></html>"

def scripts_panel(menu_label):
    return f"""
<div style='position:relative;width:640px;height:300px'>
 <div class='win' style='position:absolute;left:0;top:0;width:300px'>
  <div class='bar'>Scripts</div>
  <div class='row muted'>&#9656; {FOLDER} Application</div>
  <div class='row sel'>&#9662; {FOLDER} User</div>
  <div style='height:150px'></div>
 </div>
 <div class='menu' style='position:absolute;left:190px;top:84px'>
  <div class='row muted'>New Folder</div><div class='sep'></div>
  <div class='row sel'>{menu_label}</div>
 </div>
 <div style='position:absolute;left:460px;top:96px;width:180px;font-size:14px'>Right-click <b>User</b>, then choose <b>{menu_label}</b>.</div>
</div>"""

def copy_into(title, chrome, path_html, fname):
    bar = f"<div class='bar'><span class='dots'><span></span><span></span><span></span></span>{title}</div>" if chrome == "mac" else f"<div class='bar'>{title}<span class='winbtns'>&#8212;&#9744;&#10005;</span></div>"
    return f"""
<div class='file'>{DOC} {fname}</div>
<div class='arrow' aria-hidden='true'>&#10140;</div>
<div class='win' style='width:430px'>
 {bar}
 <div class='row' style='background:#f0f0f0;border-bottom:1px solid #c8c8c8;font-size:13px'>{path_html}</div>
 <div class='row'>{DOC} {fname}</div>
 <div style='height:120px'></div>
</div>"""

FIGS = {
 "overview": (900, 300, f"""
<div class='card'><span class='num'>1</span><h3>InDesign</h3><p>Open <b>Form Fixer</b> from the Scripts panel. Select a field, choose settings, then select <b>Save</b>.</p></div>
<div class='arrow' aria-hidden='true'>&#10140;</div>
<div class='card'><span class='num'>2</span><h3>Export</h3><p>Choose <b>File &gt; Export</b> and pick <b>Adobe PDF (Interactive)</b>. The settings travel inside the PDF.</p></div>
<div class='arrow' aria-hidden='true'>&#10140;</div>
<div class='card'><span class='num'>3</span><h3>Acrobat</h3><p>Choose <b>Edit &gt; Apply InDesign form settings</b>, then save the PDF.</p></div>"""),
 "indesign-reveal-mac": (720, 360, scripts_panel("Reveal in Finder")),
 "indesign-reveal-win": (720, 360, scripts_panel("Reveal in Explorer")),
 "indesign-copy-mac": (760, 320, copy_into("Scripts Panel", "mac", "&#8230; &#8250; Version 21.0 &#8250; en_US &#8250; Scripts &#8250; <b>Scripts Panel</b>", "Form Fixer.jsx")),
 "indesign-copy-win": (760, 320, copy_into("Scripts Panel", "win", "&#8230; &#8250; Version 21.0 &#8250; en_US &#8250; Scripts &#8250; <b>Scripts Panel</b>", "Form Fixer.jsx")),
 "acrobat-goto-mac": (760, 330, """
<div class='win' style='width:620px'>
 <div class='bar'><span class='dots'><span></span><span></span><span></span></span>Go to Folder</div>
 <div style='padding:20px'>
  <div class='field'>~/Library/Application Support/Adobe/Acrobat/DC/JavaScripts</div>
  <p class='muted' style='margin-top:10px;font-size:14px'>In Finder, choose Go &gt; Go to Folder, or press Shift-Command-G.</p>
  <div style='display:flex;justify-content:flex-end;gap:10px;margin-top:18px'><span class='btn'>Cancel</span><span class='btn primary'>Go</span></div>
 </div>
</div>"""),
 "acrobat-folder-win": (760, 300, """
<div class='win' style='width:660px'>
 <div class='bar'>File Explorer<span class='winbtns'>&#8212;&#9744;&#10005;</span></div>
 <div style='padding:16px'>
  <div style='font-size:13px' class='muted'>Address bar</div>
  <div class='field' style='border:2px solid #0d66d0'>%APPDATA%\\Adobe\\Acrobat\\DC\\JavaScripts</div>
  <p class='muted' style='margin-top:10px;font-size:14px'>Select the address bar, paste the path, then press Enter.</p>
 </div>
</div>"""),
 "acrobat-copy-mac": (760, 320, copy_into("JavaScripts", "mac", "&#8230; &#8250; Adobe &#8250; Acrobat &#8250; DC &#8250; <b>JavaScripts</b>", "Form Fixer.js")),
 "acrobat-copy-win": (760, 320, copy_into("JavaScripts", "win", "&#8230; &#8250; Adobe &#8250; Acrobat &#8250; DC &#8250; <b>JavaScripts</b>", "Form Fixer.js")),
 "acrobat-menu-mac": (720, 360, """
<div style='width:600px;height:300px;position:relative'>
 <div class='win' style='border-radius:6px;position:absolute;left:0;top:0;width:600px'>
  <div class='row' style='gap:22px;background:#ececec'><b>Acrobat</b><span>File</span><span class='sel' style='padding:2px 8px;border-radius:4px'>Edit</span><span>View</span><span>Window</span><span>Help</span></div>
 </div>
 <div class='menu' style='position:absolute;left:150px;top:40px;width:310px'>
  <div class='row muted'>Undo</div><div class='row muted'>Redo</div><div class='sep'></div>
  <div class='row muted'>Cut</div><div class='row muted'>Copy</div><div class='row muted'>Paste</div><div class='sep'></div>
  <div class='row sel'>Apply InDesign form settings</div>
 </div>
</div>"""),
 "acrobat-menu-win": (760, 360, """
<div style='width:660px;height:300px;position:relative'>
 <div class='win' style='border-radius:6px;position:absolute;left:0;top:0;width:660px'>
  <div class='row' style='background:#ececec'><span class='sel' style='padding:2px 10px;border-radius:4px'>&#9776; Menu</span><span class='muted'>Adobe Acrobat</span></div>
 </div>
 <div class='menu' style='position:absolute;left:0;top:44px;width:190px'>
  <div class='row'>File</div><div class='row sel'>Edit &#9656;</div><div class='row'>View</div><div class='row'>Window</div><div class='row'>Help</div>
 </div>
 <div class='menu' style='position:absolute;left:196px;top:84px;width:310px'>
  <div class='row muted'>Undo</div><div class='row muted'>Redo</div><div class='sep'></div>
  <div class='row muted'>Cut</div><div class='row muted'>Copy</div><div class='sep'></div>
  <div class='row sel'>Apply InDesign form settings</div>
 </div>
</div>"""),
 "use-buttons-forms": (720, 420, """
<div class='win' style='width:380px;background:#535353;color:#f2f2f2;border-color:#2b2b2b'>
 <div class='bar' style='background:#3c3c3c;color:#f2f2f2;border-color:#2b2b2b'>Buttons and Forms</div>
 <div style='padding:14px;display:grid;grid-template-columns:96px 1fr;gap:10px 10px;align-items:center'>
  <span>Type:</span><span class='idf'>Text Field</span>
  <span>Name:</span><span class='idf hl'>Phone number</span>
  <span>Event:</span><span class='idf'>On Release or Tap</span>
 </div>
 <div style='padding:4px 14px 6px;font-weight:600'>PDF Options</div>
 <div style='padding:0 14px 16px;display:grid;grid-template-columns:96px 1fr;gap:10px;align-items:center'>
  <span>Description:</span><span class='idf hl'>Phone number, 10 digits</span>
  <span></span><span>&#9744; Read Only &nbsp; &#9745; Required</span>
 </div>
</div>
<div style='width:220px;font-size:14px'><b>Name</b> finds the field.<br><br><b>Description</b> becomes the tooltip, which screen readers read as the field's name.</div>"""),
 "use-panel": (900, 520, """
<div class='win' style='width:620px;background:#535353;color:#f2f2f2;border-color:#2b2b2b'>
 <div class='bar' style='background:#3c3c3c;color:#f2f2f2;border-color:#2b2b2b;justify-content:center'>Form Fixer</div>
 <div class='row' style='padding-top:14px'><span class='co'>1</span>Field:<span class='idf' style='width:330px'>&#8226; Phone number (text field)</span></div>
 <div class='row'><span class='co'>2</span>Section:<span>&#9675; Characters &nbsp;&#9675; Text &nbsp;<span style='color:#d4d4d4;font-style:italic'>&#9675; Choices</span> &nbsp;&#9673; <b>Format</b> &nbsp;&#9675; Validate &nbsp;&#9675; &hellip;</span></div>
 <div style='margin:8px 14px;border:1px solid #6e6e6e;border-radius:6px;padding:10px 12px;height:150px'>
  <div style='margin-bottom:10px'>Format</div>
  <div style='display:flex;gap:8px;align-items:center'><span class='co'>3</span>Format:<span class='idf' style='width:240px'>Phone number</span></div>
  <div style='margin-top:10px'>Sets how the value displays and what people can type.</div>
 </div>
 <div class='row' style='padding:10px 14px'><span class='idb'>Clear this field</span><span style='margin-left:auto' class='idb'>Close</span><span class='co'>4</span><span class='idb'>Save</span></div>
 <div class='row' style='padding-bottom:12px'>Select a form field on the page to edit it here.</div>
</div>
<div style='width:200px;font-size:14px;line-height:1.7'><span class='co'>1</span> Pick a field<br><span class='co'>2</span> Pick a section<br><span class='co'>3</span> Choose settings<br><span class='co'>4</span> Select <b>Save</b></div>"""),
 "use-export": (760, 460, """
<div class='win' style='width:600px'>
 <div class='bar'><span class='dots'><span></span><span></span><span></span></span>Export to Interactive PDF</div>
 <div style='padding:16px 20px;display:grid;gap:10px'>
  <div><b>General</b> &nbsp;<span class='muted'>Compression &nbsp;Advanced</span></div>
  <div>Pages: &#9673; All</div>
  <div>Forms and Media: &nbsp;<span class='hlb'>&#9673; Include All</span> &nbsp;&#9675; Appearance Only</div>
  <div class='hlb' style='width:max-content'>&#9745; Create Tagged PDF</div>
  <div class='hlb' style='width:max-content'>&#9745; Use Structure for Tab Order</div>
  <div style='display:flex;justify-content:flex-end;gap:10px;margin-top:8px'><span class='btn'>Cancel</span><span class='btn primary'>Export</span></div>
 </div>
</div>"""),
 "use-acrobat": (640, 300, """
<div class='win' style='width:440px'>
 <div class='bar'><span class='dots'><span></span><span></span><span></span></span>Adobe Acrobat</div>
 <div style='padding:22px 20px;display:flex;gap:14px;align-items:flex-start'>
  <span style='font-size:30px;line-height:1;color:#0d66d0' aria-hidden='true'>&#9432;</span>
  <p>Applied settings to 6 fields.</p>
 </div>
 <div style='display:flex;justify-content:flex-end;padding:0 20px 18px'><span class='btn primary'>OK</span></div>
</div>"""),
}

tmp = tempfile.mkdtemp()
for name, (w, h, body) in FIGS.items():
    src = os.path.join(tmp, name + ".html")
    open(src, "w").write(page(w, h, body))
    subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", "--force-device-scale-factor=2",
                    f"--window-size={w},{h}", f"--screenshot={os.path.join(HERE, name + '.png')}", "file://" + src],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(name)
