#!/usr/bin/env python3
"""Report-only SARIF summary. Secret values are never written out."""

import json
import os
import re
import sys
from collections import Counter
from pathlib import Path

SEVERITIES = ("critical", "high", "medium", "low", "note", "unknown")
LEVEL_MAP = {
    "error": "high",
    "warning": "medium",
    "note": "low",
    "none": "note",
}
# Whole-token match so "security" and "HIGH CONFIDENCE" are not treated as secrets.
SECRET_ID = re.compile(
    r"(?i)(?:^|[./_-])(?:secrets?|private[-_]?keys?|credentials?|api[-_]?keys?|passwords?|tokens?)(?:[./_-]|$)"
)
TOKEN = re.compile(
    r"(?i)(ghp_[A-Za-z0-9]{10,}|github_pat_[A-Za-z0-9_]{10,}|"
    r"AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|"
    r"xox[baprs]-[A-Za-z0-9-]{10,}|"
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----|"
    r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|"
    r"sk_live_[A-Za-z0-9]{8,}|AIza[0-9A-Za-z\-_]{20,})"
)
REDACTED_SECRET = "Secret finding redacted. File, line, and rule id only."
TOP_LIMIT = 20


def score_severity(score):
    try:
        value = float(score)
    except (TypeError, ValueError):
        return None
    if value >= 9.0:
        return "critical"
    if value >= 7.0:
        return "high"
    if value >= 4.0:
        return "medium"
    if value > 0:
        return "low"
    return None


def tags_of(rule, result):
    tags = []
    for props in (rule.get("properties") or {}, result.get("properties") or {}):
        tags.extend(props.get("tags") or [])
    return [str(tag) for tag in tags]


def is_secret_rule(rule_id, rule, tags):
    if str((rule or {}).get("name") or "").strip().lower() == "secret":
        return True
    if any(tag.strip().lower() in {"secret", "secrets"} for tag in tags):
        return True
    return bool(SECRET_ID.search(rule_id or ""))


def scrub(text, limit=240):
    text = TOKEN.sub("[redacted]", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        return text[: limit - 1] + "…"
    return text


def relativize(uri):
    uri = (uri or "").replace("\\", "/")
    if uri.startswith("file://"):
        uri = uri[7:]
    workspace = (os.environ.get("GITHUB_WORKSPACE") or "").replace("\\", "/")
    for prefix in (workspace + "/", "/src/", "/github/workspace/"):
        if prefix and prefix != "/" and uri.startswith(prefix):
            uri = uri[len(prefix):]
            break
    return uri.lstrip("./") or "(unknown file)"


def load_sarif(path):
    file = Path(path)
    if not file.is_file() or file.stat().st_size == 0:
        return None
    try:
        return json.loads(file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def findings_from(doc):
    found = []
    for run in doc.get("runs") or []:
        driver = (run.get("tool") or {}).get("driver") or {}
        rules = {rule.get("id"): rule for rule in driver.get("rules") or []}
        for result in run.get("results") or []:
            rule_id = result.get("ruleId") or "(no rule)"
            rule = rules.get(result.get("ruleId")) or {}
            tags = tags_of(rule, result)
            props = {}
            props.update(rule.get("properties") or {})
            props.update(result.get("properties") or {})
            severity = score_severity(props.get("security-severity"))
            if severity is None:
                level = result.get("level") or (rule.get("defaultConfiguration") or {}).get("level")
                severity = LEVEL_MAP.get(str(level or "").lower(), "unknown")
            location = ((result.get("locations") or [{}])[0].get("physicalLocation") or {})
            region = location.get("region") or {}
            found.append(
                {
                    "severity": severity,
                    "rule": rule_id,
                    "uri": relativize((location.get("artifactLocation") or {}).get("uri")),
                    "line": region.get("startLine"),
                    "secret": is_secret_rule(rule_id, rule, tags),
                    "message": (result.get("message") or {}).get("text") or "",
                }
            )
    rank = {name: index for index, name in enumerate(SEVERITIES)}
    found.sort(key=lambda item: (rank.get(item["severity"], 99), item["uri"], item["line"] or 0, item["rule"]))
    return found


def _replace_text(node, key):
    if isinstance(node, dict) and isinstance(node.get(key), str):
        node[key] = REDACTED_SECRET


def redact(doc):
    for run in doc.get("runs") or []:
        driver = (run.get("tool") or {}).get("driver") or {}
        rules = {rule.get("id"): rule for rule in driver.get("rules") or []}
        secret_ids = set()
        for rule_id, rule in rules.items():
            tags = tags_of(rule, {})
            if not is_secret_rule(rule_id or "", rule, tags):
                for field in ("shortDescription", "fullDescription"):
                    text = ((rule.get(field) or {}).get("text")) or ""
                    if TOKEN.search(text):
                        rule.setdefault(field, {})["text"] = TOKEN.sub("[redacted]", text)
                help_block = rule.get("help") or {}
                for key in ("text", "markdown"):
                    if TOKEN.search(help_block.get(key) or ""):
                        help_block[key] = TOKEN.sub("[redacted]", help_block[key])
                continue
            secret_ids.add(rule_id)
            for field in ("fullDescription", "help"):
                block = rule.get(field)
                if isinstance(block, dict):
                    if "text" in block:
                        block["text"] = REDACTED_SECRET
                    if "markdown" in block:
                        block["markdown"] = REDACTED_SECRET
            short = (rule.get("shortDescription") or {}).get("text") or ""
            if TOKEN.search(short) or len(short) > 120:
                rule.setdefault("shortDescription", {})["text"] = REDACTED_SECRET
        for result in run.get("results") or []:
            rule = rules.get(result.get("ruleId")) or {}
            tags = tags_of(rule, result)
            secret = result.get("ruleId") in secret_ids or is_secret_rule(result.get("ruleId") or "", rule, tags)
            message = result.setdefault("message", {})
            if secret:
                result["message"] = {"text": REDACTED_SECRET}
                result.pop("codeFlows", None)
                result.pop("stacks", None)
                result.pop("attachments", None)
                result.pop("relatedLocations", None)
                result.pop("fingerprints", None)
                result.pop("partialFingerprints", None)
            else:
                if isinstance(message, dict):
                    for key in ("text", "markdown"):
                        if key in message and isinstance(message[key], str):
                            message[key] = TOKEN.sub("[redacted]", message[key])
            for location in result.get("locations") or []:
                physical = location.get("physicalLocation") or {}
                region = physical.get("region") or {}
                if secret:
                    region.pop("snippet", None)
                    if isinstance(location.get("message"), dict):
                        location["message"] = {"text": REDACTED_SECRET}
                else:
                    snippet = region.get("snippet") or {}
                    if TOKEN.search(snippet.get("text") or ""):
                        region.pop("snippet", None)
    return doc


def place(item):
    if item["line"]:
        return f"{item['uri']}:{item['line']}"
    return item["uri"]


def render(sections):
    lines = [
        "## Security scan (report only)",
        "",
        "Findings are informational. This job does not fail when scanners report issues.",
        "",
    ]
    present = [section for section in sections if section["findings"] is not None]
    if present:
        header = "| Severity | " + " | ".join(section["name"] for section in present) + " | Total |"
        rule = "| --- | " + " | ".join("---:" for _ in present) + " | ---: |"
        lines.extend([header, rule])
        for severity in SEVERITIES:
            counts = [str(section["counts"].get(severity, 0)) for section in present]
            total = sum(section["counts"].get(severity, 0) for section in present)
            lines.append("| " + " | ".join([severity, *counts, str(total)]) + " |")
        lines.append("")

    lines.append("### Top critical and high findings")
    lines.append("")
    any_top = False
    for section in sections:
        findings = section["findings"]
        lines.append(f"#### {section['name']}")
        lines.append("")
        if findings is None:
            lines.append(f"No SARIF report (scanner status: {section['status']}).")
            lines.append("")
            continue
        lines.append(f"Scanner status: {section['status']}. Results: {len(findings)}.")
        lines.append("")
        top = [item for item in findings if item["severity"] in ("critical", "high")]
        if not top:
            lines.append("No critical or high findings.")
            lines.append("")
            continue
        any_top = True
        for item in top[:TOP_LIMIT]:
            if item["secret"]:
                lines.append(f"- `{place(item)}` `{item['rule']}`")
            else:
                lines.append(
                    f"- **{item['severity']}** `{place(item)}` `{item['rule']}` — {scrub(item['message'])}"
                )
        if len(top) > TOP_LIMIT:
            lines.append(f"- … {len(top) - TOP_LIMIT} more critical or high findings omitted.")
        lines.append("")

    lines.append("### Secrets")
    lines.append("")
    lines.append("Secret matches are file, line, and rule id only. Values are not written here or into uploaded SARIF text.")
    lines.append("")
    secret_lines = []
    for section in sections:
        for item in section["findings"] or []:
            if item["secret"]:
                secret_lines.append(f"- `{place(item)}` `{item['rule']}`")
    if secret_lines:
        lines.extend(secret_lines)
    else:
        lines.append("No secret findings.")
    lines.append("")
    if not any_top and all(section["findings"] is not None for section in sections):
        lines.append("No critical or high findings in this run.")
        lines.append("")
    return "\n".join(lines)


def write_output(name, value):
    output = os.environ.get("GITHUB_OUTPUT")
    if not output:
        return
    with open(output, "a", encoding="utf-8") as handle:
        handle.write(f"{name}={value}\n")


def main():
    workspace = Path(os.environ.get("GITHUB_WORKSPACE") or ".")
    summary_path = Path(os.environ.get("GITHUB_STEP_SUMMARY") or "/tmp/security-job-summary.md")
    upload_dir = workspace / "security-results"
    tools = (
        ("Semgrep OSS", os.environ.get("SEMGREP_VERSION", ""), os.environ.get("SEMGREP_SARIF", ""), os.environ.get("SEMGREP_STATUS", "unknown"), "semgrep"),
        ("Trivy", os.environ.get("TRIVY_VERSION", ""), os.environ.get("TRIVY_SARIF", ""), os.environ.get("TRIVY_STATUS", "unknown"), "trivy"),
    )
    sections = []
    for name, version, sarif_path, status, key in tools:
        label = f"{name} {version}".strip()
        doc = load_sarif(sarif_path) if sarif_path else None
        if doc is None:
            sections.append({"name": label, "status": status or "missing", "findings": None, "counts": Counter()})
            write_output(f"{key}_sarif", "false")
            continue
        found = findings_from(doc)
        sections.append(
            {
                "name": label,
                "status": status or "completed",
                "findings": found,
                "counts": Counter(item["severity"] for item in found),
            }
        )
        redacted = redact(doc)
        upload_dir.mkdir(parents=True, exist_ok=True)
        (upload_dir / f"{key}.sarif").write_text(json.dumps(redacted), encoding="utf-8")
        write_output(f"{key}_sarif", "true")
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(render(sections), encoding="utf-8")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary:
            with open(summary, "a", encoding="utf-8") as handle:
                handle.write(f"\nSecurity summary failed ({type(exc).__name__}). Scanner output was not printed.\n")
        sys.exit(0)
