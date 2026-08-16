# Charts

Static charts published at [charts.zurmely.com](https://charts.zurmely.com).

The home page is blank on purpose. Charts live under their own slugs:

| Slug | Chart |
| --- | --- |
| [`/cities`](https://charts.zurmely.com/cities/) | Cost of living vs. quality of life |

## Cities

A quadrant dashboard of 306 cities from
[Numbeo's current Quality of Life rankings](https://www.numbeo.com/quality-of-life/rankings_current.jsp).
Originally made by [Valerii Emelianov](https://www.linkedin.com/in/valemel/). Both axes are percentile ranks. Quality of life uses Numbeo's formula with its
price-linked terms (purchasing power and property-price-to-income) removed,
leaving safety, healthcare, traffic, pollution, and climate.

To regenerate `cities/data.js` after updating `cities/raw_numbeo.txt`:

```bash
python3 cities/build_data.py
```

No build step is required to serve the site. GitHub Pages publishes the `main`
branch from the repository root, with the custom domain `charts.zurmely.com`.
