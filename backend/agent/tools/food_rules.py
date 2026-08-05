import json

FOOD_INTERACTIONS_DB = {
    "imatinib": [
        "Take with a meal and a large glass of water to minimize stomach irritation.", 
        "Avoid grapefruit, star fruit, and pomegranate (increases drug levels).",
        "Avoid St. John's Wort and be cautious with herbal supplements."
    ],
    "dasatinib": [
        "Can be taken with or without food.", 
        "Avoid antacids (e.g., Tums, Maalox) 2 hours before and after taking.", 
        "Avoid grapefruit, star fruit, and pomegranate.",
        "Avoid St. John's Wort and green tea extracts."
    ],
    "nilotinib": [
        "Tasigna MUST be taken on an empty stomach (no food 2 hours before and 1 hour after).", 
        "Taking Tasigna with food can severely and dangerously increase drug levels.", 
        "A specific new formulation (Danziten) can be taken with food; strictly follow formulation instructions.",
        "Avoid grapefruit, star fruit, and pomegranate.",
        "Avoid St. John's Wort."
    ],
    "bosutinib": [
        "Must be taken with food.", 
        "Avoid grapefruit, star fruit, and pomegranate.",
        "Avoid St. John's Wort and check with a doctor before taking any antacids or proton pump inhibitors."
    ],
    "ponatinib": [
        "Can be taken with or without food.", 
        "Avoid grapefruit, star fruit, and pomegranate.",
        "Avoid St. John's Wort."
    ],
    "asciminib": [
        "Must be taken on an empty stomach (avoid food for at least 2 hours before and 1 hour after taking).", 
        "Avoid grapefruit, star fruit, and pomegranate.",
        "Avoid St. John's Wort and be cautious with turmeric (curcumin) or other herbal supplements."
    ]
}

def lookup_food_interactions(drug_name: str) -> str:
    """Looks up dietary restrictions and food interactions for a TKI."""
    drug_name = drug_name.lower().strip()
    if drug_name in FOOD_INTERACTIONS_DB:
        return json.dumps({"drug": drug_name, "food_rules": FOOD_INTERACTIONS_DB[drug_name]})
    return json.dumps({"error": f"Drug '{drug_name}' not found for food interactions."})
