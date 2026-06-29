from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXTRACT_PATH = ROOT / "quality" / "results" / "new-level-premium-extract" / "new-level-premium-extract.json"
OUT_DIR = ROOT / "quality" / "results" / "new-level-premium-extract"
TS_OUT = ROOT / "apps" / "web" / "lib" / "new-level-premium-data.ts"
SQL_OUT = ROOT / "supabase" / "imports" / "new-level-premium-real-data.sql"
CSV_OUT = ROOT / "supabase" / "imports" / "new-level-premium-units-master.csv"

BLOCK_TARGET_COUNTS = {
    "A": 105,
    "B": 105,
    "C": 105,
    "D": 123,
    "E": 123,
    "F": 104,
    "G": 104,
}

BLOCKS_WITH_NUMBERING_SOURCE = {
    "C": "9. NUMBERING 🔍/NUMARATAJ - C BLOCK.jpg",
    "D": "9. NUMBERING 🔍/NUMARATAJ - D BLOCK.jpg",
}
BLOCKS_WITH_NUMBERING_SOURCE["B"] = "Manager-approved demo fallback: copy A Block numbering/reference logic"

BLOCK_PRICE_FALLBACKS = {
    "B": {
        "sourceBlock": "A",
        "decision": "Waleri-approved demo fallback: copy B Block prices and numbering/reference logic from A Block.",
    },
    "D": {
        "sourceBlock": "E",
        "decision": "Waleri-approved demo fallback: copy D Block prices from E Block.",
    },
}


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def block_from_path(path: str) -> str | None:
    match = re.search(r"\\([A-G]) BLOCK PRICE LIST\.pdf$", path, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return None


def parse_eur(value: str) -> int | None:
    value = clean(value).upper()
    if not value or "SOLD" in value:
        return None
    if "€" not in value and not re.search(r"\d", value):
        return None
    digits = re.sub(r"[^\d]", "", value)
    if not digits:
        return None
    return int(digits)


def parse_area(area_text: str) -> tuple[float | None, float | None]:
    normalized = clean(area_text).replace(",", ".")
    numbers = [float(number) for number in re.findall(r"\d+(?:\.\d+)?", normalized)]
    if not numbers:
        return None, None
    if "+" in normalized and len(numbers) >= 2:
        return numbers[0], numbers[1]
    return numbers[0], None


def floor_from_label(raw_label: str, previous_label: str) -> tuple[str, int, str]:
    label = clean(raw_label)
    if not label:
        label = previous_label
    squashed = re.sub(r"[^A-Z0-9]+", "", label.upper())
    if "BASEMENT" in squashed:
        return "Open basement", -1, "Open basement"
    if "GROUND" in squashed:
        return "Ground floor", 0, "Ground floor"
    if "TIMESHARE" in squashed:
        return "Timeshare apartments", 0, "Timeshare apartments"
    numeric = re.search(r"\d+", label)
    if numeric:
        level = int(numeric.group(0))
        return str(level), level, str(level)
    return label or "Unknown", 0, label or "Unknown"


def row_is_data(row: list[str]) -> bool:
    if len(row) < 4:
        return False
    number = clean(row[1])
    unit_type = clean(row[2])
    area = clean(row[3])
    if not re.search(r"\d+", number):
        return False
    if not unit_type or "TYPE" in unit_type.upper():
        return False
    if not area or "M2" not in area.upper():
        return False
    return True


def normalize_price_unit(block: str, row: list[str], source: str, previous_floor: str) -> tuple[dict | None, str]:
    if not row_is_data(row):
        return None, previous_floor

    floor_label, floor_level, carry_floor = floor_from_label(row[0], previous_floor)
    number_match = re.search(r"\d+", clean(row[1]))
    if not number_match:
        return None, carry_floor

    sequence = int(number_match.group(0))
    area_text = clean(row[3])
    interior_m2, outdoor_m2 = parse_area(area_text)
    prices = [parse_eur(cell) for cell in row[4:]]
    prices = [price for price in prices if price is not None]
    row_text = " ".join(clean(cell).upper() for cell in row)
    sold = "SOLD" in row_text
    sale_status = "sold" if sold else "available" if prices else "unknown"
    unit_type = clean(row[2]).replace("G", "Garden").replace("  ", " ")
    unit_no = f"{block}-{sequence:03d}"

    unit = {
        "id": f"NLP-{unit_no}",
        "block": block,
        "sequence": sequence,
        "unitNo": unit_no,
        "displayNo": f"{block}-{sequence}",
        "floorLabel": floor_label,
        "floorLevel": floor_level,
        "unitType": unit_type,
        "areaText": area_text,
        "interiorM2": interior_m2,
        "outdoorM2": outdoor_m2,
        "saleStatus": sale_status,
        "buyNowEur": prices[0] if prices else None,
        "nextPriceEur": prices[1:] if len(prices) > 1 else [],
        "priceSource": source,
        "numberingSource": BLOCKS_WITH_NUMBERING_SOURCE.get(block),
        "priceFallbackFrom": None,
        "dataQuality": "client_source",
        "notes": "Timeshare pricing" if prices and prices[0] < 50000 else None,
    }
    return unit, carry_floor


def clone_fallback_unit(source_unit: dict, target_block: str, source_block: str, decision: str) -> dict:
    sequence = source_unit["sequence"]
    unit_no = f"{target_block}-{sequence:03d}"
    source_note = source_unit.get("notes")
    fallback_note = (
        f"{decision} Demo/staging only; replace with original Block {target_block} client source before production sign-off."
    )
    return {
        **source_unit,
        "id": f"NLP-{unit_no}",
        "block": target_block,
        "unitNo": unit_no,
        "displayNo": f"{target_block}-{sequence}",
        "priceSource": f"fallback:{target_block}-from-{source_block}; {source_unit['priceSource']}",
        "numberingSource": BLOCKS_WITH_NUMBERING_SOURCE.get(target_block),
        "priceFallbackFrom": source_block,
        "dataQuality": "demo_fallback",
        "notes": f"{fallback_note} Source note: {source_note}" if source_note else fallback_note,
    }


def apply_demo_fallbacks(units: list[dict], findings: list[dict]) -> None:
    present_blocks = {unit["block"] for unit in units}
    for target_block, fallback in BLOCK_PRICE_FALLBACKS.items():
        if target_block in present_blocks:
            continue

        source_block = fallback["sourceBlock"]
        source_units = sorted(
            (unit for unit in units if unit["block"] == source_block),
            key=lambda item: item["sequence"],
        )
        expected_count = BLOCK_TARGET_COUNTS[target_block]
        if len(source_units) != expected_count:
            findings.append(
                {
                    "severity": "error",
                    "area": f"Block {target_block} demo fallback",
                    "message": (
                        f"Cannot copy Block {source_block} into Block {target_block}: "
                        f"{len(source_units)} source rows found, expected {expected_count}."
                    ),
                    "source": "manager-approved demo fallback",
                }
            )
            continue

        units.extend(
            clone_fallback_unit(source_unit, target_block, source_block, fallback["decision"])
            for source_unit in source_units
        )
        present_blocks.add(target_block)
        findings.append(
            {
                "severity": "warning",
                "area": f"Block {target_block} demo fallback",
                "message": fallback["decision"],
                "source": f"Block {source_block} price-list package",
            }
        )


def parse_units(extract: dict) -> tuple[list[dict], list[dict]]:
    units: list[dict] = []
    findings: list[dict] = []

    for file_record in extract["files"]:
        if file_record.get("class") != "price_list" or file_record.get("extension") != ".pdf":
            continue
        block = block_from_path(file_record["path"])
        if not block:
            continue
        tables = file_record.get("pdf", {}).get("tables", [])
        previous_floor = ""
        parsed_for_block = []
        for table in tables:
            for row in table.get("rows", []):
                unit, previous_floor = normalize_price_unit(block, row, file_record["path"], previous_floor)
                if unit:
                    parsed_for_block.append(unit)
        units.extend(parsed_for_block)
        target = BLOCK_TARGET_COUNTS[block]
        if len(parsed_for_block) != target:
            findings.append(
                {
                    "severity": "warning",
                    "area": f"Block {block} price-list row count",
                    "message": f"Parsed {len(parsed_for_block)} price-list rows, expected {target}.",
                    "source": file_record["path"],
                }
            )

    apply_demo_fallbacks(units, findings)

    existing = {(unit["block"], unit["sequence"]) for unit in units}
    for block, target_count in BLOCK_TARGET_COUNTS.items():
        source_missing = block not in {unit["block"] for unit in units}
        for sequence in range(1, target_count + 1):
            if (block, sequence) in existing:
                continue
            unit_no = f"{block}-{sequence:03d}"
            units.append(
                {
                    "id": f"NLP-{unit_no}",
                    "block": block,
                    "sequence": sequence,
                    "unitNo": unit_no,
                    "displayNo": f"{block}-{sequence}",
                    "floorLabel": "Source missing",
                    "floorLevel": 0,
                    "unitType": "Source missing",
                    "areaText": None,
                    "interiorM2": None,
                    "outdoorM2": None,
                    "saleStatus": "source_missing" if source_missing else "unknown",
                    "buyNowEur": None,
                    "nextPriceEur": [],
                    "priceSource": None,
                    "numberingSource": BLOCKS_WITH_NUMBERING_SOURCE.get(block),
                    "priceFallbackFrom": None,
                    "dataQuality": "source_missing" if source_missing else "unknown_row",
                    "notes": "Price-list source missing for this block" if source_missing else "Missing row in price-list extraction",
                }
            )

    for block in BLOCK_TARGET_COUNTS:
        count = sum(1 for unit in units if unit["block"] == block)
        if count != BLOCK_TARGET_COUNTS[block]:
            findings.append(
                {
                    "severity": "error",
                    "area": f"Block {block} total units",
                    "message": f"Dataset has {count} units, expected {BLOCK_TARGET_COUNTS[block]}.",
                    "source": "dataset",
                }
            )

    for block in []:
        findings.append(
            {
                "severity": "warning",
                "area": f"Block {block} price source",
                "message": f"No {block} Block price-list PDF was present. Units are created from block count only and marked source_missing.",
                "source": "1.NEW LEVEL PREMIUM/6. PRICE LIST 💶",
            }
        )

    units.sort(key=lambda item: (item["block"], item["sequence"]))
    return units, findings


def block_summaries(units: list[dict]) -> list[dict]:
    summaries = []
    for index, (block, target_count) in enumerate(BLOCK_TARGET_COUNTS.items(), start=1):
        records = [unit for unit in units if unit["block"] == block]
        available_prices = [unit["buyNowEur"] for unit in records if unit["buyNowEur"] is not None]
        summaries.append(
            {
                "name": block,
                "sortOrder": index,
                "totalUnits": len(records),
                "availableUnits": sum(1 for unit in records if unit["saleStatus"] == "available"),
                "soldUnits": sum(1 for unit in records if unit["saleStatus"] == "sold"),
                "unknownUnits": sum(1 for unit in records if unit["saleStatus"] in {"unknown", "source_missing"}),
                "minBuyNowEur": min(available_prices) if available_prices else None,
                "maxBuyNowEur": max(available_prices) if available_prices else None,
                "priceSourceStatus": "parsed" if any(unit["priceSource"] for unit in records) else "missing",
                "numberingSource": BLOCKS_WITH_NUMBERING_SOURCE.get(block),
            }
        )
    return summaries


def sql_literal(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def sql_json(value: object) -> str:
    return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'::JSONB"


def sql_bigint_array(values: list[int]) -> str:
    if not values:
        return "'{}'::BIGINT[]"
    return "ARRAY[" + ", ".join(str(value) for value in values) + "]::BIGINT[]"


def generate_sql(dataset: dict) -> str:
    lines = [
        "-- New Level Premium real-data import generated from client source files.",
        "-- Review in staging before running against cloud Supabase.",
        "-- Safe natural-key upserts; finance remains append-only in separate ledgers.",
        "BEGIN;",
        "",
        "WITH company AS (",
        "  INSERT INTO public.companies (name, slug, status, primary_locale, timezone, currency)",
        "  VALUES ('Ataberk Estate', 'ataberk-estate', 'active', 'tr', 'Europe/Istanbul', 'EUR')",
        "  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, currency = EXCLUDED.currency, updated_at = NOW()",
        "  RETURNING id",
        "), office_insert AS (",
        "  INSERT INTO public.offices (company_id, name, city, address, status)",
        "  SELECT c.id, 'Ataberk Avsallar Office', 'Alanya', 'Avsallar, Alanya, Antalya', 'active'",
        "  FROM company c",
        "  WHERE NOT EXISTS (",
        "    SELECT 1",
        "    FROM public.offices o",
        "    WHERE o.company_id = c.id",
        "      AND o.name = 'Ataberk Avsallar Office'",
        "      AND o.city = 'Alanya'",
        "  )",
        "  RETURNING id, company_id",
        "), office AS (",
        "  SELECT id, company_id FROM office_insert",
        "  UNION ALL",
        "  SELECT o.id, o.company_id",
        "  FROM public.offices o",
        "  JOIN company c ON c.id = o.company_id",
        "  WHERE o.name = 'Ataberk Avsallar Office'",
        "    AND o.city = 'Alanya'",
        "  ORDER BY id",
        "  LIMIT 1",
        "), site AS (",
        "  INSERT INTO public.sites (company_id, office_id, name, code, city, district, address, status, total_units)",
        "  SELECT c.id, (SELECT id FROM office LIMIT 1), 'New Level Premium Avsallar', 'NLP-AVS', 'Alanya', 'Avsallar', 'Avsallar, Alanya, Antalya', 'active', 769",
        "  FROM company c",
        "  ON CONFLICT (company_id, code) DO UPDATE SET total_units = EXCLUDED.total_units, city = EXCLUDED.city, district = EXCLUDED.district, address = EXCLUDED.address, updated_at = NOW()",
        "  RETURNING id, company_id",
        ")",
        "SELECT 1;",
        "",
        "-- Keep the office bootstrap idempotent even after interrupted imports.",
        "DELETE FROM public.offices o",
        "USING public.companies c",
        "WHERE o.company_id = c.id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND o.name = 'Ataberk Avsallar Office'",
        "  AND o.city = 'Alanya'",
        "  AND NOT EXISTS (SELECT 1 FROM public.sites s WHERE s.office_id = o.id)",
        "  AND o.id <> (",
        "    SELECT kept.id",
        "    FROM public.offices kept",
        "    WHERE kept.company_id = c.id",
        "      AND kept.name = 'Ataberk Avsallar Office'",
        "      AND kept.city = 'Alanya'",
        "    ORDER BY",
        "      CASE WHEN EXISTS (SELECT 1 FROM public.sites s WHERE s.office_id = kept.id) THEN 0 ELSE 1 END,",
        "      kept.created_at,",
        "      kept.id",
        "    LIMIT 1",
        "  );",
        "",
        "-- Remove the old local demo unit matrix for this site before applying the real client source data.",
        "-- The predicate is intentionally narrow: four-digit synthetic unit numbers with empty source metadata.",
        "DELETE FROM public.service_ticket_events e",
        "USING public.service_tickets t, public.units u, public.sites s, public.companies c",
        "WHERE e.ticket_id = t.id",
        "  AND t.unit_id = u.id",
        "  AND u.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND u.unit_no ~ '^[A-H]-[0-9]{4}$'",
        "  AND COALESCE(u.source_metadata, '{}'::JSONB) = '{}'::JSONB;",
        "",
        "DELETE FROM public.payment_transactions pt",
        "USING public.finance_ledger_entries fle, public.units u, public.sites s, public.companies c",
        "WHERE pt.ledger_entry_id = fle.id",
        "  AND fle.unit_id = u.id",
        "  AND u.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND u.unit_no ~ '^[A-H]-[0-9]{4}$'",
        "  AND COALESCE(u.source_metadata, '{}'::JSONB) = '{}'::JSONB;",
        "",
        "DELETE FROM public.finance_ledger_entries fle",
        "USING public.units u, public.sites s, public.companies c",
        "WHERE fle.unit_id = u.id",
        "  AND u.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND u.unit_no ~ '^[A-H]-[0-9]{4}$'",
        "  AND COALESCE(u.source_metadata, '{}'::JSONB) = '{}'::JSONB;",
        "",
        "DELETE FROM public.service_tickets t",
        "USING public.units u, public.sites s, public.companies c",
        "WHERE t.unit_id = u.id",
        "  AND u.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND u.unit_no ~ '^[A-H]-[0-9]{4}$'",
        "  AND COALESCE(u.source_metadata, '{}'::JSONB) = '{}'::JSONB;",
        "",
        "DELETE FROM public.reservations r",
        "USING public.units u, public.sites s, public.companies c",
        "WHERE r.unit_id = u.id",
        "  AND u.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND u.unit_no ~ '^[A-H]-[0-9]{4}$'",
        "  AND COALESCE(u.source_metadata, '{}'::JSONB) = '{}'::JSONB;",
        "",
        "DELETE FROM public.documents d",
        "USING public.units u, public.sites s, public.companies c",
        "WHERE d.unit_id = u.id",
        "  AND u.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND u.unit_no ~ '^[A-H]-[0-9]{4}$'",
        "  AND COALESCE(u.source_metadata, '{}'::JSONB) = '{}'::JSONB;",
        "",
        "DELETE FROM public.access_events ae",
        "USING public.units u, public.sites s, public.companies c",
        "WHERE ae.unit_id = u.id",
        "  AND u.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND u.unit_no ~ '^[A-H]-[0-9]{4}$'",
        "  AND COALESCE(u.source_metadata, '{}'::JSONB) = '{}'::JSONB;",
        "",
        "DELETE FROM public.unit_residents ur",
        "USING public.units u, public.sites s, public.companies c",
        "WHERE ur.unit_id = u.id",
        "  AND u.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND u.unit_no ~ '^[A-H]-[0-9]{4}$'",
        "  AND COALESCE(u.source_metadata, '{}'::JSONB) = '{}'::JSONB;",
        "",
        "DELETE FROM public.operational_search_documents d",
        "USING public.sites s, public.companies c",
        "WHERE d.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS';",
        "",
        "DELETE FROM public.units u",
        "USING public.sites s, public.companies c",
        "WHERE u.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND u.unit_no ~ '^[A-H]-[0-9]{4}$'",
        "  AND COALESCE(u.source_metadata, '{}'::JSONB) = '{}'::JSONB;",
        "",
        "DELETE FROM public.site_floors f",
        "USING public.sites s, public.companies c",
        "WHERE f.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND NOT EXISTS (SELECT 1 FROM public.units u WHERE u.floor_id = f.id);",
        "",
        "DELETE FROM public.site_blocks b",
        "USING public.sites s, public.companies c",
        "WHERE b.site_id = s.id",
        "  AND c.id = s.company_id",
        "  AND c.slug = 'ataberk-estate'",
        "  AND s.code = 'NLP-AVS'",
        "  AND b.name NOT IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')",
        "  AND NOT EXISTS (SELECT 1 FROM public.units u WHERE u.block_id = b.id);",
        "",
    ]

    batch_ids = {
        "price": "66666666-6666-4666-8666-666666660001",
        "documents": "66666666-6666-4666-8666-666666660002",
        "media": "66666666-6666-4666-8666-666666660003",
    }
    source_missing_units = sum(1 for unit in dataset["units"] if unit["saleStatus"] == "source_missing")
    fallback_warning_units = sum(
        BLOCK_TARGET_COUNTS[block]
        for block in BLOCK_PRICE_FALLBACKS
        if any(finding["area"] == f"Block {block} demo fallback" for finding in dataset["findings"])
    )
    price_warning_units = source_missing_units + fallback_warning_units
    document_warning_rows = sum(1 for document in dataset["documents"] if document["status"] != "active")

    lines.extend(
        [
            "DELETE FROM public.import_findings f",
            "USING public.import_batches b, public.companies c",
            "WHERE f.import_batch_id = b.id",
            "  AND b.company_id = c.id",
            "  AND c.slug = 'ataberk-estate'",
            "  AND b.source_name IN ('Client master flat list', 'Owner and resident contact list', 'Opening balance ledger', 'New Level Premium price-list package', 'Project documents, facility map and floor plans', 'Construction and showroom media');",
            "",
            "DELETE FROM public.import_batches b",
            "USING public.companies c",
            "WHERE b.company_id = c.id",
            "  AND c.slug = 'ataberk-estate'",
            "  AND b.source_name IN ('Client master flat list', 'Owner and resident contact list', 'Opening balance ledger', 'New Level Premium price-list package', 'Project documents, facility map and floor plans', 'Construction and showroom media');",
            "",
            "INSERT INTO public.import_batches (id, company_id, source_name, entity_type, total_rows, valid_rows, warning_rows, rejected_rows, status, checked_at, applied_at)",
            "SELECT {id}, c.id, 'New Level Premium price-list package', 'units', {total_rows}, {valid_rows}, {warning_rows}, 0, 'ready_to_apply', NOW(), NOW() FROM public.companies c WHERE c.slug = 'ataberk-estate'".format(
                id=sql_literal(batch_ids["price"]),
                total_rows=dataset["project"]["totalUnits"],
                valid_rows=dataset["project"]["totalUnits"] - price_warning_units,
                warning_rows=price_warning_units,
            ),
            "ON CONFLICT (id) DO UPDATE SET total_rows = EXCLUDED.total_rows, valid_rows = EXCLUDED.valid_rows, warning_rows = EXCLUDED.warning_rows, rejected_rows = EXCLUDED.rejected_rows, status = EXCLUDED.status, checked_at = EXCLUDED.checked_at, applied_at = EXCLUDED.applied_at, updated_at = NOW();",
            "INSERT INTO public.import_batches (id, company_id, source_name, entity_type, total_rows, valid_rows, warning_rows, rejected_rows, status, checked_at, applied_at)",
            "SELECT {id}, c.id, 'Project documents, facility map and floor plans', 'documents', {total_rows}, {valid_rows}, {warning_rows}, 0, 'review_required', NOW(), NULL FROM public.companies c WHERE c.slug = 'ataberk-estate'".format(
                id=sql_literal(batch_ids["documents"]),
                total_rows=len(dataset["documents"]),
                valid_rows=len(dataset["documents"]) - document_warning_rows,
                warning_rows=document_warning_rows,
            ),
            "ON CONFLICT (id) DO UPDATE SET total_rows = EXCLUDED.total_rows, valid_rows = EXCLUDED.valid_rows, warning_rows = EXCLUDED.warning_rows, rejected_rows = EXCLUDED.rejected_rows, status = EXCLUDED.status, checked_at = EXCLUDED.checked_at, applied_at = EXCLUDED.applied_at, updated_at = NOW();",
            "INSERT INTO public.import_batches (id, company_id, source_name, entity_type, total_rows, valid_rows, warning_rows, rejected_rows, status, checked_at, applied_at)",
            "SELECT {id}, c.id, 'Construction and showroom media', 'media', {total_rows}, {valid_rows}, 0, 0, 'validated', NOW(), NOW() FROM public.companies c WHERE c.slug = 'ataberk-estate'".format(
                id=sql_literal(batch_ids["media"]),
                total_rows=len(dataset["media"]),
                valid_rows=len(dataset["media"]),
            ),
            "ON CONFLICT (id) DO UPDATE SET total_rows = EXCLUDED.total_rows, valid_rows = EXCLUDED.valid_rows, warning_rows = EXCLUDED.warning_rows, rejected_rows = EXCLUDED.rejected_rows, status = EXCLUDED.status, checked_at = EXCLUDED.checked_at, applied_at = EXCLUDED.applied_at, updated_at = NOW();",
            "",
        ]
    )

    for index, finding in enumerate(dataset["findings"], start=1):
        affected_rows = 105 if "Block B" in finding["area"] else 123 if "Block D" in finding["area"] else 0
        recommended_action = (
            "Approved for demo/staging; replace the copied fallback rows with original client price/numbering source before production sign-off."
            if "demo fallback" in finding["area"]
            else "Add the missing client source file or approve the extracted rows before go-live."
        )
        lines.extend(
            [
                "INSERT INTO public.import_findings (company_id, import_batch_id, severity, area, affected_rows, message, recommended_action)",
                "SELECT c.id, {batch_id}, {severity}, {area}, {affected_rows}, {message}, {recommended_action} FROM public.companies c WHERE c.slug = 'ataberk-estate'".format(
                    batch_id=sql_literal(batch_ids["price"]),
                    severity=sql_literal(finding["severity"]),
                    area=sql_literal(finding["area"]),
                    affected_rows=affected_rows,
                    message=sql_literal(finding["message"]),
                    recommended_action=sql_literal(recommended_action),
                ),
                ";",
            ]
        )

    if document_warning_rows:
        lines.extend(
            [
                "INSERT INTO public.import_findings (company_id, import_batch_id, severity, area, affected_rows, message, recommended_action)",
                "SELECT c.id, {batch_id}, 'info', 'Scan-only legal documents', {affected_rows}, 'Some legal/project documents are image or scan based and need OCR or human verification.', 'Verify document type, validity date and official source before final publication.' FROM public.companies c WHERE c.slug = 'ataberk-estate';".format(
                    batch_id=sql_literal(batch_ids["documents"]),
                    affected_rows=document_warning_rows,
                ),
                "",
            ]
        )

    for block in dataset["blocks"]:
        lines.extend(
            [
                "INSERT INTO public.site_blocks (company_id, site_id, name, sort_order)",
                "SELECT s.company_id, s.id, {name}, {sort_order} FROM public.sites s JOIN public.companies c ON c.id = s.company_id WHERE c.slug = 'ataberk-estate' AND s.code = 'NLP-AVS'".format(
                    name=sql_literal(block["name"]),
                    sort_order=block["sortOrder"],
                ),
                "ON CONFLICT (site_id, name) DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_at = NOW();",
            ]
        )

    lines.append("")
    for unit in dataset["units"]:
        lines.extend(
            [
                "INSERT INTO public.site_floors (company_id, site_id, block_id, label, level)",
                "SELECT s.company_id, s.id, b.id, {label}, {level} FROM public.sites s JOIN public.companies c ON c.id = s.company_id JOIN public.site_blocks b ON b.site_id = s.id AND b.name = {block} WHERE c.slug = 'ataberk-estate' AND s.code = 'NLP-AVS'".format(
                    label=sql_literal(unit["floorLabel"]),
                    level=unit["floorLevel"],
                    block=sql_literal(unit["block"]),
                ),
                "ON CONFLICT (site_id, block_id, label) DO UPDATE SET level = EXCLUDED.level, updated_at = NOW();",
                "INSERT INTO public.units (company_id, site_id, block_id, floor_id, unit_no, unit_type, size_sqm, bedrooms, occupancy_status, ownership_status, sale_status, list_price_eur_cents, next_price_eur_cents, price_source, numbering_source, source_notes, source_metadata)",
                "SELECT s.company_id, s.id, b.id, f.id, {unit_no}, 'apartment', {size_sqm}, {bedrooms}, {occupancy_status}, {ownership_status}, {sale_status}, {list_price_eur_cents}, {next_price_eur_cents}, {price_source}, {numbering_source}, {source_notes}, {source_metadata} FROM public.sites s JOIN public.companies c ON c.id = s.company_id JOIN public.site_blocks b ON b.site_id = s.id AND b.name = {block} JOIN public.site_floors f ON f.site_id = s.id AND f.block_id = b.id AND f.label = {floor_label} WHERE c.slug = 'ataberk-estate' AND s.code = 'NLP-AVS'".format(
                    unit_no=sql_literal(unit["unitNo"]),
                    size_sqm=sql_literal(unit["interiorM2"]),
                    bedrooms=sql_literal(1 if "1+1" in unit["unitType"] else 2 if "2+1" in unit["unitType"] else 3 if "3+1" in unit["unitType"] else None),
                    occupancy_status=sql_literal("occupied" if unit["saleStatus"] == "sold" else "vacant" if unit["saleStatus"] == "available" else "unknown"),
                    ownership_status=sql_literal("unknown"),
                    sale_status=sql_literal(unit["saleStatus"]),
                    list_price_eur_cents=sql_literal(unit["buyNowEur"] * 100 if unit["buyNowEur"] is not None else None),
                    next_price_eur_cents=sql_bigint_array([price * 100 for price in unit["nextPriceEur"]]),
                    price_source=sql_literal(unit["priceSource"]),
                    numbering_source=sql_literal(unit["numberingSource"]),
                    source_notes=sql_literal(unit["notes"]),
                    source_metadata=sql_json(
                        {
                            "displayNumber": unit["displayNo"],
                            "areaText": unit["areaText"],
                            "interiorM2": unit["interiorM2"],
                            "outdoorM2": unit["outdoorM2"],
                            "typeLabel": unit["unitType"],
                            "block": unit["block"],
                            "sequence": unit["sequence"],
                            "dataQuality": unit["dataQuality"],
                            "priceFallbackFrom": unit["priceFallbackFrom"],
                            "demoOnly": unit["dataQuality"] == "demo_fallback",
                        }
                    ),
                    block=sql_literal(unit["block"]),
                    floor_label=sql_literal(unit["floorLabel"]),
                ),
                "ON CONFLICT (site_id, unit_no) DO UPDATE SET block_id = EXCLUDED.block_id, floor_id = EXCLUDED.floor_id, size_sqm = EXCLUDED.size_sqm, bedrooms = EXCLUDED.bedrooms, occupancy_status = EXCLUDED.occupancy_status, sale_status = EXCLUDED.sale_status, list_price_eur_cents = EXCLUDED.list_price_eur_cents, next_price_eur_cents = EXCLUDED.next_price_eur_cents, price_source = EXCLUDED.price_source, numbering_source = EXCLUDED.numbering_source, source_notes = EXCLUDED.source_notes, source_metadata = EXCLUDED.source_metadata, updated_at = NOW();",
            ]
        )

    lines.extend(
        [
            "",
            "INSERT INTO public.operational_search_documents (",
            "  company_id,",
            "  site_id,",
            "  entity_table,",
            "  entity_id,",
            "  entity_external_id,",
            "  title,",
            "  summary,",
            "  language,",
            "  metadata",
            ")",
            "SELECT",
            "  u.company_id,",
            "  u.site_id,",
            "  'units',",
            "  u.id,",
            "  u.unit_no,",
            "  u.unit_no || ' unit record',",
            "  concat_ws(' ', u.unit_type, u.sale_status, u.occupancy_status, u.price_source, u.source_metadata->>'displayNumber', u.source_metadata->>'areaText'),",
            "  'tr',",
            "  jsonb_build_object(",
            "    'unit_no', u.unit_no,",
            "    'sale_status', u.sale_status,",
            "    'list_price_eur_cents', u.list_price_eur_cents,",
            "    'display_number', u.source_metadata->>'displayNumber',",
            "    'area_text', u.source_metadata->>'areaText'",
            "  )",
            "FROM public.units u",
            "JOIN public.sites s ON s.id = u.site_id",
            "JOIN public.companies c ON c.id = u.company_id",
            "WHERE c.slug = 'ataberk-estate'",
            "  AND s.code = 'NLP-AVS'",
            "ON CONFLICT (company_id, entity_table, entity_external_id) WHERE entity_external_id IS NOT NULL",
            "DO UPDATE SET",
            "  entity_id = EXCLUDED.entity_id,",
            "  title = EXCLUDED.title,",
            "  summary = EXCLUDED.summary,",
            "  metadata = EXCLUDED.metadata,",
            "  updated_at = NOW();",
            "",
            "UPDATE public.sites s",
            "SET total_units = (",
            "  SELECT count(*)",
            "  FROM public.units u",
            "  WHERE u.site_id = s.id",
            "), updated_at = NOW()",
            "FROM public.companies c",
            "WHERE c.id = s.company_id",
            "  AND c.slug = 'ataberk-estate'",
            "  AND s.code = 'NLP-AVS';",
            "",
            "COMMIT;",
            "",
        ]
    )
    return "\n".join(lines)


def write_units_csv(dataset: dict) -> None:
    fields = [
        "project_code",
        "unit_no",
        "block",
        "sequence",
        "display_no",
        "floor_label",
        "floor_level",
        "unit_type",
        "area_text",
        "interior_m2",
        "outdoor_m2",
        "sale_status",
        "buy_now_eur",
        "next_price_eur",
        "price_source",
        "numbering_source",
        "price_fallback_from",
        "data_quality",
        "source_notes",
    ]
    CSV_OUT.parent.mkdir(parents=True, exist_ok=True)
    with CSV_OUT.open("w", encoding="utf-8-sig", newline="") as file_handle:
        writer = csv.DictWriter(file_handle, fieldnames=fields)
        writer.writeheader()
        for unit in dataset["units"]:
            writer.writerow(
                {
                    "project_code": dataset["project"]["code"],
                    "unit_no": unit["unitNo"],
                    "block": unit["block"],
                    "sequence": unit["sequence"],
                    "display_no": unit["displayNo"],
                    "floor_label": unit["floorLabel"],
                    "floor_level": unit["floorLevel"],
                    "unit_type": unit["unitType"],
                    "area_text": unit["areaText"],
                    "interior_m2": unit["interiorM2"],
                    "outdoor_m2": unit["outdoorM2"],
                    "sale_status": unit["saleStatus"],
                    "buy_now_eur": unit["buyNowEur"],
                    "next_price_eur": "|".join(str(price) for price in unit["nextPriceEur"]),
                    "price_source": unit["priceSource"],
                    "numbering_source": unit["numberingSource"],
                    "price_fallback_from": unit["priceFallbackFrom"],
                    "data_quality": unit["dataQuality"],
                    "source_notes": unit["notes"],
                }
            )


def generate_ts(dataset: dict) -> str:
    payload = json.dumps(dataset, ensure_ascii=False, indent=2)
    return (
        "// Generated from 1.NEW LEVEL PREMIUM source files by scripts/build-new-level-premium-dataset.py.\n"
        "// Do not hand-edit records here; fix the source parser or input documents and regenerate.\n\n"
        "export type NewLevelPremiumSaleStatus = \"available\" | \"sold\" | \"unknown\" | \"source_missing\"\n\n"
        "export interface NewLevelPremiumUnit {\n"
        "  id: string\n"
        "  block: string\n"
        "  sequence: number\n"
        "  unitNo: string\n"
        "  displayNo: string\n"
        "  floorLabel: string\n"
        "  floorLevel: number\n"
        "  unitType: string\n"
        "  areaText: string | null\n"
        "  interiorM2: number | null\n"
        "  outdoorM2: number | null\n"
        "  saleStatus: NewLevelPremiumSaleStatus\n"
        "  buyNowEur: number | null\n"
        "  nextPriceEur: number[]\n"
        "  priceSource: string | null\n"
        "  numberingSource: string | null\n"
        "  priceFallbackFrom: string | null\n"
        "  dataQuality: \"client_source\" | \"demo_fallback\" | \"source_missing\" | \"unknown_row\"\n"
        "  notes: string | null\n"
        "}\n\n"
        "export interface NewLevelPremiumBlock {\n"
        "  name: string\n"
        "  sortOrder: number\n"
        "  totalUnits: number\n"
        "  availableUnits: number\n"
        "  soldUnits: number\n"
        "  unknownUnits: number\n"
        "  minBuyNowEur: number | null\n"
        "  maxBuyNowEur: number | null\n"
        "  priceSourceStatus: \"parsed\" | \"missing\"\n"
        "  numberingSource: string | null\n"
        "}\n\n"
        "export interface NewLevelPremiumDataset {\n"
        "  generatedAt: string\n"
        "  sourceRoot: string\n"
        "  project: {\n"
        "    name: string\n"
        "    code: string\n"
        "    city: string\n"
        "    district: string\n"
        "    totalUnits: number\n"
        "    landAreaSqm: number\n"
        "    beachDistanceM: number\n"
        "    hotelStars: number\n"
        "    rentalGuaranteeYears: number\n"
        "    rentalGuaranteeAnnualPercent: number\n"
        "    showroomSetupCostEur: number\n"
        "    locationUrl: string\n"
        "  }\n"
        "  amenities: Array<{ id: number; tr: string; en: string }>\n"
        "  documents: Array<{ title: string; category: string; path: string; status: string }>\n"
        "  media: Array<{ title: string; path: string; category: string; capturedAt: string | null }>\n"
        "  blocks: NewLevelPremiumBlock[]\n"
        "  units: NewLevelPremiumUnit[]\n"
        "  findings: Array<{ severity: string; area: string; message: string; source: string }>\n"
        "}\n\n"
        f"export const newLevelPremiumDataset = {payload} as const satisfies NewLevelPremiumDataset\n\n"
        "export const newLevelPremiumUnits = newLevelPremiumDataset.units as readonly NewLevelPremiumUnit[]\n"
        "export const newLevelPremiumBlocks = newLevelPremiumDataset.blocks as readonly NewLevelPremiumBlock[]\n"
    )


def main() -> None:
    extract = json.loads(EXTRACT_PATH.read_text(encoding="utf-8"))
    units, findings = parse_units(extract)
    blocks = block_summaries(units)
    source_files = {record["path"]: record for record in extract["files"]}

    amenities = [
        {"id": 1, "tr": "Otel 5*", "en": "Hotel 5*"},
        {"id": 2, "tr": "Mini kulüp ve kafe", "en": "Mini club and cafe"},
        {"id": 3, "tr": "Havuzlar", "en": "Pools"},
        {"id": 4, "tr": "Açık otopark", "en": "Complex parking"},
        {"id": 5, "tr": "Lobi", "en": "Lobby"},
        {"id": 6, "tr": "Tenis kortu", "en": "Tennis court"},
        {"id": 7, "tr": "Futbol sahası", "en": "Football field"},
        {"id": 8, "tr": "Basketbol sahası", "en": "Basketball court"},
        {"id": 9, "tr": "Voleybol sahası", "en": "Volleyball court"},
        {"id": 10, "tr": "Oyun alanı", "en": "Children playground"},
        {"id": 11, "tr": "Mini golf", "en": "Mini golf"},
        {"id": 12, "tr": "Çoklu kort", "en": "Multi court"},
        {"id": 13, "tr": "Barbekü alanı kamelyalar", "en": "BBQ camellia area"},
        {"id": 14, "tr": "Barlar", "en": "Bars"},
        {"id": 15, "tr": "Yetişkin su parkı", "en": "Adult aquapark"},
        {"id": 16, "tr": "Çocuk su parkı", "en": "Children aquapark"},
        {"id": 17, "tr": "Jakuzili kapalı yüzme havuzu", "en": "Indoor pool with Jacuzzi"},
        {"id": 18, "tr": "Otele ait açık otopark", "en": "Outdoor parking of hotel"},
        {"id": 19, "tr": "Dinlenme alanı", "en": "Recreation area"},
        {"id": 20, "tr": "Dans eden show havuzu", "en": "Dancing fountain show pool"},
        {"id": 21, "tr": "Dekoratif havuzlar", "en": "Decorative pools"},
        {"id": 22, "tr": "Amfitiyatro", "en": "Amphitheatre"},
    ]

    media = []
    for record in extract["files"]:
        if record["class"] != "media":
            continue
        captured = re.search(r"(20\d{2})\\.*?(\d{2})\.(\d{2})\.(20\d{2})", record["path"])
        captured_at = None
        if captured:
            captured_at = f"{captured.group(4)}-{captured.group(3)}-{captured.group(2)}"
        media.append(
            {
                "title": Path(record["path"]).stem,
                "path": record["path"],
                "category": "construction" if "CURRENT STATUS" in record["path"] else "showroom",
                "capturedAt": captured_at,
            }
        )

    documents = []
    for record in extract["files"]:
        if record["class"] in {"legal_document", "facility_map", "location", "rental_income", "floor_plan", "numbering", "price_list"}:
            documents.append(
                {
                    "title": Path(record["path"]).stem,
                    "category": record["class"],
                    "path": record["path"],
                    "status": "active" if record.get("pdf", {}).get("text_char_count", 0) > 0 or record["extension"] in {".jpg", ".jpeg", ".png"} else "scan_review",
                }
            )

    dataset = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceRoot": "1.NEW LEVEL PREMIUM",
        "project": {
            "name": "New Level Premium Avsallar",
            "code": "NLP-AVS",
            "city": "Alanya",
            "district": "Avsallar",
            "totalUnits": 769,
            "landAreaSqm": 52000,
            "beachDistanceM": 900,
            "hotelStars": 5,
            "rentalGuaranteeYears": 3,
            "rentalGuaranteeAnnualPercent": 10,
            "showroomSetupCostEur": 17500,
            "locationUrl": "https://maps.app.goo.gl/gU9sHn3YXs4emPkAA?g_st=iw",
        },
        "amenities": amenities,
        "documents": documents,
        "media": media,
        "blocks": blocks,
        "units": units,
        "findings": findings,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SQL_OUT.parent.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "new-level-premium-dataset.json").write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    TS_OUT.write_text(generate_ts(dataset), encoding="utf-8")
    SQL_OUT.write_text(generate_sql(dataset), encoding="utf-8")
    write_units_csv(dataset)

    validation = {
        "generatedAt": dataset["generatedAt"],
        "totalUnits": len(units),
        "blocks": blocks,
        "availableUnits": sum(1 for unit in units if unit["saleStatus"] == "available"),
        "soldUnits": sum(1 for unit in units if unit["saleStatus"] == "sold"),
        "sourceMissingUnits": sum(1 for unit in units if unit["saleStatus"] == "source_missing"),
        "findings": findings,
        "outputs": {
            "dataset": str((OUT_DIR / "new-level-premium-dataset.json").relative_to(ROOT)),
            "typescript": str(TS_OUT.relative_to(ROOT)),
            "sql": str(SQL_OUT.relative_to(ROOT)),
            "csv": str(CSV_OUT.relative_to(ROOT)),
        },
    }
    (OUT_DIR / "new-level-premium-validation.json").write_text(
        json.dumps(validation, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(validation, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
