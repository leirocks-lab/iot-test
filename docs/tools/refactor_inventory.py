"""Build a reproducible scope/evidence inventory without modifying the source workbook."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
SCOPE = Path("docs/prd/智能家居物联网项目计划&需求范围.xlsx")
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
W = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
API = re.compile(r"\b(?:AUTH|HOME|CONTENT|PAIR|DEVICE|MORE|TIMER|OTA|ROOM|USER|SHARE|APP|PRODUCT|PLUGIN)-\d{2}\b")


def paragraphs(path: Path) -> list[str]:
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    return ["".join(t.text or "" for t in p.findall(".//w:t", W)) for p in root.findall(".//w:p", W)]


def scope_rows(path: Path) -> list[dict]:
    with ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(x.itertext()) for x in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("s:si", NS)]
        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        group = ""
        result = []
        for row in sheet.findall(".//s:row", NS)[1:]:
            fields = {}
            for cell in row.findall("s:c", NS):
                value = cell.find("s:v", NS)
                inline = cell.find("s:is", NS)
                text = value.text if value is not None else "".join(inline.itertext()) if inline is not None else ""
                if cell.get("t") == "s":
                    text = strings[int(text)]
                fields[re.sub(r"\d", "", cell.get("r", ""))] = text or ""
            if not fields.get("A", "").isdigit():
                continue
            group = fields.get("B") or group
            # This workbook's content has an ID column in A; retain physical cells,
            # rather than treating the six headings as a normalized business schema.
            result.append({"id": f"S{int(fields['A']):03}", "sourceRow": int(row.get("r")),
                           "group": group, "flow": fields.get("C", ""), "title": fields.get("D", ""),
                           "requirement": fields.get("E", ""), "priority": fields.get("F", ""), "sourceCells": fields})
    return result


def build(root: Path = ROOT) -> dict:
    rows = scope_rows(root / SCOPE)
    http = paragraphs(root / "docs/prd/ROWAN公共App产品功能及API详细设计说明书_V1.4.docx")
    mqtt = paragraphs(root / "docs/prd/ROWAN_AS_App_Spec_V1.6_Corrected.docx")
    pages = []
    for p in sorted((root / "docs/ui/lanhu/project/src/view").glob("*/page.json")):
        pages.append({"path": p.relative_to(root).as_posix(), "metadata": json.loads(p.read_text(encoding="utf-8")),
                      "designPresent": (p.parent / "design.png").exists(), "scopeMapping": "待核对", "android": "未开始", "ios": "未开始"})
    old = []
    for folder in ["app-rn-old/src/services", "app-rn-old/src/protocol", "app-rn-old/src/screens"]:
        old += [p for p in (root / folder).rglob("*.ts*") if ".test." not in p.name]
    for row in rows:
        text = row["requirement"]
        ids = set(API.findall(text))
        # Expand abbreviated references such as AUTH-05/06 and PAIR-01～03.
        for prefix, start, separator, end in re.findall(r"([A-Z]+)-(\d{2})([/～~])(\d{2})", text):
            values = range(int(start), int(end) + 1) if separator != "/" else [int(start), int(end)]
            ids.update(f"{prefix}-{v:02}" for v in values)
        row["httpReferences"] = [{"id": api, "paragraphs": [i + 1 for i, p in enumerate(http) if api in p]} for api in sorted(ids)]
        row["mqttRequired"] = "MQTT" in text or row["group"] == "设备控制"
        row["mqttParagraphCandidates"] = [i + 1 for i, p in enumerate(mqtt) if row["title"] in p][:12] if row["mqttRequired"] else []
        row["legacyCandidates"] = [p.relative_to(root).as_posix() for p in old if any(api in p.read_text(encoding="utf-8") for api in ids)]
        row["uiCandidates"] = [p["path"] for p in pages if row["title"] in json.dumps(p["metadata"], ensure_ascii=False)]
        row["mappingStatus"] = "待逐项人工核对；候选不等于实现依据"
        row["implementation"] = {"android": "未开始", "ios": "未开始", "rn": "未开始"}
        row["acceptance"] = {"uiAndroid": "未验收", "uiIOS": "未验收", "http": "未验收", "mqtt": "未验收", "emulator": "未验收", "hardware": "未验收"}
        row["cases"] = [{"id": row["id"] + suffix, "scenario": scenario, "status": "未开始", "evidence": []} for suffix, scenario in [("-N", "按原始要求验证正常业务及最终结果"), ("-E", "验证适用的错误、取消、权限及恢复路径")]]
    return {"schemaVersion": 1, "scope": SCOPE.as_posix(), "sha256": hashlib.sha256((root / SCOPE).read_bytes()).hexdigest(),
            "generatedOn": "2026-11-01", "note": "自动生成的引用候选；不代表映射、实现、联调或视觉验收通过。原始说明完整保留。", "items": rows, "uiPages": pages}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    inventory = build()
    target = ROOT / "docs/SDD/重构范围追踪.json"
    output = json.dumps(inventory, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not target.exists() or target.read_text(encoding="utf-8") != output:
            raise SystemExit("Inventory missing or stale; run docs/tools/refactor_inventory.py")
    else:
        target.write_text(output, encoding="utf-8")
    print(f"scope={len(inventory['items'])}; UI={len(inventory['uiPages'])}; {'verified' if args.check else 'generated'}")


if __name__ == "__main__":
    main()
