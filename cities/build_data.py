"""Turns the scraped Numbeo rankings table into the data.js file the page loads."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw_numbeo.txt"
OUT = ROOT / "data.js"

COUNTRY_CONTINENT = {
    # Europe
    "Albania": "Europe", "Austria": "Europe", "Belarus": "Europe", "Belgium": "Europe",
    "Bosnia And Herzegovina": "Europe", "Bulgaria": "Europe", "Croatia": "Europe",
    "Cyprus": "Europe", "Czech Republic": "Europe", "Denmark": "Europe", "Estonia": "Europe",
    "Finland": "Europe", "France": "Europe", "Germany": "Europe", "Greece": "Europe",
    "Hungary": "Europe", "Iceland": "Europe", "Ireland": "Europe", "Italy": "Europe",
    "Latvia": "Europe", "Lithuania": "Europe", "Luxembourg": "Europe", "Moldova": "Europe",
    "Netherlands": "Europe", "North Macedonia": "Europe", "Norway": "Europe", "Poland": "Europe",
    "Portugal": "Europe", "Romania": "Europe", "Russia": "Europe", "Serbia": "Europe",
    "Slovakia": "Europe", "Slovenia": "Europe", "Spain": "Europe", "Sweden": "Europe",
    "Switzerland": "Europe", "Ukraine": "Europe", "United Kingdom": "Europe",
    # Asia
    "Armenia": "Asia", "Azerbaijan": "Asia", "Bangladesh": "Asia",
    "China": "Asia", "Georgia": "Asia", "Hong Kong (China)": "Asia", "India": "Asia",
    "Indonesia": "Asia", "Japan": "Asia",
    "Kazakhstan": "Asia", "Malaysia": "Asia",
    "Nepal": "Asia", "Pakistan": "Asia", "Philippines": "Asia",
    "Singapore": "Asia", "South Korea": "Asia", "Sri Lanka": "Asia",
    "Taiwan": "Asia", "Thailand": "Asia",
    "Uzbekistan": "Asia", "Vietnam": "Asia",
    # Middle East
    "Bahrain": "Middle East", "Egypt": "Middle East", "Iran": "Middle East",
    "Israel": "Middle East", "Jordan": "Middle East", "Kuwait": "Middle East",
    "Lebanon": "Middle East", "Oman": "Middle East", "Qatar": "Middle East",
    "Saudi Arabia": "Middle East", "Turkey": "Middle East",
    "United Arab Emirates": "Middle East",
    # Africa
    "Kenya": "Africa", "Morocco": "Africa", "Namibia": "Africa",
    "Nigeria": "Africa", "South Africa": "Africa", "Tunisia": "Africa",
    # North America (incl. Central America & Caribbean)
    "Canada": "North America", "Costa Rica": "North America", "Dominican Republic": "North America",
    "Mexico": "North America", "Panama": "North America", "Puerto Rico": "North America",
    "United States": "North America",
    # South America
    "Argentina": "South America", "Brazil": "South America", "Chile": "South America",
    "Colombia": "South America", "Ecuador": "South America", "Peru": "South America",
    "Uruguay": "South America", "Venezuela": "South America",
    # Oceania
    "Australia": "Oceania", "New Zealand": "Oceania",
}

# Cities in transcontinental countries that sit on the other side of the divide.
CITY_CONTINENT = {
    "Yekaterinburg": "Asia", "Novosibirsk": "Asia", "Omsk": "Asia", "Krasnoyarsk": "Asia",
    "Chelyabinsk": "Asia", "Tyumen": "Asia", "Vladivostok": "Asia", "Ufa": "Asia",
}


def percentiles(values):
    """Percentile rank (0-100) with ties averaged, matching Numbeo's own percentile framing."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg_rank = (i + j) / 2
        for k in range(i, j + 1):
            ranks[order[k]] = 100 * avg_rank / (len(values) - 1)
        i = j + 1
    return ranks


def parse():
    cities = []
    for line in RAW.read_text().splitlines():
        if not line.startswith("| |"):
            continue
        cells = [c.strip() for c in line.split("|")[1:-1]]
        name_full = cells[1]
        nums = [float(c) for c in cells[2:]]
        qol, purchasing, safety, health, col, price_income, traffic, pollution, climate = nums

        parts = [p.strip() for p in name_full.split(",")]
        country = parts[-1]
        city = parts[0]
        region = ", ".join(parts[1:-1])

        continent = CITY_CONTINENT.get(city) or COUNTRY_CONTINENT[country]

        # Numbeo's quality-of-life formula with its price-linked terms (purchasing power and
        # property-price-to-income) dropped, leaving only livability components.
        quality_raw = (
            safety / 2.0
            + health / 2.5
            - traffic / 2.0
            - pollution * 2.0 / 3.0
            + climate / 3.0
        )

        cities.append({
            "city": city,
            "region": region,
            "country": country,
            "continent": continent,
            "qualityRaw": round(quality_raw, 2),
            "col": col,
            "numbeoQol": qol,
            "safety": safety,
            "health": health,
            "traffic": traffic,
            "pollution": pollution,
            "climate": climate,
            "purchasing": purchasing,
            "priceIncome": price_income,
        })

    cost_pct = percentiles([c["col"] for c in cities])
    qual_pct = percentiles([c["qualityRaw"] for c in cities])
    for c, cp, qp in zip(cities, cost_pct, qual_pct):
        c["x"] = round(cp, 2)
        c["y"] = round(qp, 2)
        c["value"] = round(qp - cp, 2)

    cities.sort(key=lambda c: -c["value"])
    return cities


def main():
    cities = parse()
    payload = json.dumps(cities, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text(
        "// Generated by cities/build_data.py from Numbeo's current Quality of Life rankings.\n"
        "// Do not edit by hand.\n"
        f"const CITY_DATA = {payload};\n"
    )
    print(f"{len(cities)} cities written to {OUT.name}")
    for c in cities[:5] + cities[-5:]:
        print(f"  {c['city']:<20} {c['continent']:<15} cost {c['x']:5.1f}  quality {c['y']:5.1f}")


if __name__ == "__main__":
    main()
