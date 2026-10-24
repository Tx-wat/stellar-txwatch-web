# README images

Screenshots and demo recordings referenced from the project [README](../../README.md).

## Required files

| File | What to capture |
|---|---|
| `dashboard.png` | `/dashboard` with at least three registered contracts across different networks |
| `add-contract.png` | `/contracts/new` with a contract ID, network and a few alert rules filled in |
| `contract-detail.png` | `/contracts/<id>` showing metadata, alert rules and webhook delivery history |
| `demo.gif` | Registering a contract on `/contracts/new`, then clicking **Test** to send a test webhook |

## Guidelines

- Use the **dark theme** (the app default) for every capture.
- Capture at a desktop width of **1280px**; crop browser chrome out of the image.
- Use Testnet contracts and placeholder webhook URLs — never real secrets or personal data.
- Keep each file **under 500KB**:
  - PNG: run through [`pngquant`](https://pngquant.org/) or [Squoosh](https://squoosh.app/).
  - GIF: keep it under ~15 seconds at 10–12 fps and 960px wide, then optimise with
    [`gifsicle -O3 --lossy=80`](https://www.lcdf.org/gifsicle/).
- Check sizes before committing:

  ```bash
  find docs/images -type f \( -name '*.png' -o -name '*.gif' \) -size +500k
  ```

  The command should print nothing.
