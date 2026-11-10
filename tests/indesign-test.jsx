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

// Test harness: runs Form Fixer without user interaction on a small test form.
$.global.FFX_NO_UI = true;
#include "../indesign/Form Fixer.jsx"
var r=[];
// Build a small test form so the test doesn't depend on any file outside this project.
var doc=app.documents.add(false), pg=doc.pages[0], top=36;
doc.viewPreferences.horizontalMeasurementUnits=doc.viewPreferences.verticalMeasurementUnits=MeasurementUnits.POINTS;
doc.colors.add({name:"Red",model:ColorModel.PROCESS,space:ColorSpace.RGB,colorValue:[204,0,51]});
function add(kind,name,choices){ var f=pg[kind].add({geometricBounds:[top,36,top+22,300],name:name}); if(choices) f.choiceList=choices; top+=36; return f; }
add("textBoxes","Zip code"); add("textBoxes","Student ID"); add("textBoxes","City");
add("comboBoxes","School",["Arts and Sciences","Engineering","Select one"]); add("comboBoxes","Combo Box 1",["Select one"]);
// 1. dialog builds and closes cleanly
try{ r.push("dialog cancelled cleanly: "+(FFX.showDialog(doc,true)===false)); }catch(e){ r.push("DIALOG ERROR line "+e.line+": "+e); }
// 2. write settings as the dialog would
var f=FFX.fieldsOf(doc), byN={};
for(var i=0;i<f.length;i++){ (byN[f[i].name]=byN[f[i].name]||[]).push(f[i]); }
function set(n,s){ for(var i=0;i<byN[n].length;i++) FFX.writeItem(byN[n][i],s); }
set("Zip code",{limit:5,comb:true,actions:{Keystroke:FFX.FORMATS[0].actions.Keystroke}});
set("Student ID",{limit:9,comb:true,align:"center",defaultValue:"123456789",textColor:{name:"Red",rgb:[204,0,51]},actions:{}});
set("School",{actions:{},children:{field:"Combo Box 1",placeholder:"Select one",map:FFX.textToMap("Arts and Sciences = Biology; History; Physics\nEngineering = Civil; Electrical; Mechanical\nSelect one = ")}});
set("City",{actions:{Format:"event.value = event.value.toUpperCase(); // \"quotes\" & <tags>"}});
r.push("synced fields: "+FFX.sync(doc));
r.push("text roundtrip: "+FFX.stringify(FFX.parse(byN["Student ID"][0].extractLabel("ffx"))));
r.push("contrast black on white: "+FFX.contrast([0,0,0],[255,255,255])+", colors: "+FFX.textColorChoices(doc).length);
r.push("format index: "+[FFX.formatIndex({}),FFX.formatIndex(FFX.FORMATS[3].actions),FFX.formatIndex({Keystroke:"x"})].join(","));
var pc=FFX.parseCalc(FFX.calcCode("AVG",['Say "hi"',"a\\b","Total"]));
r.push("calc parse: "+pc.op+" "+pc.fields.join("|")+" / none="+FFX.parseCalc("")+" / custom="+FFX.parseCalc("event.value=1;").custom);
var pr=FFX.parseRange(FFX.rangeCode(18,null)), pr2=FFX.parseRange(FFX.rangeCode(-1.5,99));
r.push("range: "+FFX.rangeCode(18,99)+" / "+pr.from+","+pr.to+" / "+pr2.from+","+pr2.to+" / custom="+FFX.parseRange("x").custom);
r.push("clean export: "+FFX.stringify(FFX.clean({actions:{},exportValues:{a:"1",b:""},editable:true})));
r.push("roundtrip: "+FFX.stringify(FFX.parse(byN["School"][0].extractLabel("ffx"))));
// 3. rename a field, re-sync, export
FFX.removeExportHook();
var pv=app.interactivePDFExportPreferences.viewPDF; app.interactivePDFExportPreferences.viewPDF=false;
byN["City"][0].name="Town"; FFX.sync(doc);
doc.exportFile(ExportFormat.INTERACTIVE_PDF,new File("/tmp/ffx/test.pdf"),false);
app.interactivePDFExportPreferences.viewPDF=pv;
byN["City"][0].name="City";
doc.close(SaveOptions.NO);
r.join("\n");
