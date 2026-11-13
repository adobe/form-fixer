# Contributing

Thanks for choosing to contribute!

The following are a set of guidelines to follow when contributing to this project.

## Code Of Conduct

This project adheres to the Adobe [code of conduct](../CODE_OF_CONDUCT.md). By participating,
you are expected to uphold this code. Please report unacceptable behavior to
[Grp-opensourceoffice@adobe.com](mailto:Grp-opensourceoffice@adobe.com).

## Have A Question?

Start by filing an issue. The existing committers on this project work to reach
consensus around project direction and issue solutions within issue threads
(when appropriate).

## Contributor License Agreement

All third-party contributions to this project must be accompanied by a signed contributor
license agreement. This gives Adobe permission to redistribute your contributions
as part of the project. [Sign our CLA](https://opensource.adobe.com/cla.html). You
only need to submit an Adobe CLA one time, so if you have submitted one previously,
you are good to go!

## Code Reviews

All submissions should come in the form of pull requests and need to be reviewed
by project committers. Read [GitHub's pull request documentation](https://help.github.com/articles/about-pull-requests/)
for more information on sending pull requests.

Lastly, please follow the [pull request template](PULL_REQUEST_TEMPLATE.md) when
submitting a pull request!

## From Contributor To Committer

We love contributions from our community! If you'd like to go a step beyond contributor
and become a committer with full write access and a say in the project, you must
be invited to the project. The existing committers employ an internal nomination
process that must reach lazy consensus (silence is approval) before invitations
are issued. If you feel you are qualified and want to get more deeply involved,
feel free to reach out to existing committers to have a conversation about that.

## Security Issues

Security issues shouldn't be reported on this issue tracker. Instead, [file an issue to our security experts](https://helpx.adobe.com/security/alertus.html).

## For developers

### Files

- `indesign/Form Fixer.jsx`: the InDesign panel. It saves settings on each field and in the document's XMP metadata, which InDesign copies into the exported PDF.
- `acrobat/Form Fixer.js`: the Acrobat add-on. It adds **Edit > Apply InDesign form settings**, which reads the metadata and applies the settings.
- `samples/Form Fixer sample.pdf`: one labeled field for every setting. Rebuild it by running `tests/make-sample.jsx` in InDesign.
- `samples/Form Fixer demo.pdf`: the sample after **Apply InDesign form settings** in Acrobat. `tests/make-sample.jsx` rebuilds it too; then open it in Acrobat, apply the settings, and save it.
- `tests/`: an InDesign test that runs against a copy of the sample, an Acrobat simulation (`node tests/acrobat-sim.js`), and a test PDF.
- `docs/images/make-illustrations.py`: builds the guide illustrations. Needs Google Chrome.
- `tools/make-release.py`: builds `dist/Form-Fixer.zip` with the scripts, sample, license, and the guides as web pages. Needs the `gh` command.

### Run the Acrobat add-on without installing it

Open Acrobat's JavaScript console (Command-J or Ctrl-J), paste the contents of `acrobat/Form Fixer.js`, run it, then run `FFX_apply(this);`.

### Check the focus examples

The sample generator sets a document-wide focus ring and adds fields that inherit it, override it, or turn the custom ring off. After rebuilding the PDFs, apply the settings only to the demo. Keep the sample unapplied so people can check their install.

In Acrobat or Acrobat Reader, Tab through the Focus examples. Check that each ring appears only while its field has focus and does not print. Run `node tests/acrobat-sim.js` to check document defaults, field overrides, opt-outs, and reapplying settings.

### Looking into

- Dependent dropdowns, where a choice in one dropdown changes the options in another. The Acrobat add-on still supports this for documents that already use it, but it's hidden from the InDesign panel until there's a clear use case.
