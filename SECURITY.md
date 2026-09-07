# Security Policy

## Supported versions

`main` is the supported line of this repository.

## Reporting a vulnerability

Do **not** open a public GitHub issue for secrets, tokens, or exploitable bugs.

Email [non@nonarkara.org](mailto:non@nonarkara.org) with:

- what is affected
- how to reproduce
- impact, if you know it

Do not put raw secrets in the subject line. You should hear back within a few days. Please give time to rotate keys or ship a fix before public disclosure.

## Secrets

Provider keys belong in `.env.local` or the host dashboard — never in git, `VITE_*` variables, or a pull request. If you find a credential in this tree or in git history, email the address above.
