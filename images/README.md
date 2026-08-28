# Product photos

`index.html` loads the colour-variant photos from this directory using
repo-relative paths, so Vercel serves them from the deployment itself.

Four files are required, one per colour variant:

| File | Variant | Swatch |
| --- | --- | --- |
| `gray.jpg` | Slate Gray | `#64748b` |
| `black.jpg` | Midnight Black | `#1e293b` |
| `blue.jpg` | Ocean Blue | `#1d4ed8` |
| `red.jpg` | Wine Red | `#991b1b` |

Use square images (1000 × 1000 works well) on a white background — the
preview renders at up to 480px wide and the cart thumbnails are square.

Any file that is missing falls back to a labelled colour swatch rather than a
broken-image icon, so the storefront stays presentable while a photo is
pending. Filenames are matched exactly and are case-sensitive on Vercel.

To change a filename, update the `colorImages` map near the top of the
`<script>` block in `index.html` to match.
