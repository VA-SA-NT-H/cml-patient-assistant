import csv
import io
import re
from datetime import datetime
from PyPDF2 import PdfReader


def parse_csv(file_content: str) -> list[dict]:
    """Parse a CSV file and return preview rows with validation."""
    results = []
    reader = csv.DictReader(io.StringIO(file_content))

    for i, row in enumerate(reader):
        test_type = row.get("test_type", "").strip().lower()
        value = row.get("value", "").strip()
        unit = row.get("unit", "").strip()
        test_date = row.get("date", "").strip()
        notes = row.get("notes", "").strip()

        valid = True
        error = None

        if test_type not in ("bcr_abl1", "cbc_wbc", "cbc_platelets", "cbc_hemoglobin", "other"):
            valid = False
            error = f"Invalid test_type: '{test_type}'"
        elif not _is_numeric(value):
            valid = False
            error = f"Value is not numeric: '{value}'"
        elif not _is_valid_date(test_date):
            valid = False
            error = f"Invalid date format: '{test_date}' (use YYYY-MM-DD)"

        results.append({
            "test_type": test_type,
            "value": value,
            "unit": unit,
            "test_date": test_date,
            "notes": notes,
            "valid": valid,
            "error": error,
        })

    return results


def parse_pdf(file_content: bytes) -> list[dict]:
    """Parse a PDF lab report and extract values via pattern matching."""
    results = []
    if not file_content:
        results.append({
            "test_type": "other", "value": "", "unit": "", "test_date": "",
            "notes": "Empty PDF file", "valid": False, "error": "Empty PDF file",
        })
        return results

    try:
        reader = PdfReader(io.BytesIO(file_content))
    except Exception:
        results.append({
            "test_type": "other", "value": "", "unit": "", "test_date": "",
            "notes": "Could not read PDF file", "valid": False, "error": "Invalid PDF file",
        })
        return results

    text = "\n".join(page.extract_text() or "" for page in reader.pages)

    patterns = {
        "bcr_abl1": r"BCR[-\s]*ABL1?\s*[:\s]*(\d+\.?\d*)\s*%?",
        "cbc_wbc": r"WBC\s*[:\s]*(\d+\.?\d*)\s*(?:x10\^?9/L|10\^9|K/uL)?",
        "cbc_platelets": r"Plate(?:lets|s)?\s*[:\s]*(\d+\.?\d*)\s*(?:x10\^?9/L|10\^9|K/uL)?",
        "cbc_hemoglobin": r"(?:Hgb|Hemoglobin|Hb)\s*[:\s]*(\d+\.?\d*)\s*(?:g/dL|g/L)?",
    }

    # Try to extract date
    date_match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", text)
    test_date = ""
    if date_match:
        raw = date_match.group(1)
        for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%m/%d/%y", "%m-%d-%y"):
            try:
                test_date = datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
                break
            except ValueError:
                continue

    for test_type, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1)
            unit = _default_unit(test_type)
            results.append({
                "test_type": test_type,
                "value": value,
                "unit": unit,
                "test_date": test_date,
                "notes": "",
                "valid": True,
                "error": None,
            })

    if not results:
        results.append({
            "test_type": "other",
            "value": "",
            "unit": "",
            "test_date": test_date,
            "notes": "Could not parse PDF — please enter values manually",
            "valid": False,
            "error": "No recognized lab values found in PDF",
        })

    return results


def parse_image(file_content: bytes) -> list[dict]:
    """Parse a lab report image and extract values via OCR."""
    results = []
    if not file_content:
        results.append({
            "test_type": "other", "value": "", "unit": "", "test_date": "",
            "notes": "Empty image file", "valid": False, "error": "Empty image file",
        })
        return results

    try:
        import numpy as np
        from PIL import Image
        image = Image.open(io.BytesIO(file_content))
    except ImportError:
        results.append({
            "test_type": "other", "value": "", "unit": "", "test_date": "",
            "notes": "Image dependencies not installed", "valid": False, "error": "Pillow or numpy not installed",
        })
        return results
    except Exception:
        results.append({
            "test_type": "other", "value": "", "unit": "", "test_date": "",
            "notes": "Could not read image file", "valid": False, "error": "Invalid image file",
        })
        return results

    try:
        from rapidocr_onnxruntime import RapidOCR
        ocr = RapidOCR()
        image_array = np.array(image)
        ocr_result, _ = ocr(image_array)
        
        if ocr_result:
            text = "\n".join([line[1] for line in ocr_result])
        else:
            text = ""
    except ImportError:
        results.append({
            "test_type": "other", "value": "", "unit": "", "test_date": "",
            "notes": "RapidOCR not installed", "valid": False, "error": "rapidocr-onnxruntime not installed",
        })
        return results
    except Exception as e:
        results.append({
            "test_type": "other", "value": "", "unit": "", "test_date": "",
            "notes": f"OCR failed: {str(e)}", "valid": False, "error": f"OCR processing error: {str(e)}",
        })
        return results

    patterns = {
        "bcr_abl1": r"BCR[-\s]*ABL1?\s*[:\s]*(\d+\.?\d*)\s*%?",
        "cbc_wbc": r"WBC\s*[:\s]*(\d+\.?\d*)\s*(?:x10\^?9/L|10\^9|K/uL)?",
        "cbc_platelets": r"Plate(?:lets|s)?\s*[:\s]*(\d+\.?\d*)\s*(?:x10\^?9/L|10\^9|K/uL)?",
        "cbc_hemoglobin": r"(?:Hgb|Hemoglobin|Hb)\s*[:\s]*(\d+\.?\d*)\s*(?:g/dL|g/L)?",
    }

    date_match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", text)
    test_date = ""
    if date_match:
        raw = date_match.group(1)
        for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%m/%d/%y", "%m-%d-%y"):
            try:
                test_date = datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
                break
            except ValueError:
                continue

    for test_type, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1)
            unit = _default_unit(test_type)
            results.append({
                "test_type": test_type,
                "value": value,
                "unit": unit,
                "test_date": test_date,
                "notes": "",
                "valid": True,
                "error": None,
            })

    if not results:
        results.append({
            "test_type": "other",
            "value": "",
            "unit": "",
            "test_date": test_date,
            "notes": "Could not parse image — please enter values manually",
            "valid": False,
            "error": "No recognized lab values found in image",
        })

    return results


def _is_numeric(value: str) -> bool:
    try:
        float(value)
        return True
    except (ValueError, TypeError):
        return False


def _is_valid_date(date_str: str) -> bool:
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except (ValueError, TypeError):
        return False


def _default_unit(test_type: str) -> str:
    units = {
        "bcr_abl1": "%",
        "cbc_wbc": "x10^9/L",
        "cbc_platelets": "x10^9/L",
        "cbc_hemoglobin": "g/dL",
    }
    return units.get(test_type, "")