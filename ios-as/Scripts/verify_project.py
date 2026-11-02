"""Dependency-free structural checks; this does not compile Swift, install Pods, or run XCTest."""
from pathlib import Path
import json
import hashlib
import re
import xml.etree.ElementTree as ET


def parse_project(text):
    pattern = r'\s+|/\*.*?\*/|//[^\n]*|"(?:\\.|[^"\\])*"|[{}()=;,]|[^\s{}()=;," ]+'
    tokens = [token for token in re.findall(pattern, text, re.S)
              if not token.isspace() and not token.startswith(("/*", "//"))]
    position = 0

    def value():
        nonlocal position
        token = tokens[position]
        position += 1
        if token == "{":
            result = {}
            while tokens[position] != "}":
                key = value()
                assert tokens[position] == "="
                position += 1
                assert key not in result, f"Duplicate key/object ID: {key}"
                result[key] = value()
                assert tokens[position] == ";"
                position += 1
            position += 1
            return result
        if token == "(":
            result = []
            while tokens[position] != ")":
                result.append(value())
                if tokens[position] == ",":
                    position += 1
            position += 1
            return result
        return json.loads(token) if token.startswith('"') else token

    result = value()
    assert position == len(tokens), "Unexpected project tokens"
    return result


def validate(root):
    project = parse_project((root / "Rowan.xcodeproj/project.pbxproj").read_text(encoding="utf-8"))
    objects = project["objects"]

    def check_references(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if re.fullmatch(r"[A-F0-9]{24}", key):
                    assert key in objects, f"Missing keyed object {key}"
                check_references(item)
        elif isinstance(value, list):
            for item in value:
                check_references(item)
        elif re.fullmatch(r"[A-F0-9]{24}", str(value)):
            assert value in objects, f"Dangling object reference {value}"

    check_references(project)
    targets = {item["name"]: (key, item) for key, item in objects.items() if item.get("isa") == "PBXNativeTarget"}
    app_id, app = targets["Rowan"]
    test_id, tests = targets["RowanTests"]
    assert tests["productType"] == "com.apple.product-type.bundle.unit-test"
    assert any(objects[item]["target"] == app_id for item in tests["dependencies"]), "Missing test host dependency"
    assert any(objects[objects[item]["targetProxy"]]["remoteGlobalIDString"] == app_id
               for item in tests["dependencies"]), "Missing dependency proxy"

    def source_paths(target):
        phases = [objects[key] for key in target["buildPhases"] if objects[key]["isa"] == "PBXSourcesBuildPhase"]
        assert len(phases) == 1
        return {objects[objects[key]["fileRef"]]["path"] for key in phases[0]["files"]}

    test_paths = source_paths(tests)
    expected_tests = {path.relative_to(root).as_posix() for path in (root / "Tests/Unit").glob("*.swift")}
    assert test_paths == expected_tests, "All XCTest sources must belong exclusively to RowanTests Sources"
    app_paths = source_paths(app)
    expected_app = {path.relative_to(root).as_posix() for path in (root / "Rowan").rglob("*")
                    if path.suffix in (".swift", ".mm")}
    assert app_paths == expected_app and not app_paths.intersection(test_paths)

    names = {f"{environment}{mode}" for environment in ("Development", "Preview", "Production")
             for mode in ("Debug", "Release")}
    for owner in (app, tests, objects[project["rootObject"]]):
        configurations = objects[owner["buildConfigurationList"]]["buildConfigurations"]
        assert {objects[key]["name"] for key in configurations} == names
        for key in configurations:
            config = objects[key]
            if "baseConfigurationReference" in config:
                assert (root / objects[config["baseConfigurationReference"]]["path"]).is_file()
            if owner is tests:
                assert config["buildSettings"]["BUNDLE_LOADER"] == "$(TEST_HOST)"
                assert config["buildSettings"]["TEST_HOST"] == "$(BUILT_PRODUCTS_DIR)/Rowan.app/Rowan"

    expected_schemes = {"RowanDevelopment": "Development", "RowanPreview": "Preview", "Rowan": "Production"}
    scheme_dir = root / "Rowan.xcodeproj/xcshareddata/xcschemes"
    assert {path.stem for path in scheme_dir.glob("*.xcscheme")} == set(expected_schemes)
    for name, environment in expected_schemes.items():
        scheme = ET.parse(scheme_dir / f"{name}.xcscheme").getroot()
        action = scheme.find("TestAction")
        assert action.get("buildConfiguration") == environment + "Debug"
        assert action.find("Testables/TestableReference/BuildableReference").get("BlueprintIdentifier") == test_id
        assert action.find("MacroExpansion/BuildableReference").get("BlueprintIdentifier") == app_id
        assert action.find("EnvironmentVariables/EnvironmentVariable[@key='ROWAN_UNIT_TEST_HOST']").get("value") == "1"
        assert scheme.find("ArchiveAction").get("buildConfiguration") == environment + "Release"
        launch = environment + ("Debug" if environment == "Development" else "Release")
        assert scheme.find("LaunchAction").get("buildConfiguration") == launch
        assert scheme.find("LaunchAction/EnvironmentVariables/EnvironmentVariable[@key='ROWAN_UNIT_TEST_HOST']") is None
        for reference in scheme.iter("BuildableReference"):
            assert reference.get("BlueprintIdentifier") in (app_id, test_id)

    expected_ids = {"Development": "com.rowan.iot.dev", "Preview": "com.rowan.iot.preview", "Production": "com.rowan.iot"}
    for environment, bundle_id in expected_ids.items():
        assert f"ROWAN_BUNDLE_IDENTIFIER = {bundle_id}" in (root / "Config/Environments" / f"{environment}.xcconfig").read_text(encoding="utf-8")
    for path in (root / "Config").rglob("*.xcconfig"):
        for include in re.findall(r'^#include\s+"([^"]+)"', path.read_text(encoding="utf-8"), re.M):
            assert (path.parent / include).resolve().is_file(), f"Missing required include {path}: {include}"
    for environment in ("Development", "Preview", "Production"):
        for mode in ("Debug", "Release"):
            name = environment + mode
            app_config = (root / "Config" / f"{name}.xcconfig").read_text(encoding="utf-8")
            test_config = (root / "Config/Tests" / f"{name}.xcconfig").read_text(encoding="utf-8")
            assert f"Pods-Rowan.{name.lower()}.xcconfig" in app_config
            assert f"Pods-RowanTests.{name.lower()}.xcconfig" in test_config
    podfile = (root / "Podfile").read_text(encoding="utf-8")
    for name in names:
        mode = "debug" if name.endswith("Debug") else "release"
        assert f"'{name}' => :{mode}" in podfile
    assert "target 'RowanTests' do" in podfile and "inherit! :search_paths" in podfile
    assert 'environment["ROWAN_UNIT_TEST_HOST"] == "1"' in (root / "Rowan/AppDelegate.swift").read_text(encoding="utf-8")
    asset_hashes = {
        "BrandLogo": "9bfaa1064414e67356e29cc1a50b07cc6141c201b5038d7a235ea2e2764b1bac",
        "BrandLogoWhite": "42a91472f066b100d962f21448082940c49421c93a1216cdee6b8c6d40af8dec",
    }
    for name, digest in asset_hashes.items():
        asset = root / "Rowan/Images.xcassets" / (name + ".imageset")
        metadata = json.loads((asset / "Contents.json").read_text(encoding="utf-8"))
        image = asset / metadata["images"][0]["filename"]
        assert hashlib.sha256(image.read_bytes()).hexdigest() == digest, f"Brand asset changed: {name}"
    account_assets = json.loads((root / "Config/AccountAssetSources.json").read_text(encoding="utf-8"))
    for entry in account_assets:
        asset = root / "Rowan/Images.xcassets" / (entry["asset"] + ".imageset")
        metadata = json.loads((asset / "Contents.json").read_text(encoding="utf-8"))
        image = asset / metadata["images"][0]["filename"]
        assert hashlib.sha256(image.read_bytes()).hexdigest() == entry["sha256"], f"Account asset changed: {entry['asset']}"
    launch = ET.parse(root / "Rowan/LaunchScreen.storyboard").getroot()
    assert launch.find("resources/image[@name='BrandLogoWhite']") is not None
    test_count = sum(len(re.findall(r"^\s+func test", (root / path).read_text(encoding="utf-8"), re.M)) for path in test_paths)
    print(f"Static structure verified: {len(objects)} objects; {len(app_paths)} app sources; {len(test_paths)} XCTest sources ({test_count} test methods); 6 configurations per target/project; 3 shared schemes.")
    print("Not performed: CocoaPods/Codegen, xcodebuild, Swift typecheck, XCTest execution, simulator/device or signing validation.")


if __name__ == "__main__":
    validate(Path(__file__).resolve().parents[1])
