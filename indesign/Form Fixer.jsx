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

// Form Fixer for InDesign, version 1.0.1
// Adds PDF form settings InDesign can't create on its own: comb fields,
// character limits, text alignment and color, and field JavaScript.
// Settings are stored in the document and exported into the PDF's metadata.
// Run "Form Fixer.js" in Acrobat afterward to apply them.

#targetengine "formfixer"

var FFX = $.global.FFX || {};
$.global.FFX = FFX;

FFX.NS = "http://ns.adobe.com/formfixer/1.0/";
// Files saved before 1.0.0 used this namespace. Sync clears it.
FFX.LEGACY_NS = "http://ns.dsian.local/formfix/1.0/";
FFX.VERSION = "1.0.1";
FFX.PREFIX = "ffx";
FFX.PROP = "ffx:config";
FFX.LABEL = "ffx";

FFX.TYPES = {
    TextBox: "text field",
    ComboBox: "dropdown",
    ListBox: "list box",
    CheckBox: "checkbox",
    RadioButton: "radio button",
    SignatureField: "signature",
    Button: "button"
};

FFX.TRIGGERS = [
    { id: "Keystroke", label: "Keystroke (while typing)", types: ["TextBox", "ComboBox"] },
    { id: "Format", label: "Format (how the value displays)", types: ["TextBox", "ComboBox"] },
    { id: "Validate", label: "Validate (when the value is committed)", types: ["TextBox", "ComboBox", "ListBox"] },
    { id: "Calculate", label: "Calculate", types: ["TextBox", "ComboBox", "ListBox"] },
    { id: "MouseUp", label: "Mouse up (click or select)", types: null },
    { id: "OnFocus", label: "On focus", types: null },
    { id: "OnBlur", label: "On blur", types: null },
    { id: "MouseEnter", label: "Mouse enter", types: null },
    { id: "MouseExit", label: "Mouse exit", types: null }
];

// Format presets. Each sets Acrobat's Keystroke and Format actions the same way Acrobat's Format tab does.
FFX.FORMATS = [
    { label: "Digits only", types: ["TextBox"], actions: { Keystroke: "if (!event.willCommit) event.rc = /^\\d*$/.test(event.change);" } },
    { label: "Letters only", types: ["TextBox"], actions: { Keystroke: "if (!event.willCommit) event.rc = /^[A-Za-z \\-']*$/.test(event.change);" } },
    { label: "Uppercase", types: ["TextBox"], actions: { Keystroke: "event.change = event.change.toUpperCase();" } },
    { label: "Zip code (5 digits)", types: ["TextBox"], actions: { Keystroke: "AFSpecial_Keystroke(0);", Format: "AFSpecial_Format(0);" } },
    { label: "Zip code + 4 (12345-6789)", types: ["TextBox"], actions: { Keystroke: "AFSpecial_Keystroke(1);", Format: "AFSpecial_Format(1);" } },
    { label: "Phone number", types: ["TextBox"], actions: { Keystroke: "AFSpecial_Keystroke(2);", Format: "AFSpecial_Format(2);" } },
    { label: "Social Security number", types: ["TextBox"], actions: { Keystroke: "AFSpecial_Keystroke(3);", Format: "AFSpecial_Format(3);" } },
    { label: "Date mm/dd/yyyy", types: ["TextBox"], actions: { Keystroke: "AFDate_KeystrokeEx(\"mm/dd/yyyy\");", Format: "AFDate_FormatEx(\"mm/dd/yyyy\");" } },
    { label: "Whole number (1,234)", types: ["TextBox"], actions: { Keystroke: "AFNumber_Keystroke(0, 0, 0, 0, \"\", true);", Format: "AFNumber_Format(0, 0, 0, 0, \"\", true);" } },
    { label: "Number, 2 decimals (1,234.56)", types: ["TextBox"], actions: { Keystroke: "AFNumber_Keystroke(2, 0, 0, 0, \"\", true);", Format: "AFNumber_Format(2, 0, 0, 0, \"\", true);" } },
    { label: "Dollars ($1,234.56)", types: ["TextBox"], actions: { Keystroke: "AFNumber_Keystroke(2, 0, 0, 0, \"$\", true);", Format: "AFNumber_Format(2, 0, 0, 0, \"$\", true);" } },
    { label: "Percentage (12.5%)", types: ["TextBox"], actions: { Keystroke: "AFPercent_Keystroke(1, 0);", Format: "AFPercent_Format(1, 0);" } },
    { label: "Time, 12-hour (1:30 pm)", types: ["TextBox"], actions: { Keystroke: "AFTime_Keystroke(1);", Format: "AFTime_Format(1);" } },
    { label: "Time, 24-hour (13:30)", types: ["TextBox"], actions: { Keystroke: "AFTime_Keystroke(0);", Format: "AFTime_Format(0);" } }
];

FFX.SNIPPETS = [
    { label: "Email check", types: ["TextBox"], actions: { Validate: "if (event.value && !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(event.value)) {\n  app.alert(\"Enter an email address like name@example.com.\");\n  event.rc = false;\n}" } }
];

// ---------- helpers (ExtendScript is ES3: no JSON, no Array.indexOf) ----------

FFX.inArray = function (arr, v) {
    if (!arr) return false;
    for (var i = 0; i < arr.length; i++) if (arr[i] === v) return true;
    return false;
};

FFX.trim = function (s) { return String(s).replace(/^\s+|\s+$/g, ""); };

FFX.stringify = function (v) {
    if (v === null || v === undefined) return "null";
    var t = typeof v;
    if (t === "number") return isFinite(v) ? String(v) : "null";
    if (t === "boolean") return v ? "true" : "false";
    if (t === "string") {
        return "\"" + v.replace(/[\\"\u0000-\u001f\u2028\u2029]/g, function (c) {
            var m = { "\\": "\\\\", "\"": "\\\"", "\n": "\\n", "\r": "\\r", "\t": "\\t" };
            if (m[c]) return m[c];
            var h = c.charCodeAt(0).toString(16);
            return "\\u" + "0000".substr(h.length) + h;
        }) + "\"";
    }
    if (v instanceof Array) {
        var a = [];
        for (var i = 0; i < v.length; i++) a.push(FFX.stringify(v[i]));
        return "[" + a.join(",") + "]";
    }
    var parts = [];
    for (var k in v) {
        if (v.hasOwnProperty(k) && v[k] !== undefined && typeof v[k] !== "function") {
            parts.push(FFX.stringify(k) + ":" + FFX.stringify(v[k]));
        }
    }
    return "{" + parts.join(",") + "}";
};

FFX.parse = function (s) {
    if (!s) return null;
    try { return eval("(" + s + ")"); } catch (e) { return null; }
};

FFX.isEmpty = function (o) {
    if (!o) return true;
    for (var k in o) if (o.hasOwnProperty(k)) return false;
    return true;
};

FFX.clean = function (s) {
    // Drop empty parts so the stored settings stay small.
    if (!s) return null;
    var out = {};
    if (s.limit && s.limit > 0) {
        out.limit = s.limit;
        if (s.comb) out.comb = true;
    }
    if (s.align === "center" || s.align === "right") out.align = s.align;
    if (s.editable === true) out.editable = true;
    if (typeof s.defaultValue === "string" && s.defaultValue !== "") out.defaultValue = s.defaultValue;
    if (s.textColor && s.textColor.rgb && s.textColor.rgb.length === 3) out.textColor = { name: s.textColor.name, rgb: s.textColor.rgb };
    if (s.actions) {
        var acts = {};
        for (var k in s.actions) if (s.actions.hasOwnProperty(k) && FFX.trim(s.actions[k]) !== "") acts[k] = s.actions[k];
        if (!FFX.isEmpty(acts)) out.actions = acts;
    }
    if (s.children && s.children.field && !FFX.isEmpty(s.children.map)) out.children = s.children;
    if (s.exportValues) {
        var ev = {};
        for (var x in s.exportValues) if (s.exportValues.hasOwnProperty(x) && typeof s.exportValues[x] === "string" && s.exportValues[x] !== "") ev[x] = s.exportValues[x];
        if (!FFX.isEmpty(ev)) out.exportValues = ev;
    }
    return FFX.isEmpty(out) ? null : out;
};

// ---------- document access ----------

FFX.fieldsOf = function (doc) {
    var all = doc.allPageItems, out = [];
    for (var i = 0; i < all.length; i++) {
        var it = all[i];
        if (FFX.TYPES[it.constructor.name]) out.push(it);
    }
    return out;
};

FFX.readItem = function (item) {
    var s = FFX.parse(item.extractLabel(FFX.LABEL));
    return s || {};
};

FFX.writeItem = function (item, settings) {
    var c = FFX.clean(settings);
    item.insertLabel(FFX.LABEL, c ? FFX.stringify(c) : "");
};

FFX.registerNamespace = function () {
    if (ExternalObject.AdobeXMPScript === undefined) {
        ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
    }
    XMPMeta.registerNamespace(FFX.NS, FFX.PREFIX);
    // If another version already claimed the prefix this session, XMP assigns a different one.
    FFX.PROP = XMPMeta.getNamespacePrefix(FFX.NS).replace(/:?$/, ":") + "config";
    XMPMeta.registerNamespace(FFX.LEGACY_NS, "ffxold");
    FFX.LEGACY_PROP = XMPMeta.getNamespacePrefix(FFX.LEGACY_NS).replace(/:?$/, ":") + "config";
};

// Rebuilds the document metadata from the settings stored on each field,
// using the field's current name (so renaming a field is safe).
FFX.sync = function (doc) {
    FFX.registerNamespace();
    var fields = FFX.fieldsOf(doc), cfg = { version: 1, fields: {} }, n = 0;
    for (var i = 0; i < fields.length; i++) {
        var s = FFX.clean(FFX.readItem(fields[i]));
        var name = fields[i].name;
        if (s && !cfg.fields[name]) { cfg.fields[name] = s; n++; }
    }
    var value = n ? FFX.stringify(cfg) : "";
    if (doc.metadataPreferences.getProperty(FFX.NS, FFX.PROP) !== value) {
        doc.metadataPreferences.setProperty(FFX.NS, FFX.PROP, value);
    }
    if (doc.metadataPreferences.getProperty(FFX.LEGACY_NS, FFX.LEGACY_PROP) !== "") {
        doc.metadataPreferences.setProperty(FFX.LEGACY_NS, FFX.LEGACY_PROP, "");
    }
    return n;
};

// Earlier versions synced on every export, which can crash InDesign during
// PDF export. Remove any leftover listener from this engine.
FFX.removeExportHook = function () {
    try {
        var ls = app.eventListeners;
        for (var i = ls.length - 1; i >= 0; i--) if (ls[i].eventType === "beforeExport") ls[i].remove();
    } catch (e) { }
    FFX.hookInstalled = false;
};

// ---------- dialog ----------

FFX.triggersFor = function (type) {
    var out = [];
    for (var i = 0; i < FFX.TRIGGERS.length; i++) {
        var t = FFX.TRIGGERS[i];
        if (!t.types || FFX.inArray(t.types, type)) out.push(t);
    }
    return out;
};

FFX.snippetsFor = function (type) {
    var out = [];
    for (var i = 0; i < FFX.SNIPPETS.length; i++) if (FFX.inArray(FFX.SNIPPETS[i].types, type)) out.push(FFX.SNIPPETS[i]);
    return out;
};

// 0 = no format, n = FFX.FORMATS[n - 1], -1 = custom code.
FFX.formatIndex = function (actions) {
    var k = FFX.trim((actions && actions.Keystroke) || ""), f = FFX.trim((actions && actions.Format) || "");
    if (!k && !f) return 0;
    for (var i = 0; i < FFX.FORMATS.length; i++) {
        var a = FFX.FORMATS[i].actions;
        if (k === (a.Keystroke || "") && f === (a.Format || "")) return i + 1;
    }
    return -1;
};

// Acrobat's "Value is the ___ of the following fields" options.
FFX.CALCS = [
    { op: "SUM", label: "Sum (+)" },
    { op: "PRD", label: "Product (x)" },
    { op: "AVG", label: "Average" },
    { op: "MIN", label: "Minimum" },
    { op: "MAX", label: "Maximum" }
];

FFX.calcCode = function (op, fields) {
    var q = [];
    for (var i = 0; i < fields.length; i++) q.push('"' + String(fields[i]).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"');
    return "AFSimple_Calculate(\"" + op + "\", new Array (" + q.join(", ") + "));";
};

// null = no calculation, { op, fields } = simple calculation, { custom: true } = other code.
FFX.parseCalc = function (code) {
    code = FFX.trim(code || "");
    if (!code) return null;
    var m = code.match(/^AFSimple_Calculate\("(SUM|PRD|AVG|MIN|MAX)",\s*new Array\s*\(([\s\S]*)\)\);?$/);
    if (!m) return { custom: true };
    var fields = [], re = /"((?:[^"\\]|\\.)*)"/g, r;
    while ((r = re.exec(m[2]))) fields.push(r[1].replace(/\\(.)/g, "$1"));
    return { op: m[1], fields: fields };
};

// Acrobat's "Field value is in range" check. from and to are numbers or null.
FFX.rangeCode = function (from, to) {
    return "AFRange_Validate(" + (from !== null) + ", " + (from !== null ? from : 0) + ", " + (to !== null) + ", " + (to !== null ? to : 0) + ");";
};

// null = no check, { from, to } = range check, { custom: true } = other code.
FFX.parseRange = function (code) {
    code = FFX.trim(code || "");
    if (!code) return null;
    var m = code.match(/^AFRange_Validate\((true|false),\s*(-?[\d.]*),\s*(true|false),\s*(-?[\d.]*)\);?$/);
    if (!m) return { custom: true };
    return { from: m[1] === "true" ? parseFloat(m[2]) : null, to: m[3] === "true" ? parseFloat(m[4]) : null };
};

FFX.mapToText = function (map, parentChoices) {
    var lines = [], seen = {};
    map = map || {};
    for (var i = 0; i < parentChoices.length; i++) {
        var c = parentChoices[i];
        seen[c] = true;
        lines.push(c + " = " + (map[c] ? map[c].join("; ") : ""));
    }
    for (var k in map) if (map.hasOwnProperty(k) && !seen[k]) lines.push(k + " = " + map[k].join("; "));
    return lines.join("\n");
};

FFX.textToMap = function (text) {
    var map = {}, lines = String(text).split(/\r\n|\r|\n/);
    for (var i = 0; i < lines.length; i++) {
        var p = lines[i].indexOf("=");
        if (p < 0) continue;
        var key = FFX.trim(lines[i].substr(0, p));
        var opts = lines[i].substr(p + 1).split(";"), list = [];
        for (var j = 0; j < opts.length; j++) { var o = FFX.trim(opts[j]); if (o) list.push(o); }
        if (key && list.length) map[key] = list;
    }
    return map;
};

// ---------- color ----------

// Returns [r, g, b] (0-255) for a swatch, or null when it isn't a solid color.
FFX.swatchRGB = function (sw) {
    try {
        if (!sw || !sw.isValid) return null;
        var kind = sw.constructor.name;
        if (sw.name === "Paper") return [255, 255, 255];
        if (sw.name === "Black") return [0, 0, 0];
        if (kind === "Tint") {
            var base = FFX.swatchRGB(sw.baseColor), t = sw.tintValue / 100;
            return base ? FFX.mixWhite(base, t) : null;
        }
        if (kind !== "Color" || sw.name === "Registration") return null;
        var v = sw.colorValue;
        if (sw.space === ColorSpace.RGB) return [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])];
        if (sw.space === ColorSpace.CMYK) {
            var k = 1 - v[3] / 100;
            return [Math.round(255 * (1 - v[0] / 100) * k), Math.round(255 * (1 - v[1] / 100) * k), Math.round(255 * (1 - v[2] / 100) * k)];
        }
    } catch (e) { }
    return null;
};

FFX.mixWhite = function (rgb, amount) {
    return [Math.round(255 - (255 - rgb[0]) * amount), Math.round(255 - (255 - rgb[1]) * amount), Math.round(255 - (255 - rgb[2]) * amount)];
};

FFX.textColorChoices = function (doc) {
    var out = [{ name: "Black (default)", rgb: null }], sw = doc.swatches.everyItem().getElements();
    for (var i = 0; i < sw.length; i++) {
        if (sw[i].name === "Black") continue;
        var rgb = FFX.swatchRGB(sw[i]);
        if (rgb) out.push({ name: sw[i].name, rgb: rgb });
    }
    return out;
};

// Background behind the field text: its fill, or white when it has none.
FFX.fillRGB = function (item) {
    try {
        var rgb = FFX.swatchRGB(item.fillColor);
        if (!rgb) return [255, 255, 255];
        var tint = item.fillTint;
        return (tint >= 0 && tint < 100) ? FFX.mixWhite(rgb, tint / 100) : rgb;
    } catch (e) { return [255, 255, 255]; }
};

FFX.contrast = function (a, b) {
    function lum(c) {
        var out = [];
        for (var i = 0; i < 3; i++) { var s = c[i] / 255; out.push(s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)); }
        return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2];
    }
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

FFX.showDialog = function (doc, autoClose) {
    var items = FFX.fieldsOf(doc);
    if (!items.length) { alert("This document has no form fields."); return false; }

    // Group items by field name. Items with the same name become one PDF field.
    var names = [], byName = {};
    for (var i = 0; i < items.length; i++) {
        var nm = items[i].name;
        if (!byName[nm]) { byName[nm] = { name: nm, type: items[i].constructor.name, items: [], item: items[i] }; names.push(nm); }
        byName[nm].items.push(items[i]);
    }
    var work = {};
    for (var n = 0; n < names.length; n++) {
        var e = byName[names[n]];
        var s = {};
        for (var m = 0; m < e.items.length && FFX.isEmpty(s); m++) s = FFX.readItem(e.items[m]);
        s.actions = s.actions || {};
        work[names[n]] = s;
    }

    var startName = names[0];
    if (app.selection.length && FFX.TYPES[app.selection[0].constructor.name]) startName = app.selection[0].name;

    // A palette stays open while you keep working in InDesign. Tests use a dialog so it can close itself.
    if (!autoClose && FFX.palette) { try { FFX.palette.close(); } catch (err) { } }
    var w = new Window(autoClose ? "dialog" : "palette", "Form Fixer " + FFX.VERSION);
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];

    var top = w.add("group");
    top.add("statictext", undefined, "Field:");
    var fieldList = top.add("dropdownlist", undefined, []);
    fieldList.preferredSize.width = 380;
    for (var a = 0; a < names.length; a++) {
        var label = names[a] + "  (" + FFX.TYPES[byName[names[a]].type] + ")";
        if (!FFX.isEmpty(FFX.clean(work[names[a]]))) label = "\u2022 " + label;
        fieldList.add("item", label);
    }

    // One section shows at a time so screen readers never mix two columns together.
    // Radio buttons work as tabs. InDesign's own tabs can't be reached with the Tab key.
    var secRow = w.add("group");
    secRow.add("statictext", undefined, "Section:");
    var secTabs = [], curSection = 0;
    var stack = w.add("group");
    stack.orientation = "stack";
    stack.alignChildren = ["fill", "top"];
    var sections = [];

    // Panel titles are read after the panel's contents, so each section starts with its own heading instead.
    function section(title) {
        var p = stack.add("panel");
        p.ffxTitle = title;
        p.visible = false;
        sections.push(p);
        var h = p.add("statictext", undefined, title);
        try { h.graphics.font = ScriptUI.newFont(h.graphics.font.name, "BOLD", h.graphics.font.size); } catch (err) { }
        return p;
    }

    var charPanel = section("Characters");
    charPanel.alignChildren = ["left", "top"];
    var limitRow = charPanel.add("group");
    var limitOn = limitRow.add("checkbox", undefined, "Limit characters to:");
    var limitNum = limitRow.add("edittext", undefined, "");
    limitNum.characters = 4;
    var combOn = charPanel.add("checkbox", undefined, "Comb: space characters evenly, one per box");

    var textPanel = section("Text");
    textPanel.alignChildren = ["left", "top"];
    var alignRow = textPanel.add("group");
    alignRow.add("statictext", undefined, "Alignment:");
    var alignList = alignRow.add("dropdownlist", undefined, ["Left", "Center", "Right"]);
    var defaultRow = textPanel.add("group");
    defaultRow.add("statictext", undefined, "Default value:");
    var defaultBox = defaultRow.add("edittext", undefined, "");
    defaultBox.preferredSize.width = 240;
    defaultRow.add("statictext", undefined, "Shows in the field until someone changes it.");
    var colorRow = textPanel.add("group");
    var colorLabel = colorRow.add("statictext", undefined, "Check mark color:");
    colorLabel.text = "Text color:";
    var colorList = colorRow.add("dropdownlist", undefined, []);
    colorList.preferredSize.width = 240;
    var contrastText = textPanel.add("statictext", undefined, "", { truncate: "end" });
    contrastText.preferredSize.width = 520;
    var colorChoices = [];

    var choicePanel = section("Choices");
    choicePanel.alignChildren = ["left", "top"];
    // Screen readers can't reach list items in ScriptUI, so choices use a dropdown.
    var choiceRow = choicePanel.add("group");
    choiceRow.orientation = "column";
    choiceRow.alignChildren = ["left", "top"];
    var choicePick = choiceRow.add("group");
    choicePick.add("statictext", undefined, "Choice:");
    var choiceItems = choicePick.add("dropdownlist", undefined, []);
    choiceItems.preferredSize.width = 300;
    var exportRow = choiceRow.add("group");
    exportRow.add("statictext", undefined, "Export value:");
    var exportBox = exportRow.add("edittext", undefined, "");
    exportBox.preferredSize.width = 220;
    choiceRow.add("statictext", undefined, "Leave the export value empty to use the choice itself.");
    var editableOn = choicePanel.add("checkbox", undefined, "Let people type their own answer (dropdowns only)");
    var choiceNames = [];

    var formatPanel = section("Format");
    formatPanel.alignChildren = ["left", "top"];
    var formatRow = formatPanel.add("group");
    formatRow.add("statictext", undefined, "Format:");
    var formatList = formatRow.add("dropdownlist", undefined, []);
    formatList.preferredSize.width = 280;
    formatList.add("item", "None");
    for (var fi = 0; fi < FFX.FORMATS.length; fi++) formatList.add("item", FFX.FORMATS[fi].label);
    formatList.add("item", "Custom (write it in JavaScript)");
    formatPanel.add("statictext", undefined, "Sets how the value displays and what people can type.");

    var validPanel = section("Validate");
    validPanel.alignChildren = ["left", "top"];
    var validRow = validPanel.add("group");
    validRow.add("statictext", undefined, "Check:");
    var validList = validRow.add("dropdownlist", undefined, ["None", "Number in range", "Custom (write it in JavaScript)"]);
    validList.preferredSize.width = 220;
    var rangeRow = validPanel.add("group");
    rangeRow.add("statictext", undefined, "From:");
    var rangeFrom = rangeRow.add("edittext", undefined, "");
    rangeFrom.characters = 8;
    rangeRow.add("statictext", undefined, "To:");
    var rangeTo = rangeRow.add("edittext", undefined, "");
    rangeTo.characters = 8;
    rangeRow.add("statictext", undefined, "Leave a box empty for no limit.");

    var calcPanel = section("Calculate");
    calcPanel.alignChildren = ["left", "top"];
    var calcRow = calcPanel.add("group");
    calcRow.add("statictext", undefined, "Value is the:");
    var calcList = calcRow.add("dropdownlist", undefined, []);
    calcList.preferredSize.width = 200;
    calcList.add("item", "None");
    for (var ki = 0; ki < FFX.CALCS.length; ki++) calcList.add("item", FFX.CALCS[ki].label);
    calcList.add("item", "Custom (write it in JavaScript)");
    // Check boxes instead of a list, since screen readers can't reach list items in ScriptUI.
    calcPanel.add("statictext", undefined, "Of these fields:");
    var calcFields = calcPanel.add("group");
    calcFields.alignChildren = ["left", "top"];
    var calcChecks = [], calcCol = null;
    for (var cn = 0; cn < names.length; cn++) {
        var cty = byName[names[cn]].type;
        if (cty !== "TextBox" && cty !== "ComboBox" && cty !== "ListBox") continue;
        if (calcChecks.length % 8 === 0) { calcCol = calcFields.add("group"); calcCol.orientation = "column"; calcCol.alignChildren = ["left", "top"]; }
        var ck = calcCol.add("checkbox", undefined, names[cn]);
        ck.ffxName = names[cn];
        calcChecks.push(ck);
    }
    if (!calcChecks.length) calcPanel.add("statictext", undefined, "This document has no other fields to add up.");
    calcPanel.add("statictext", undefined, "Tip: make the total field read only and give it a number format.");

    var jsPanel = section("JavaScript");
    jsPanel.alignChildren = ["fill", "top"];
    var trigRow = jsPanel.add("group");
    trigRow.add("statictext", undefined, "Run on:");
    var trigList = trigRow.add("dropdownlist", undefined, []);
    trigList.preferredSize.width = 280;
    jsPanel.add("statictext", undefined, "Code:");
    var codeBox = jsPanel.add("edittext", undefined, "", { multiline: true, scrollable: true });
    codeBox.preferredSize = [520, 120];
    var snipRow = jsPanel.add("group");
    snipRow.add("statictext", undefined, "Add an example:");
    var snipList = snipRow.add("dropdownlist", undefined, []);
    snipList.preferredSize.width = 200;
    var snipBtn = snipRow.add("button", undefined, "Add");
    var jsSummary = jsPanel.add("statictext", undefined, "", { truncate: "end" });
    jsSummary.preferredSize.width = 520;

    // ScriptUI uses a dropdown's tooltip as its spoken name.
    fieldList.helpTip = "Field";
    alignList.helpTip = "Alignment";
    colorList.helpTip = "Text color";
    formatList.helpTip = "Format";
    validList.helpTip = "Check";
    calcList.helpTip = "Value is the";
    trigList.helpTip = "Run on";
    snipList.helpTip = "Add an example";
    choiceItems.helpTip = "Choice";
    function showSection(i) {
        curSection = i;
        for (var k = 0; k < sections.length; k++) { sections[k].visible = k === i; secTabs[k].value = k === i; }
    }
    for (var si = 0; si < sections.length; si++) {
        var tab = secRow.add("radiobutton", undefined, sections[si].ffxTitle);
        tab.ffxIndex = si;
        tab.onClick = function () { showSection(this.ffxIndex); };
        secTabs.push(tab);
    }
    // Sections that don't apply are dimmed, and the panel moves off one if it was showing.
    function refreshSections() {
        for (var k = 0; k < sections.length; k++) secTabs[k].enabled = sections[k].enabled;
        if (!sections[curSection].enabled) {
            for (var f = 0; f < sections.length; f++) if (sections[f].enabled) { showSection(f); break; }
        }
    }

    var btns = w.add("group");
    btns.alignment = ["fill", "bottom"];
    var clearBtn = btns.add("button", undefined, "Clear this field");
    var spacer = btns.add("group"); spacer.alignment = ["fill", "fill"];
    var cancelBtn = btns.add("button", undefined, autoClose ? "Cancel" : "Close", { name: "cancel" });
    var saveBtn = btns.add("button", undefined, "Save", { name: "ok" });
    var status = w.add("statictext", undefined, "Select a form field on the page to edit it here.", { truncate: "end" });
    status.preferredSize.width = 520;

    var cur = null, curTrigs = [], curTrig = null, curSnips = [], dirty = false, syncingFormat = false, syncingCalc = false, syncingRange = false;

    function storeCode() {
        if (cur && curTrig) work[cur].actions[curTrig] = codeBox.text;
    }

    function saveAll() {
        storeAll();
        for (var q = 0; q < names.length; q++) {
            var grp = byName[names[q]];
            for (var r = 0; r < grp.items.length; r++) {
                try { if (grp.items[r].isValid) FFX.writeItem(grp.items[r], work[names[q]]); } catch (err) { }
            }
        }
        dirty = false;
    }

    function refreshSummary() {
        var s = work[cur], used = [];
        for (var k in s.actions) if (s.actions.hasOwnProperty(k) && FFX.trim(s.actions[k]) !== "") used.push(k);
        jsSummary.text = used.length ? "Has code for: " + used.join(", ") : "No code yet.";
    }

    function storeAll() {
        if (!cur) return;
        var s = work[cur];
        storeCode();
        if (byName[cur].type === "TextBox") {
            var lim = parseInt(limitNum.text, 10);
            s.limit = (limitOn.value && lim > 0) ? lim : 0;
            s.comb = s.limit > 0 && combOn.value;
            var ai = alignList.selection ? alignList.selection.index : 0;
            if (ai > 0) s.align = ai === 1 ? "center" : "right"; else delete s.align;
            if (defaultBox.text !== "") s.defaultValue = defaultBox.text; else delete s.defaultValue;
        }
        if (textPanel.enabled) {
            var ci = colorList.selection ? colorList.selection.index : 0;
            if (ci > 0 && colorChoices[ci]) s.textColor = { name: colorChoices[ci].name, rgb: colorChoices[ci].rgb }; else delete s.textColor;
        }
    }

    function refreshContrast() {
        if (!cur || !textPanel.enabled) { contrastText.text = ""; return; }
        var ci = colorList.selection ? colorList.selection.index : 0;
        var fg = (colorChoices[ci] && colorChoices[ci].rgb) || [0, 0, 0];
        var ratio = FFX.contrast(fg, FFX.fillRGB(byName[cur].item));
        var shown = Math.floor(ratio * 10) / 10;
        var t = byName[cur].type, isMark = t === "CheckBox" || t === "RadioButton";
        var need = isMark ? 3 : 4.5;
        contrastText.text = "Contrast with the field fill: " + shown + ":1" + (ratio < need ? (isMark ? ". Check marks need at least 3:1." : ". Text needs at least 4.5:1.") : ".");
    }

    function reloadTriggers(keep) {
        var s = work[cur], idx = 0;
        curTrig = null;
        trigList.removeAll();
        curTrigs = FFX.triggersFor(byName[cur].type);
        for (var i = 0; i < curTrigs.length; i++) {
            var has = s.actions[curTrigs[i].id] && FFX.trim(s.actions[curTrigs[i].id]) !== "";
            trigList.add("item", (has ? "\u2022 " : "") + curTrigs[i].label);
            if (curTrigs[i].id === keep) idx = i;
        }
        trigList.selection = idx;
    }

    function refreshFormat() {
        var idx = formatPanel.enabled ? FFX.formatIndex(work[cur].actions) : 0;
        syncingFormat = true;
        formatList.selection = idx < 0 ? FFX.FORMATS.length + 1 : idx;
        syncingFormat = false;
    }

    function choiceLabel(i) {
        var ev = work[cur].exportValues || {};
        return choiceNames[i] + (ev[choiceNames[i]] ? "  \u2192  " + ev[choiceNames[i]] : "");
    }

    function loadChoices() {
        var e = byName[cur], list = [];
        choiceNames = [];
        choiceItems.removeAll();
        if (e.type === "ComboBox" || e.type === "ListBox") { try { list = e.item.choiceList || []; } catch (err) { } }
        for (var i = 0; i < list.length; i++) choiceNames.push(String(list[i]));
        for (var j = 0; j < choiceNames.length; j++) choiceItems.add("item", choiceLabel(j));
        choicePanel.enabled = e.type === "ComboBox" || e.type === "ListBox";
        choiceRow.enabled = choiceNames.length > 0;
        if (!choiceNames.length) choiceItems.add("item", "No choices");
        editableOn.enabled = e.type === "ComboBox";
        editableOn.value = e.type === "ComboBox" && work[cur].editable === true;
        exportBox.text = "";
        if (choiceNames.length) choiceItems.selection = 0;
    }

    function refreshRange() {
        var r = validPanel.enabled ? FFX.parseRange(work[cur].actions.Validate) : null;
        syncingRange = true;
        var vi = 0;
        if (r) vi = r.custom ? 2 : 1;
        validList.selection = vi;
        rangeFrom.text = r && !r.custom && r.from !== null ? String(r.from) : "";
        rangeTo.text = r && !r.custom && r.to !== null ? String(r.to) : "";
        rangeRow.enabled = validList.selection.index === 1;
        syncingRange = false;
    }

    function applyRange() {
        if (syncingRange || !cur || !validList.selection) return;
        var idx = validList.selection.index;
        storeCode();
        rangeRow.enabled = idx === 1;
        if (idx === 2) { reloadTriggers("Validate"); return; }
        var a = work[cur].actions;
        var from = parseFloat(rangeFrom.text), to = parseFloat(rangeTo.text);
        from = isNaN(from) ? null : from;
        to = isNaN(to) ? null : to;
        if (idx === 1 && (from !== null || to !== null)) a.Validate = FFX.rangeCode(from, to); else delete a.Validate;
        reloadTriggers("Validate");
        dirty = true;
    }

    function refreshCalc() {
        var c = calcPanel.enabled ? FFX.parseCalc(work[cur].actions.Calculate) : null, idx = 0;
        if (c && c.custom) idx = FFX.CALCS.length + 1;
        else if (c) for (var i = 0; i < FFX.CALCS.length; i++) if (FFX.CALCS[i].op === c.op) idx = i + 1;
        syncingCalc = true;
        calcList.selection = idx;
        for (var j = 0; j < calcChecks.length; j++) calcChecks[j].value = !!(c && c.fields && FFX.inArray(c.fields, calcChecks[j].ffxName));
        calcFields.enabled = idx > 0 && idx <= FFX.CALCS.length;
        syncingCalc = false;
    }

    function applyCalc() {
        if (syncingCalc || !cur || !calcList.selection) return;
        var idx = calcList.selection.index;
        storeCode();
        calcFields.enabled = idx > 0 && idx <= FFX.CALCS.length;
        if (idx > FFX.CALCS.length) { reloadTriggers("Calculate"); return; }
        var a = work[cur].actions, picked = [];
        for (var i = 0; i < calcChecks.length; i++) if (calcChecks[i].value && calcChecks[i].enabled) picked.push(calcChecks[i].ffxName);
        if (idx > 0 && picked.length) a.Calculate = FFX.calcCode(FFX.CALCS[idx - 1].op, picked); else delete a.Calculate;
        reloadTriggers("Calculate");
        dirty = true;
    }

    function selectTrigger(id) {
        for (var i = 0; i < curTrigs.length; i++) if (curTrigs[i].id === id) { trigList.selection = i; return; }
    }

    function loadField(name) {
        cur = name;
        var e = byName[name], s = work[name], isText = e.type === "TextBox";

        charPanel.enabled = isText;
        limitOn.value = isText && s.limit > 0;
        limitNum.text = s.limit > 0 ? String(s.limit) : "";
        combOn.value = !!s.comb;
        limitNum.enabled = combOn.enabled = limitOn.value;

        var isMark = e.type === "CheckBox" || e.type === "RadioButton";
        var hasText = isText || isMark || e.type === "ComboBox" || e.type === "ListBox";
        textPanel.enabled = hasText;
        colorLabel.text = isMark ? "Check mark color:" : "Text color:";
        colorList.helpTip = isMark ? "Check mark color" : "Text color";
        alignRow.enabled = defaultRow.enabled = isText;
        defaultBox.text = isText && s.defaultValue ? s.defaultValue : "";
        alignList.selection = s.align === "center" ? 1 : s.align === "right" ? 2 : 0;
        colorChoices = FFX.textColorChoices(doc);
        var colorIdx = 0;
        if (s.textColor && s.textColor.rgb) {
            for (var ci = 1; ci < colorChoices.length; ci++) if (colorChoices[ci].name === s.textColor.name) colorIdx = ci;
            if (!colorIdx) { colorChoices.push({ name: s.textColor.name + " (saved)", rgb: s.textColor.rgb }); colorIdx = colorChoices.length - 1; }
        }
        colorList.removeAll();
        for (var cj = 0; cj < colorChoices.length; cj++) colorList.add("item", colorChoices[cj].name);
        colorList.selection = colorIdx;
        refreshContrast();
        formatPanel.enabled = isText;
        loadChoices();
        validPanel.enabled = isText;
        calcPanel.enabled = isText;
        for (var n = 0; n < calcChecks.length; n++) {
            var self = calcChecks[n].ffxName === name;
            calcChecks[n].text = self ? name + " (this field)" : calcChecks[n].ffxName;
            calcChecks[n].enabled = !self;
        }
        reloadTriggers(null);
        refreshFormat();
        refreshCalc();
        refreshRange();

        snipList.removeAll();
        curSnips = FFX.snippetsFor(e.type);
        for (var j = 0; j < curSnips.length; j++) snipList.add("item", curSnips[j].label);
        snipList.enabled = snipBtn.enabled = curSnips.length > 0;
        if (curSnips.length) snipList.selection = 0;

        refreshSummary();
        refreshSections();
    }

    trigList.onChange = function () {
        if (!trigList.selection) return;
        storeCode();
        curTrig = curTrigs[trigList.selection.index].id;
        codeBox.text = work[cur].actions[curTrig] || "";
        refreshSummary();
    };
    codeBox.onChanging = function () { storeCode(); refreshSummary(); refreshFormat(); refreshCalc(); if (curTrig === "Validate") refreshRange(); dirty = true; };

    choiceItems.onChange = function () {
        var sel = choiceItems.selection;
        if (!sel || !cur) { exportBox.text = ""; return; }
        exportBox.text = (work[cur].exportValues || {})[choiceNames[sel.index]] || "";
    };
    exportBox.onChanging = function () {
        var sel = choiceItems.selection;
        if (!sel || !cur) return;
        var s = work[cur], key = choiceNames[sel.index];
        s.exportValues = s.exportValues || {};
        if (exportBox.text !== "") s.exportValues[key] = exportBox.text; else delete s.exportValues[key];
        sel.text = choiceLabel(sel.index);
        dirty = true;
    };

    editableOn.onClick = function () {
        if (!cur) return;
        if (editableOn.value) work[cur].editable = true; else delete work[cur].editable;
        dirty = true;
    };

    validList.onChange = applyRange;
    rangeFrom.onChanging = applyRange;
    rangeTo.onChanging = applyRange;

    calcList.onChange = applyCalc;
    for (var cc = 0; cc < calcChecks.length; cc++) calcChecks[cc].onClick = applyCalc;

    formatList.onChange = function () {
        if (syncingFormat || !cur || !formatList.selection) return;
        var idx = formatList.selection.index;
        storeCode();
        if (idx > FFX.FORMATS.length) { reloadTriggers("Keystroke"); return; }
        var a = work[cur].actions, p = idx > 0 ? FFX.FORMATS[idx - 1].actions : {};
        if (p.Keystroke) a.Keystroke = p.Keystroke; else delete a.Keystroke;
        if (p.Format) a.Format = p.Format; else delete a.Format;
        reloadTriggers(p.Format ? "Format" : "Keystroke");
        dirty = true;
    };

    limitOn.onClick = function () { limitNum.enabled = combOn.enabled = limitOn.value; dirty = true; };
    limitNum.onChanging = function () { dirty = true; };
    combOn.onClick = function () { dirty = true; };
    alignList.onChange = function () { dirty = true; };
    defaultBox.onChanging = function () { dirty = true; };
    colorList.onChange = function () { refreshContrast(); dirty = true; };

    snipBtn.onClick = function () {
        if (!snipList.selection) return;
        storeCode();
        var sn = curSnips[snipList.selection.index], first = null;
        for (var t in sn.actions) {
            if (!sn.actions.hasOwnProperty(t)) continue;
            var existing = work[cur].actions[t] || "";
            work[cur].actions[t] = existing ? existing + "\n" + sn.actions[t] : sn.actions[t];
            if (!first) first = t;
        }
        curTrig = null;
        selectTrigger(first);
        codeBox.text = work[cur].actions[first];
        curTrig = first;
        refreshSummary();
        dirty = true;
    };

    fieldList.onChange = function () {
        if (!fieldList.selection) return;
        var wasDirty = dirty;
        storeAll();
        loadField(names[fieldList.selection.index]);
        // Loading a field resets the controls, which isn't an edit.
        dirty = wasDirty;
    };

    clearBtn.onClick = function () {
        work[cur] = { actions: {} };
        loadField(cur);
        dirty = true;
    };

    showSection(0);
    for (var x = 0; x < names.length; x++) if (names[x] === startName) fieldList.selection = x;
    if (!fieldList.selection) fieldList.selection = 0;
    // Loading the first field fires change handlers; nothing is edited yet.
    dirty = false;

    if (autoClose) {
        w.onShow = function () { w.close(0); };
        var result = w.show();
        if (result !== 1) return false;
        saveAll();
        return true;
    }

    function sameDoc() {
        try { return doc.isValid && app.documents.length && app.activeDocument.toSpecifier() === doc.toSpecifier(); } catch (err) { return false; }
    }

    // Follow the selection: picking a form field on the page loads it in the panel.
    function onSelection() {
        try {
            if (!w.visible || !sameDoc() || !app.selection.length) return;
            var sel = app.selection[0];
            if (!FFX.TYPES[sel.constructor.name]) return;
            for (var i = 0; i < names.length; i++) {
                if (names[i] === sel.name) {
                    if (names[i] !== cur) fieldList.selection = i;
                    status.text = "Editing " + sel.name + ".";
                    return;
                }
            }
            status.text = sel.name + " is new. Close and run Form Fixer again to include it.";
        } catch (err) { }
    }
    var listener = app.addEventListener("afterSelectionChanged", onSelection);

    function stopListening() {
        try { if (listener && listener.isValid) listener.remove(); } catch (err) { }
        listener = null;
        if (FFX.palette === w) FFX.palette = null;
    }

    saveBtn.onClick = function () {
        if (!doc.isValid) { status.text = "The document was closed. Close this panel."; return; }
        saveAll();
        var n = FFX.sync(doc);
        status.text = n ? "Saved settings for " + n + " field" + (n === 1 ? "" : "s") + ". Export to Interactive PDF, then apply them in Acrobat." : "No settings to save.";
    };

    cancelBtn.onClick = function () { w.close(); };

    w.onClose = function () {
        if (dirty && doc.isValid && confirm("Save your Form Fixer changes before closing?")) {
            saveAll();
            FFX.sync(doc);
        }
        stopListening();
        return true;
    };

    FFX.palette = w;
    w.show();
    return true;
};

FFX.main = function () {
    FFX.removeExportHook();
    if (!app.documents.length) { alert("Open a document with form fields first."); return; }
    FFX.showDialog(app.activeDocument);
};

// Test harnesses set FFX_NO_UI; clear it so it never sticks in the persistent engine.
var FFX_noUI = $.global.FFX_NO_UI;
$.global.FFX_NO_UI = false;
if (!FFX_noUI) FFX.main();
