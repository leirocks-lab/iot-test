"""Keep an exact dirty-worktree source/APK snapshot before a subsequent batch."""
from pathlib import Path
import argparse, hashlib, json, re, subprocess, zipfile
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--provenance", default="docs/测试报告/重构实施-20261101/android-scan-release-provenance.json")
args = parser.parse_args()
proof_path = (root / args.provenance).resolve()
report_root = (root / "docs/测试报告/重构实施-20261101").resolve()
if not proof_path.is_relative_to(report_root) or proof_path.suffix != ".json":
    raise RuntimeError("A local archived build provenance is required")
proof = json.loads(proof_path.read_text(encoding="utf-8-sig"))
expected = proof["sourceAfter"]["sourceSha256"]
if not re.fullmatch(r"[a-f0-9]{64}", expected) or not re.fullmatch(r"[a-f0-9]{64}", proof["artifactSha256"]):
    raise RuntimeError("Invalid source/artifact digest")
if proof.get("sourceUnchangedDuringBuild") is not True or proof["sourceBefore"]["sourceSha256"] != expected:
    raise RuntimeError("An unchanged-source successful build is required")
raw = subprocess.check_output(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "android-as", "app-rn"], cwd=root)
names = sorted(set(x.decode("utf-8") for x in raw.split(b"\0") if x))
digest, entries, contents = hashlib.sha256(), [], []
for name in names:
    path = (root / name).resolve()
    if not path.is_relative_to(root) or path.name.endswith((".env.local", ".keystore", ".jks", ".p8", ".pem")):
        raise RuntimeError("Unexpected source archive path")
    data = path.read_bytes() if path.exists() else b"<deleted>"
    digest.update(name.encode()); digest.update(b"\0"); digest.update(data); digest.update(b"\0")
    entries.append({"path": name, "sha256": hashlib.sha256(data).hexdigest()})
    contents.append((name, data))
if digest.hexdigest() != expected or len(names) != proof["sourceAfter"]["sourceFiles"]:
    raise RuntimeError("Current source differs from selected build")
apk = root / "android-as/app/build/outputs/apk/development/release/app-development-release.apk"
apk_bytes = apk.read_bytes()
if hashlib.sha256(apk_bytes).hexdigest() != proof["artifactSha256"]:
    raise RuntimeError("APK differs from selected build")
folder = root / ".cache/refactor/artifacts" / proof["artifactSha256"]
folder.mkdir(parents=True, exist_ok=True)
source_zip = folder / "source.zip"
with zipfile.ZipFile(source_zip, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for name, data in contents:
        archive.writestr(name, data)
(folder / "app-development-release.apk").write_bytes(apk_bytes)
report = {"date": datetime.now(timezone.utc).isoformat(), "sourceSha256": expected,
          "sourceFiles": len(names), "artifactSha256": proof["artifactSha256"],
          "sourceZip": source_zip.relative_to(root).as_posix(),
          "sourceZipSha256": hashlib.sha256(source_zip.read_bytes()).hexdigest(),
          "apkCopy": (folder / "app-development-release.apk").relative_to(root).as_posix(), "entries": entries,
          "limits": ["This snapshot preserves the selected source/build, not subsequent worktree changes.",
                     "Private local environment and ignored build/dependency folders are excluded by git source inventory."]}
output = root / "docs/测试报告/重构实施-20261101" / ("source-snapshot-" + expected + ".json")
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Archived {len(names)} exact source files and matching APK; manifest {output.name}")
