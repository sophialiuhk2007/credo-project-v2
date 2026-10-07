# VeriTrust Issuer Portal

The issuer and verifier backend for **VeriTrust**, a verifiable-credentials platform built on
[Credo](https://github.com/openwallet-foundation/credo-ts) (OpenWallet Foundation). An organization uses
the portal to design credential templates, issue credentials to holders, and verify presentations. Each
credential can also be added to Apple Wallet.

It extends my earlier [academic-vc](https://github.com/sophialiuhk2007/academic-vc) project. That one only
handled diplomas and club memberships; this portal supports **any credential type** defined by a template.
The matching holder app is [VeriTrust Wallet](https://github.com/sophialiuhk2007/AwesomeProject)
(React Native, on the App Store as VeriTrust).

## Features

- **Template-driven credentials:** create, edit and delete credential types from the web UI. Each field
  can be marked selectively disclosable.
- **Issuance over OpenID4VCI:** the server issues SD-JWT VCs (`vc+sd-jwt`, ES256, `did:key` binding) using
  the pre-authorized-code flow and returns a credential-offer URL for the holder's wallet.
- **Selective disclosure:** holders reveal only the fields a verifier asks for.
- **Verification over OpenID4VP:** the server creates verification sessions and reports their results.
- **Apple Wallet:** each issued credential is also generated as a signed `.pkpass`
  ([passkit-generator](https://github.com/alexandercerutti/passkit-generator)).

## Stack

TypeScript · Node.js · Express · Credo (`@credo-ts/core`, `openid4vc`, `askar`) · SQLite · Docker · Fly.io

## Layout

```
src/
├── web_server.ts          Express API + portal UI (templates, issuance, verification)
├── issuer_config.ts       Credo issuer agent (Askar wallet, OpenID4VCI module)
├── issuer_main.ts         issuer + DID setup, credential offers
├── credentialMapper.ts    template → SD-JWT payload with disclosure frame
├── verifier_main.ts       OpenID4VP verifier agent
├── holder_*.ts            test holder agent
├── template_manager.ts    credential template storage
└── utils/generatePkpass.ts  Apple Wallet pass generation
public/                    portal front end
model/custom.pass/         Apple Wallet pass model
```

## Running locally

```bash
npm install
export ISSUER_WALLET_KEY=...  VERIFIER_WALLET_KEY=...  HOLDER_WALLET_KEY=...
npm run build && npm start      # http://localhost:3000
```

Apple Wallet signing requires your own Pass Type ID certificate. Put `signerCert.pem` and
`signerKey.pem` in `certs/`, or provide them through environment variables in production. They are
gitignored and must never be committed.
