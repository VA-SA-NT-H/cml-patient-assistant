import json

TKI_DATABASE = {
    "imatinib": {
        "brand_name": "Gleevec",
        "common_side_effects": [
            "diarrhea", 
            "nausea", 
            "muscle pain", 
            "fatigue", 
            "skin rash", 
            "abnormal liver function tests"
        ],
        "red_flags": [
            "sudden weight gain", 
            "trouble breathing", 
            "fluid buildup in the lungs or around the heart"
        ]
    },
    "dasatinib": {
        "brand_name": "Sprycel",
        "common_side_effects": [
            "nausea", 
            "diarrhea", 
            "muscle pain", 
            "fatigue", 
            "skin rash", 
            "low blood cell counts"
        ],
        "red_flags": [
            "shortness of breath", 
            "chest pain", 
            "fast or irregular heartbeat", 
            "pleural effusion (fluid around lungs)", 
            "pericardial effusion (fluid around heart)", 
            "small strokes (TIAs)"
        ]
    },
    "nilotinib": {
        "brand_name": "Tasigna",
        "common_side_effects": [
            "nausea", 
            "diarrhea", 
            "muscle pain", 
            "fatigue", 
            "blood chemical changes (low potassium/magnesium)"
        ],
        "red_flags": [
            "decreased blood flow to legs, heart, or brain", 
            "prolonged QT syndrome", 
            "pancreatitis", 
            "high blood sugar"
        ]
    },
    "bosutinib": {
        "brand_name": "Bosulif",
        "common_side_effects": [
            "nausea and vomiting", 
            "diarrhea", 
            "belly pain", 
            "fatigue", 
            "skin rash"
        ],
        "red_flags": [
            "cardiovascular toxicity (cardiac failure or left ventricular dysfunction)", 
            "pulmonary edema", 
            "renal toxicity (decline in estimated glomerular filtration rate)"
        ]
    },
    "ponatinib": {
        "brand_name": "Iclusig",
        "common_side_effects": [
            "belly pain", 
            "headache", 
            "joint pain", 
            "high blood pressure", 
            "fever"
        ],
        "red_flags": [
            "serious blood clots (heart attacks and strokes)", 
            "nerve damage", 
            "eye problems", 
            "severe liver problems", 
            "congestive heart failure"
        ]
    },
    "asciminib": {
        "brand_name": "Scemblix",
        "common_side_effects": [
            "bloating or swelling from fluid retention", 
            "diarrhea", 
            "itchy skin rashes", 
            "joint or muscle pain", 
            "lower blood cell counts"
        ],
        "red_flags": [
            "fluid buildup around the heart or lungs", 
            "changes in heart rhythm", 
            "high blood pressure", 
            "liver damage"
        ]
    }
}

def lookup_tki_info(drug_name: str) -> str:
    """Looks up generic and brand name TKI information (side effects and red flags)."""
    drug_name = drug_name.lower().strip()
    if drug_name in TKI_DATABASE:
        return json.dumps(TKI_DATABASE[drug_name])
    return json.dumps({"error": f"Drug '{drug_name}' not found."})
