# Windows signing setup for Keeper's UK owner

Checked against the providers' official information on 21 October 2026.
No certificate, account, subscription or signing key has been created by this
work. Do not buy a signing product until its eligibility, total price and
automated signing support have been confirmed for your application.

**You do not need to pay for a certificate just to download and use Keeper on
your own laptop.** A private unsigned build can be installed for testing, with
Windows publisher/reputation warnings. Use a disposable account and copied data
while validating it. The paid service described below is an optional route to
the separately requested officially signed distribution and update pipeline.
No purchase is currently required or authorized.

## The practical choice

If you publish Keeper personally, a managed **individual code-signing
certificate** avoids needing a registered company or a USB signing device.
SSL.com's **IV Code Signing with eSigner cloud signing** supports individual
publishing; its identity guide includes UK document verification. Your verified personal name would appear as the
publisher of the Windows installer. A business name must not be invented for
the certificate.

The official IV certificate page lists **US $129 for one year**. Its eSigner
Tier 1 service is a separate charge: **US $20 per month for 20 signings**, or
**US $180 per year for 240 signings**. Buying both annual products would be
**US $309 per year**, before applicable tax and currency conversion. A single
release can use several signatures because it contains an application,
uninstaller and setup program. Confirm the current checkout total, UK individual
subscription terms and signature allowance before paying.

Sources: [individual certificate](https://www.ssl.com/products/software-integrity/code-signing/iv/),
[cloud signing service](https://www.ssl.com/products/software-integrity/signing-service/),
[separate cloud subscription prices](https://www.ssl.com/guide/esigner-pricing-for-code-signing/).

## What only you need to do

1. Decide whether Windows should show **your own verified name** or the name of
   an existing registered business as Keeper's publisher. You do not need to
   create a business merely to use an individual certificate.
2. Confirm the full recurring cost, subscription terms and signature limits for
   **IV Code Signing plus eSigner**, if you choose this paid route. The provider
   offers UK individual identity verification; Codex does not need your
   identity documents.
3. If you choose that paid route, create the account and complete payment and
   identity checks **on the provider's secure website**. Government ID, address
   checks and any required verification call must be handled directly with the
   provider. Do not upload those documents to ChatGPT or the public repository.
4. Choose **cloud signing**, rather than a USB token or an exportable PFX.
   Enable account security and keep all passwords, recovery codes and signing
   credentials private. Codex does not need your private signing key.
5. Once approved, configure the release credentials only inside GitHub's
   protected **windows-release** environment using the provider-specific setup
   prepared by Codex. A required reviewer must approve signing jobs. The
   current connection cannot administer these protected GitHub settings.
6. Approve a signed **draft** test build, then perform the disposable Windows
   installation, migration, update and recovery trial before approving a public
   release. Keep your existing working Keeper throughout the trial.

Provider identity requirements:
[SSL.com identity-validation guide, including UK documents](https://www.ssl.com/guide/identity-validation-for-ssl-com-certificates-a-complete-guide/).

## Work Codex can complete

Codex can build and review the provider integration, validate synthetic signing
failure paths, verify the actual signed app/setup publisher and timestamps,
check installer hashes and update metadata, and prepare draft releases after
approval. Future approved releases can then be signed in GitHub without moving
the service's private key onto your laptop or into the repository.

The existing release workflow is currently a **PFX-based signing workflow**.
The optional cloud adapter in `desktop/tools/sign-windows-managed.cjs` is
prepared and unit-tested, but has not signed a real file or been accepted with
a production account. It is not enabled for official releases by default.
eSigner credentials must not be put in `RQK_WINDOWS_CERT_PFX`. The integration
must sign the application before
it is packaged, as well as the uninstaller and final setup executable, and keep
all existing publisher/signature verification gates. Production validation
cannot pass until a real signing account and protected settings exist.

The vendor's [GitHub integration](https://github.com/SSLcom/esigner-codesign)
supports managed signing. Any integration used for Keeper must pin reviewed
tool/action versions, avoid printing secrets and fail closed. Cloud automation
credentials are sensitive even though the private certificate key stays in the
provider's HSM.

For a reviewed integration, electron-builder uses
`win.signtoolOptions.sign = "./tools/sign-windows-managed.cjs"` and
`win.signtoolOptions.signingHashAlgorithms = ["sha256"]`. The protected release
job must provision and pin the complete vendor SDK and Java runtime first.
The adapter requires these protected settings:

- `RQK_WINDOWS_SIGNING_PROVIDER=sslcom` and `RQK_WINDOWS_PUBLISHER`.
- `RQK_ESIGNER_TOOL_ROOT`, `RQK_ESIGNER_TOOL_SHA256` (the complete SDK tree
  digest), `RQK_ESIGNER_VERSION`, `RQK_ESIGNER_JAVA_PATH`, and
  `RQK_ESIGNER_JAVA_SHA256`.
- Secrets `RQK_ESIGNER_USERNAME`, `RQK_ESIGNER_PASSWORD`,
  `RQK_ESIGNER_CREDENTIAL_ID`, and `RQK_ESIGNER_TOTP_SECRET`.

The adapter uses a native Java argument array rather than a batch/shell command,
suppresses vendor output that might contain credentials, signs a temporary
copy, verifies a valid timestamped signature from the exact publisher, then
replaces the build input. Real service integration and signature acceptance
remain pending; mock tests are not a signed-production result.

A valid new individual certificate does not guarantee that Windows SmartScreen
will immediately stop displaying reputation warnings. That is separate from a
valid, trusted Authenticode signature and a verified publisher.

## Why not the other obvious options?

- **Microsoft Artifact Signing (formerly Trusted Signing):** Microsoft's
  quickstart currently permits public-trust individual publishers only in the
  United States and Canada. UK organizations can qualify. Do not pay for an
  Azure signing account as a UK individual expecting it to work. If an existing
  registered organization is the intended publisher, reconsider this managed
  option; its Basic plan is listed at US $9.99 per month.
  Sources: [eligibility](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart),
  [service and price](https://azure.microsoft.com/en-us/products/artifact-signing).
- **SignPath Foundation:** this is a free option for qualifying open-source
  projects, not an automatically available certificate for any public GitHub
  repository. It requires an OSI-approved license and other project, release,
  security and build requirements. Keeper currently has no repository license
  file, so eligibility has not been established. Codex must not add a license
  or make a legal licensing decision for you merely to qualify. The signed
  publisher would be SignPath Foundation, under its policies.
  Sources: [terms](https://signpath.org/terms.html),
  [application](https://signpath.org/apply.html).

The older portable Keeper's Ed25519 signing key is separate. Keep it unchanged;
it is not a substitute for a trusted Windows code-signing certificate.
