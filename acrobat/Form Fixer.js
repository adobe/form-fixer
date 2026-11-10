/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// Form Fixer for Acrobat, version 1.0.1
// Applies the form settings saved by the InDesign "Form Fixer" script:
// comb fields, character limits, default values, export values, custom dropdown entry, calculations, text alignment and color, field JavaScript, and dependent dropdowns.
//
// Install: copy this file into Acrobat's user JavaScripts folder and restart Acrobat.
// Run: All tools > Use JavaScript (or the Edit menu) > "Apply InDesign form settings".
// Without installing: paste this file into the JavaScript console (Cmd+J),
// run it, then run: FFX_apply(this);

var FFX_NS = "http://ns.adobe.com/formfixer/1.0/";
// Files exported before 1.0.0 used this namespace.
var FFX_LEGACY_NS = "http://ns.dsian.local/formfix/1.0/";

function FFX_unescapeXml(s) {
    return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"")
        .replace(/&apos;/g, "'").replace(/&#x([0-9a-fA-F]+);/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); })
        .replace(/&#([0-9]+);/g, function (m, d) { return String.fromCharCode(parseInt(d, 10)); })
        .replace(/&amp;/g, "&");
}

function FFX_readConfig(xmp) {
    if (!xmp) return null;
    return FFX_readConfigIn(xmp, FFX_NS) || FFX_readConfigIn(xmp, FFX_LEGACY_NS);
}

function FFX_readConfigIn(xmp, ns) {
    var nsRe = /xmlns:([\w.-]+)\s*=\s*["']([^"']+)["']/g, m, prefix = null;
    while ((m = nsRe.exec(xmp)) !== null) if (m[2] === ns) { prefix = m[1]; break; }
    if (!prefix) return null;
    var p = prefix.replace(/\./g, "\\.");
    var el = new RegExp("<" + p + ":config(?:\\s[^>]*)?>([\\s\\S]*?)</" + p + ":config>").exec(xmp);
    var at = el ? null : new RegExp(p + ":config\\s*=\\s*\"([^\"]*)\"").exec(xmp);
    var raw = el ? el[1] : (at ? at[1] : null);
    if (!raw) return null;
    try { return JSON.parse(FFX_unescapeXml(raw)); } catch (e) { return null; }
}

function FFX_q(s) { return JSON.stringify(String(s)); }

function FFX_dependencyCode(children) {
    var ph = children.placeholder || "";
    return [
        "// Form Fixer: dependent options",
        "if (event.rc !== false) {",
        "  var ffxMap = " + JSON.stringify(children.map) + ";",
        "  var ffxChild = this.getField(" + FFX_q(children.field) + ");",
        "  if (ffxChild) {",
        "    var ffxOpts = ffxMap[event.value] || [];",
        "    ffxChild.setItems(" + (ph ? "[" + FFX_q(ph) + "].concat(ffxOpts)" : "ffxOpts") + ");",
        "  }",
        "}"
    ].join("\n");
}

function FFX_apply(doc, quiet) {
    doc = doc || this;
    var alert = quiet ? function () { } : function (m, i) { app.alert(m, i); };
    var cfg = FFX_readConfig(doc.metadata);
    if (!cfg || !cfg.fields) {
        alert("This PDF has no Form Fixer settings. In InDesign, run Form Fixer, save your settings, and export the PDF again.", 3);
        return { applied: [], missing: [], errors: [] };
    }
    var applied = [], missing = [], errors = [];
    for (var name in cfg.fields) {
        if (!cfg.fields.hasOwnProperty(name)) continue;
        var s = cfg.fields[name], f = doc.getField(name);
        if (!f) { missing.push(name); continue; }
        try {
            if (f.type === "text") {
                if (s.limit > 0) {
                    f.charLimit = s.limit;
                    if (s.comb) {
                        f.multiline = false;
                        f.password = false;
                        f.doNotScroll = true;
                        f.doNotSpellCheck = true;
                        f.comb = true;
                    } else {
                        f.comb = false;
                    }
                } else {
                    f.comb = false;
                    f.charLimit = 0;
                }
                if (s.align) f.alignment = s.align;
                if (typeof s.defaultValue === "string" && s.defaultValue !== "") {
                    f.defaultValue = s.defaultValue;
                    if (f.value === "" || f.value === null) f.value = s.defaultValue;
                }
            }
            if (s.textColor && s.textColor.rgb && (f.type === "text" || f.type === "combobox" || f.type === "listbox" || f.type === "checkbox" || f.type === "radiobutton")) {
                var c = s.textColor.rgb;
                f.textColor = ["RGB", c[0] / 255, c[1] / 255, c[2] / 255];
            }
            if (f.type === "combobox") f.editable = s.editable === true;
            if (s.exportValues && (f.type === "combobox" || f.type === "listbox") && f.numItems > 0) {
                var pairs = [], keep = f.currentValueIndices;
                for (var k = 0; k < f.numItems; k++) {
                    var face = f.getItemAt(k, false);
                    pairs.push([face, s.exportValues.hasOwnProperty(face) ? s.exportValues[face] : face]);
                }
                f.setItems(pairs);
                try { f.currentValueIndices = keep; } catch (e2) { }
            }
            var actions = {};
            if (s.actions) for (var t in s.actions) if (s.actions.hasOwnProperty(t)) actions[t] = s.actions[t];
            if (s.children && s.children.field && (f.type === "combobox" || f.type === "listbox")) {
                actions.Validate = (actions.Validate ? actions.Validate + "\n" : "") + FFX_dependencyCode(s.children);
                f.commitOnSelChange = true;
                var child = doc.getField(s.children.field);
                if (!child) missing.push(s.children.field + " (controlled by " + name + ")");
                else {
                    var start = s.children.map[f.value] || [];
                    child.setItems(s.children.placeholder ? [s.children.placeholder].concat(start) : start);
                }
            }
            for (var a in actions) if (actions.hasOwnProperty(a)) f.setAction(a, actions[a]);
            applied.push(name);
        } catch (e) {
            errors.push(name + ": " + e);
        }
    }
    try { doc.calculateNow(); } catch (e) { }
    var msg = "Applied settings to " + applied.length + " field" + (applied.length === 1 ? "" : "s") + ".";
    if (missing.length) msg += "\n\nFields not found (renamed or deleted?):\n" + missing.join("\n");
    if (errors.length) msg += "\n\nProblems:\n" + errors.join("\n");
    msg += "\n\nSave the PDF to keep these changes.";
    alert(msg, errors.length || missing.length ? 2 : 3);
    return { applied: applied, missing: missing, errors: errors };
}

function FFX_run() {
    if (!event.target) { app.alert("Open a PDF first.", 3); return; }
    FFX_apply(event.target);
}

try {
    app.addToolButton({
        cName: "ffxApply",
        cLabel: "Apply InDesign form settings",
        cTooltext: "Apply comb, character limit, JavaScript, and dependent options saved by Form Fixer in InDesign",
        cExec: "FFX_run();",
        cEnable: "event.rc = (event.target != null);"
    });
} catch (e) { }

try {
    app.addMenuItem({
        cName: "ffxApplyMenu",
        cUser: "Apply InDesign form settings",
        cParent: "Edit",
        cExec: "FFX_run();",
        cEnable: "event.rc = (event.target != null);"
    });
} catch (e) { }
