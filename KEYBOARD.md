# Keyboard and screen reader guide

This guide covers using Form Fixer on a Mac with only a keyboard, or with VoiceOver. It was tested in InDesign 2026 on macOS. Acrobat's menus work as expected with a keyboard and VoiceOver, so they aren't covered here. Windows hasn't been tested yet.

## Before you start: give Form Fixer a shortcut

The Scripts panel is hard to use with a keyboard, so give Form Fixer its own shortcut once.

1. In InDesign, choose **Edit > Keyboard Shortcuts**.
2. In **Product Area**, choose **Scripts**.
3. In **Commands**, select **Form Fixer.jsx**.
4. Move to **New Shortcut** and press the keys you want, such as Control+Option+F.
5. Select **Assign**, then **OK**.

## Open the panel

1. Open a document with form fields.
2. Press your Form Fixer shortcut. The panel opens with focus on the panel itself.
3. Press Tab to move to the **Field** menu.

To get back to the panel after working in the document, press the shortcut again. If you have changes you haven't saved, Form Fixer asks if you want to save them first.

## What's in the panel

In reading order:

1. **Field** menu: the form field you're editing. Fields that already have settings start with a bullet.
2. **Section** tabs: Characters, Text, Choices, Format, Validate, Calculate, and JavaScript. Only the selected section is shown.
3. The selected section's controls.
4. **Clear this field**, **Close**, and **Save** buttons.
5. A status message.

Tabs for sections that don't apply to the selected field are dimmed. For example, Choices is dimmed for a text field.

## Keys

| To do this | Press |
| --- | --- |
| Move to the next or previous control | Tab or Shift+Tab |
| Change a menu's value | Up Arrow or Down Arrow. The value changes right away. |
| Open a menu to see all its options | Space. Then use the arrow keys, Return to choose, or Escape to close. |
| Switch section tabs | Left Arrow or Right Arrow on a tab. Dimmed tabs are skipped. |
| Turn a check box on or off | Space |
| Press a button | Space |

Notes:

- Each section tab is its own Tab stop, so Tab moves through every available tab before reaching the section.
- Return doesn't save and Escape doesn't close. Use the **Save** and **Close** buttons.
- Changing the **Field** menu with the arrow keys switches fields right away. Your changes to the previous field are kept until you select **Save** or **Close**.

## VoiceOver notes

- Section tabs are read as radio buttons, such as "Text, selected, radio button." "Dimmed" means the section doesn't apply to this field.
- Menus, check boxes, and buttons are all read with their names.
- Text boxes aren't read with a name. InDesign's script panels can't name them. Each text box comes right after its label, so press VO+Left Arrow to hear the label. The text boxes are:
  - Characters: **Limit characters to**
  - Text: **Default value**
  - Choices: **Export value**
  - Validate: **From** and **To**
  - JavaScript: **Code**
- In browse mode (VO+arrow keys), VoiceOver also stops on labels and help text. Tab skips them.
- Only the selected section is read. Switch tabs to hear the others.
- The Text section reads the contrast between the text color and the field's fill, just after the **Text color** menu.
- The status message isn't announced on its own. After you select **Save**, move to the end of the panel to hear it.

## Known limits

- Text boxes don't have spoken names.
- Section tabs are separate Tab stops instead of one.
- InDesign's own tabs can't be reached with a keyboard on Mac, which is why the sections use radio buttons.
- Not yet tested on Windows or with NVDA, JAWS, or Narrator.
