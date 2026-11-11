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

// Acrobat has no focused appearance state, and it won't draw a border over button artwork.
// So each highlighted field gets a hidden ring (four thin strips) that shows while the field has focus.
// A field's own setting wins over the document setting; { off: true } turns it off.
var FFX_RING = "FFXFocus";

function FFX_focusFor(cfg, s) {
    if (s && s.focus) return s.focus.off ? null : s.focus;
    return cfg.focus || null;
}

function FFX_ringStrips(r, w, o) {
    var x1 = Math.min(r[0], r[2]), x2 = Math.max(r[0], r[2]), y1 = Math.min(r[1], r[3]), y2 = Math.max(r[1], r[3]);
    var ix1 = x1 - o, ix2 = x2 + o, iy1 = y1 - o, iy2 = y2 + o, ox1 = ix1 - w, ox2 = ix2 + w, oy1 = iy1 - w, oy2 = iy2 + w;
    return [[ox1, oy2, ox2, iy2], [ox1, iy1, ox2, oy1], [ox1, iy2, ix1, iy1], [ix2, iy2, ox2, iy1]];
}

function FFX_focusActions(doc, f, name, fs, n) {
    var ring = FFX_RING + "." + n, w = fs.width || 3, o = fs.offset || 0, rgb = fs.rgb;
    var pages = f.page instanceof Array ? f.page : [f.page];
    for (var i = 0; i < pages.length; i++) {
        var wid = pages.length > 1 ? doc.getField(name + "." + i) : f;
        var strips = FFX_ringStrips(wid.rect, w, o);
        for (var k = 0; k < strips.length; k++) {
            var g = doc.addField(ring, "button", pages[i], strips[k]);
            g = g || doc.getField(ring);
            g.fillColor = ["RGB", rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
            g.strokeColor = ["T"];
            g.lineWidth = 0;
            g.readonly = true;
            g.display = display.hidden;
        }
    }
    var get = "this.getField(" + FFX_q(ring) + ")";
    return { OnFocus: "// Form Fixer: focus highlight\n" + get + ".display = display.noPrint;",
        OnBlur: "// Form Fixer: focus highlight\n" + get + ".display = display.hidden;" };
}

function FFX_apply(doc, quiet) {
    doc = doc || this;
    var alert = quiet ? function () { } : function (m, i) { app.alert(m, i); };
    var cfg = FFX_readConfig(doc.metadata);
    if (!cfg || (!cfg.fields && !cfg.focus)) {
        alert("This PDF has no Form Fixer settings. In InDesign, run Form Fixer, save your settings, and export the PDF again.", 3);
        return { applied: [], missing: [], errors: [] };
    }
    var applied = [], missing = [], errors = [], rings = 0, others = [];
    try { if (doc.getField(FFX_RING)) doc.removeField(FFX_RING); } catch (e0) { }
    if (cfg.focus) for (var i = 0; i < doc.numFields; i++) {
        var fn = doc.getNthFieldName(i);
        if (fn.split(".")[0] !== FFX_RING && !(cfg.fields && cfg.fields.hasOwnProperty(fn))) others.push(fn);
    }
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
            var fs = FFX_focusFor(cfg, s);
            if (fs || (s.focus && s.focus.off)) {
                var fa = fs ? FFX_focusActions(doc, f, name, fs, rings++) : { OnFocus: "", OnBlur: "" };
                actions.OnFocus = [fa.OnFocus, actions.OnFocus || ""].join("\n").replace(/^\n+|\n+$/g, "");
                actions.OnBlur = [fa.OnBlur, actions.OnBlur || ""].join("\n").replace(/^\n+|\n+$/g, "");
            }
            for (var a in actions) if (actions.hasOwnProperty(a)) f.setAction(a, actions[a]);
            applied.push(name);
        } catch (e) {
            errors.push(name + ": " + e);
        }
    }
    var focused = 0;
    for (var j = 0; j < others.length; j++) {
        var g = doc.getField(others[j]);
        if (!g) continue;
        try {
            var ga = FFX_focusActions(doc, g, others[j], cfg.focus, rings++);
            g.setAction("OnFocus", ga.OnFocus);
            g.setAction("OnBlur", ga.OnBlur);
            focused++;
        } catch (e3) { errors.push(others[j] + ": " + e3); }
    }
    try { doc.calculateNow(); } catch (e) { }
    var msg = "Applied settings to " + applied.length + " field" + (applied.length === 1 ? "" : "s") + ".";
    if (focused) msg += "\nAdded the focus highlight to " + focused + " other field" + (focused === 1 ? "" : "s") + ".";
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
