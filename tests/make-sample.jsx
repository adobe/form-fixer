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

// Builds samples/Form Fixer sample.pdf and Form Fixer demo.pdf: one labeled field for every Form Fixer setting.
// Open the PDF in Acrobat and choose Edit > Apply InDesign form settings to see the results.
$.global.FFX_NO_UI = true;
#include "../indesign/Form Fixer.jsx"

var root = File($.fileName).parent.parent;
var doc = app.documents.add(false);
doc.viewPreferences.horizontalMeasurementUnits = doc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.POINTS;
doc.documentPreferences.facingPages = false;
doc.documentPreferences.pageWidth = 612;
doc.documentPreferences.pageHeight = 792;

doc.colors.add({ name: "Red", model: ColorModel.PROCESS, space: ColorSpace.RGB, colorValue: [204, 0, 51] });
var blue = doc.colors.add({ name: "Dark blue", model: ColorModel.PROCESS, space: ColorSpace.RGB, colorValue: [0, 51, 102] });
var black = doc.swatches.itemByName("Black");

function tagStyle(name, tag) {
    var st = doc.paragraphStyles.add({ name: name });
    st.styleExportTagMaps.add("PDF", tag, "", "");
    return st;
}
var styles = { H1: tagStyle("Title", "H1"), H2: tagStyle("Heading 2", "H2"), P: tagStyle("Body", "P") };

var page = doc.pages[0], y = 48;
// Tag the PDF in visual order (each label before its field) using the Articles panel.
doc.taggedPDFPreferences.structureOrder = TaggedPDFStructureOrderOptions.USE_ARTICLES;
var article = doc.articles.add("Reading order", true);
function inOrder(item) { article.articleMembers.add(item); return item; }

function nextRow(h) {
    if (y + h > 750) { page = doc.pages.add(); y = 48; }
}

function text(str, size, top, left, right, lines, tag) {
    var t = page.textFrames.add({ geometricBounds: [top, left, top + (size + 4) * (lines || 1) + 6, right] });
    t.contents = str;
    t.texts[0].applyParagraphStyle(styles[tag || "P"], true);
    t.texts[0].pointSize = size;
    if (t.overflows) throw new Error("Text doesn't fit: " + str);
    return inOrder(t);
}

function heading(str) {
    nextRow(60);
    y += 8;
    text(str, 14, y, 36, 576, 1, "H2").texts[0].fontStyle = "Bold";
    y += 26;
}

function field(kind, name, settings, extra) {
    nextRow(30);
    text(name, 12, y + 3, 36, 250);
    var f = page[kind].add({ geometricBounds: [y, 260, y + 22, 560] });
    f.name = name;
    f.description = name;
    f.strokeWeight = 1;
    f.strokeColor = black;
    if (f.hasOwnProperty("fontSize")) f.fontSize = 12;
    if (extra) extra(f);
    if (settings) FFX.writeItem(f, settings);
    inOrder(f);
    y += 30;
    return f;
}

text("Form Fixer sample", 20, y, 36, 576, 1, "H1").texts[0].fontStyle = "Bold";
y += 32;
text("Each field below uses one Form Fixer setting. In Acrobat, choose Edit > Apply InDesign form settings, then open each field's properties.", 12, y, 36, 576, 2);
y += 36;

heading("Choices (Options tab)");
field("comboBoxes", "Dropdown with export values", { exportValues: { "First year": "1", "Second year": "2", "Third year": "3", "Fourth year": "4" } }, function (f) { f.choiceList = ["Select one", "First year", "Second year", "Third year", "Fourth year"]; });
field("comboBoxes", "Dropdown that allows typing", { editable: true }, function (f) { f.choiceList = ["Select or type one", "Art", "Music", "Theater"]; });

heading("Format and typing (Format tab)");
for (var i = 0; i < FFX.FORMATS.length; i++) {
    var sn = FFX.FORMATS[i];
    if (sn.actions.Format || sn.actions.Keystroke) field("textBoxes", sn.label, { actions: sn.actions });
}

heading("Checks (Validate tab)");
for (var j = 0; j < FFX.SNIPPETS.length; j++) {
    if (FFX.SNIPPETS[j].actions.Validate) field("textBoxes", FFX.SNIPPETS[j].label, { actions: FFX.SNIPPETS[j].actions });
}

field("textBoxes", "Number from 18 to 99", { actions: { Validate: FFX.rangeCode(18, 99) } });
field("textBoxes", "Number 0 or more", { actions: { Validate: FFX.rangeCode(0, null) } });

heading("Characters (Options tab)");
field("textBoxes", "Comb, 5 characters", { limit: 5, comb: true });
field("textBoxes", "Limit, 10 characters", { limit: 10 });

heading("Text (Options and Appearance tabs)");
field("textBoxes", "Default value: New Brunswick", { defaultValue: "New Brunswick" });
field("textBoxes", "Centered text", { align: "center" });
field("textBoxes", "Right-aligned text", { align: "right" });
field("textBoxes", "Red text", { textColor: { name: "Red", rgb: [204, 0, 51] } });
field("textBoxes", "Dark blue text on a light fill", { textColor: { name: "Dark blue", rgb: [0, 51, 102] } }, function (f) { f.fillColor = blue; f.fillTint = 10; });
field("checkBoxes", "Check box with a red check mark", { textColor: { name: "Red", rgb: [204, 0, 51] } }, function (f) { f.geometricBounds = [y, 260, y + 22, 282]; });
field("radioButtons", "Radio button with a red dot", { textColor: { name: "Red", rgb: [204, 0, 51] } }, function (f) { f.geometricBounds = [y, 260, y + 22, 282]; });
field("comboBoxes", "Dropdown with red text", { textColor: { name: "Red", rgb: [204, 0, 51] } }, function (f) { f.choiceList = ["Option 1", "Option 2"]; });

heading("Calculate (Calculate tab)");
var dollars = null;
for (var d = 0; d < FFX.FORMATS.length; d++) if (FFX.FORMATS[d].label.indexOf("Dollars") === 0) dollars = FFX.FORMATS[d].actions;
field("textBoxes", "Price 1", { actions: dollars });
field("textBoxes", "Price 2", { actions: dollars });
field("textBoxes", "Total, sum of Price 1 and Price 2", { actions: { Keystroke: dollars.Keystroke, Format: dollars.Format, Calculate: FFX.calcCode("SUM", ["Price 1", "Price 2"]) } }, function (f) { f.readOnly = true; });

heading("JavaScript (Actions tab)");
field("textBoxes", "Mouse up JavaScript", { actions: { MouseUp: "app.alert(\"You selected this field.\");" } });

nextRow(180);
heading("Focus (Actions tab)");
text("Press Tab in Acrobat or Reader. Compare the document ring, a custom ring, and no custom ring.", 12, y, 36, 576, 2);
y += 40;
FFX.writeDoc(doc, { focus: { name: "Dark blue", rgb: [0, 51, 102], width: 3, offset: 1 } });
field("textBoxes", "Use the document focus ring", null);
field("textBoxes", "Custom focus ring", { focus: { name: "Black", rgb: [0, 0, 0], width: 2, offset: 3 } });
field("textBoxes", "No custom focus ring", { focus: { off: true } });

FFX.sync(doc);
FFX.removeExportHook();
var folder = new Folder(root + "/samples");
if (!folder.exists) folder.create();
var prefs = app.interactivePDFExportPreferences;
var pv = prefs.viewPDF, pt = prefs.pdfDisplayTitle;
prefs.viewPDF = false;
prefs.pdfDisplayTitle = PdfDisplayTitleOptions.DISPLAY_DOCUMENT_TITLE;
// The demo is the same form; open it in Acrobat, apply the settings, and save it.
var names = ["Form Fixer sample", "Form Fixer demo"], out;
for (var n = 0; n < names.length; n++) {
    out = new File(folder + "/" + names[n] + ".pdf");
    doc.metadataPreferences.documentTitle = names[n];
    doc.exportFile(ExportFormat.INTERACTIVE_PDF, out, false);
}
prefs.viewPDF = pv;
prefs.pdfDisplayTitle = pt;
doc.close(SaveOptions.NO);
"Exported " + folder.fsName;
