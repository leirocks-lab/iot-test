"""Archive exact SDK matrix reports and public PNGs without rewriting raw evidence."""
from pathlib import Path
import argparse, hashlib, json, re, shutil

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--run", required=True)
args = parser.parse_args()
if not re.fullmatch(r"[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}", args.run):
    raise RuntimeError("Invalid matrix identifier")
raw = root / ".cache/refactor/android-home-fixture-matrix-runs" / args.run / "matrix.json"
matrix = json.loads(raw.read_text(encoding="utf-8"))
base = root / "docs/测试报告/重构实施-20261101"
output = base / ("android-home-joint-matrix-" + args.run)
output.mkdir(parents=True, exist_ok=False)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
shutil.copyfile(raw, output / "matrix.json")
index = {k: matrix[k] for k in ["runId", "sourceSha256", "hostSha256", "testSha256", "restoration", "status", "finalSourceMatches"]}
index.update(fixtureOnly=True, realHttpAcceptance=False, pixelAcceptance=False,
             rawMatrix=(output / "matrix.json").relative_to(base).as_posix(), rawMatrixSha256=sha(raw), configurations=[])
for item in matrix["configurations"]:
    config = item["configuration"]["id"]
    if config not in ["base", "small", "large", "font150"]:
        raise RuntimeError("Unknown configuration")
    # Failed preconditions may have no child report; retain that fact.
    recorded = {"configuration": item["configuration"], "status": item["status"]}
    child_ref = item.get("report")
    if child_ref:
        source = (root / child_ref).resolve()
        if not source.is_relative_to((root / ".cache/refactor/android-home-ui-fixtures-runs").resolve()):
            raise RuntimeError("Unexpected collector path")
        child = json.loads(source.read_text(encoding="utf-8"))
        if child["targetApkSha256"] != matrix["hostSha256"] or child["testApkSha256"] != matrix["testSha256"]:
            raise RuntimeError("Child APK mismatch")
        folder = output / config
        folder.mkdir()
        shutil.copyfile(source, folder / "report.json")
        screenshots = []
        for artifact in child["artifacts"]:
            name = artifact["name"]
            if Path(name).name != name or not name.endswith(".png"):
                raise RuntimeError("Unexpected PNG name")
            image = source.parent / name
            if sha(image) != artifact["sha256"]:
                raise RuntimeError("PNG hash mismatch")
            shutil.copyfile(image, folder / name)
            screenshots.append((folder / name).relative_to(base).as_posix())
        recorded.update(report=(folder / "report.json").relative_to(base).as_posix(), passed=sum(r["result"] == "passed" for r in child["results"]), screenshots=screenshots)
    index["configurations"].append(recorded)
(output / "archive-index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": index["status"], "configurations": len(index["configurations"]), "png": sum(len(c.get("screenshots", [])) for c in index["configurations"]), "archive": output.name}))
