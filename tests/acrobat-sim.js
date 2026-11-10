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

// Simulates Acrobat's JavaScript objects to check "Form Fixer.js" against real exported metadata.
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const alerts = [];
function makeField(name, type, value) {
  return { name, type, value, actions: {}, items: null, comb: false, charLimit: 0, multiline: true,
    setAction(t, c) { this.actions[t] = c; }, setItems(a) { this.items = a; } };
}
const fields = {
  "Zip code": makeField("Zip code", "text", ""),
  "Student ID": makeField("Student ID", "text", ""),
  "School": makeField("School", "combobox", "Select one"),
  "Year": Object.assign(makeField("Year", "combobox", "First year"), { numItems: 3, currentValueIndices: 1,
    getItemAt(i) { return ["Select one", "First year", "Second year"][i]; } }),
  "Combo Box 1": makeField("Combo Box 1", "combobox", "Select one"),
  "Town": makeField("Town", "text", ""),
  "Agree": makeField("Agree", "checkbox", "Off"),
};
let calcs = 0;
const doc = { calculateNow() { calcs++; }, metadata: fs.readFileSync(__dirname + "/sample-xmp.xml", "utf8"), getField: n => fields[n] || null };
const ctx = { app: { alert: m => alerts.push(m), addToolButton() {}, addMenuItem() {} }, JSON, event: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/../acrobat/Form Fixer.js", "utf8"), ctx);
const res = JSON.parse(JSON.stringify(ctx.FFX_apply(doc)));
console.log(alerts.join("\n---\n"));
assert.deepStrictEqual(res.missing, []); assert.deepStrictEqual(res.errors, []);
assert.strictEqual(fields["Zip code"].comb, true); assert.strictEqual(fields["Zip code"].charLimit, 5);
assert.strictEqual(fields["Student ID"].charLimit, 9);
assert.strictEqual(fields["Student ID"].alignment, "center");
assert.deepStrictEqual([...fields["Student ID"].textColor], ["RGB", 0.8, 0, 0.2]);
assert.strictEqual(fields["Zip code"].alignment, undefined);
assert.deepStrictEqual([...fields["Agree"].textColor], ["RGB", 0.8, 0, 0.2]); assert.strictEqual(fields["Agree"].charLimit, 0);
assert.strictEqual(fields["Town"].defaultValue, "New Brunswick"); assert.strictEqual(fields["Town"].value, "New Brunswick");
assert.strictEqual(fields["Zip code"].defaultValue, undefined);
assert.strictEqual(fields["Town"].actions.Calculate, 'AFSimple_Calculate("SUM", new Array ("Zip code", "Student ID"));'); assert.strictEqual(calcs, 1);
assert.deepStrictEqual(JSON.parse(JSON.stringify(fields["Year"].items)), [["Select one", "Select one"], ["First year", "1"], ["Second year", "2"]]);
assert.strictEqual(fields["Year"].currentValueIndices, 1);
assert.strictEqual(fields["Year"].editable, true); assert.strictEqual(fields["School"].editable, false);
assert.ok(fields["Town"].actions.Format.includes('"quotes" & <tags>'));
assert.deepStrictEqual([...fields["Combo Box 1"].items], ["Select one"]);
// Run the generated dependent-dropdown code as Acrobat would when School changes
const school = fields["School"];
assert.strictEqual(school.commitOnSelChange, true);
const ev = { value: "Arts and Sciences", rc: true };
new Function("event", school.actions.Validate).call(doc, ev);
assert.deepStrictEqual([...fields["Combo Box 1"].items], ["Select one", "Biology", "History", "Physics"]);
new Function("event", school.actions.Validate).call(doc, { value: "Select one", rc: true });
assert.deepStrictEqual([...fields["Combo Box 1"].items], ["Select one"]);
// Keystroke snippet behaves
const ks = new Function("event", fields["Zip code"].actions.Keystroke);
let e1 = { willCommit: false, change: "7", rc: true }; ks(e1); assert.strictEqual(e1.rc, true);
let e2 = { willCommit: false, change: "a", rc: true }; ks(e2); assert.strictEqual(e2.rc, false);
// No settings case
const r2 = ctx.FFX_apply({ metadata: "<x:xmpmeta/>", getField: () => null });
assert.strictEqual(r2.applied.length, 0);
console.log("\nAll Acrobat simulation checks passed.");
