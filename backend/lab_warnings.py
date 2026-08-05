from datetime import datetime, timedelta


def check_trends(lab_results: list[dict], treatments: list[dict]) -> list[dict]:
    """Analyze lab results and return active warnings."""
    warnings = []

    # Filter BCR-ABL1 results sorted by date
    bcr_results = sorted(
        [r for r in lab_results if r["test_type"] == "bcr_abl1"],
        key=lambda x: x["test_date"]
    )

    if bcr_results:
        latest_value = float(bcr_results[-1]["value"])
        was_below_mmr = any(float(r["value"]) <= 0.1 for r in bcr_results[:-1])
        was_below_ccyr = any(float(r["value"]) <= 1.0 for r in bcr_results[:-1])

        # Rising BCR-ABL1 trend (last 2+ values increasing)
        if len(bcr_results) >= 2:
            last_values = [float(r["value"]) for r in bcr_results[-3:]]
            if len(last_values) >= 2 and all(
                last_values[i] < last_values[i + 1] for i in range(len(last_values) - 1)
            ):
                increase = last_values[-1] - last_values[0]
                if increase > 0.01:
                    warnings.append({
                        "severity": "high",
                        "condition": "rising_bcr_abl1",
                        "message": "Your BCR-ABL1 levels have been trending upward. Please discuss with your hematologist.",
                    })

        # Loss of MMR
        if was_below_mmr and latest_value > 0.1:
            warnings.append({
                "severity": "critical",
                "condition": "loss_of_mmr",
                "message": "Your BCR-ABL1 has risen above the MMR threshold (0.1%). Contact your hematologist urgently.",
            })

        # Loss of CCyR
        if was_below_ccyr and latest_value > 1.0:
            warnings.append({
                "severity": "critical",
                "condition": "loss_of_ccyr",
                "message": "Your BCR-ABL1 has risen above 1%. This requires immediate medical attention.",
            })

    # CBC warnings
    cbc_wbc = sorted(
        [r for r in lab_results if r["test_type"] == "cbc_wbc"],
        key=lambda x: x["test_date"]
    )
    if cbc_wbc:
        latest_wbc = float(cbc_wbc[-1]["value"])
        if latest_wbc < 1.0:
            warnings.append({
                "severity": "critical",
                "condition": "severe_neutropenia",
                "message": "Your WBC is critically low. Seek immediate medical attention.",
            })

    cbc_plt = sorted(
        [r for r in lab_results if r["test_type"] == "cbc_platelets"],
        key=lambda x: x["test_date"]
    )
    if cbc_plt:
        latest_plt = float(cbc_plt[-1]["value"])
        if latest_plt < 50:
            warnings.append({
                "severity": "high",
                "condition": "severe_thrombocytopenia",
                "message": "Your platelet count is dangerously low. Contact your doctor.",
            })

    cbc_hgb = sorted(
        [r for r in lab_results if r["test_type"] == "cbc_hemoglobin"],
        key=lambda x: x["test_date"]
    )
    if cbc_hgb:
        latest_hgb = float(cbc_hgb[-1]["value"])
        if latest_hgb < 7.0:
            warnings.append({
                "severity": "high",
                "condition": "severe_anemia",
                "message": "Your hemoglobin is severely low. Contact your doctor.",
            })

    # Stale data warning
    all_results = sorted(lab_results, key=lambda x: x["test_date"])
    if all_results:
        last_date = datetime.strptime(all_results[-1]["test_date"], "%Y-%m-%d")
        if datetime.now() - last_date > timedelta(days=180):
            warnings.append({
                "severity": "medium",
                "condition": "stale_data",
                "message": "It's been over 6 months since your last lab test. Please schedule a check-up.",
            })

    return warnings