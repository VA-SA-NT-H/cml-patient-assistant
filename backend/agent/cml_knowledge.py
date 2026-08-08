"""
Static CML knowledge base for injection into the AI system instruction.
Contains TKI profiles, treatment milestones, blood count ranges, and terminology.
"""

TKI_PROFILES = """
## TKI Drug Profiles

### Imatinib (Gleevec)
- Common side effects: diarrhea, nausea, muscle pain, fatigue, skin rash, abnormal liver function tests
- Red flags: sudden weight gain, trouble breathing, fluid buildup in lungs or around heart
- Food rules: Take with food and large glass of water. Avoid grapefruit, star fruit, pomegranate. Avoid St. John's Wort.

### Dasatinib (Sprycel)
- Common side effects: nausea, diarrhea, muscle pain, fatigue, skin rash, low blood cell counts
- Red flags: shortness of breath, chest pain, fast/irregular heartbeat, pleural effusion, pericardial effusion, small strokes (TIAs)
- Food rules: Can take with or without food. Avoid antacids 2 hours before/after. Avoid grapefruit, star fruit, pomegranate.

### Nilotinib (Tasigna)
- Common side effects: nausea, diarrhea, muscle pain, fatigue, blood chemical changes (low potassium/magnesium)
- Red flags: decreased blood flow to legs/heart/brain, prolonged QT syndrome, pancreatitis, high blood sugar
- Food rules: MUST be taken on empty stomach (no food 2 hours before, 1 hour after). Taking with food dangerously increases drug levels.

### Bosutinib (Bosulif)
- Common side effects: nausea/vomiting, diarrhea, belly pain, fatigue, skin rash
- Red flags: cardiovascular toxicity, pulmonary edema, renal toxicity
- Food rules: Must be taken with food. Avoid grapefruit, star fruit, pomegranate.

### Ponatinib (Iclusig)
- Common side effects: belly pain, headache, joint pain, high blood pressure, fever
- Red flags: serious blood clots (heart attacks, strokes), nerve damage, eye problems, severe liver problems, congestive heart failure
- Food rules: Can take with or without food. Avoid grapefruit, star fruit, pomegranate.

### Asciminib (Scemblix)
- Common side effects: fluid retention/bloating, diarrhea, itchy skin rashes, joint/muscle pain, lower blood cell counts
- Red flags: fluid buildup around heart/lungs, changes in heart rhythm, high blood pressure, liver damage
- Food rules: Must be taken on empty stomach (avoid food 2 hours before, 1 hour after). Avoid grapefruit, star fruit, pomegranate.
"""

TREATMENT_MILESTONES = """
## CML Treatment Milestones

| Milestone | BCR::ABL1 Threshold | What It Means |
|---|---|---|
| CCyR (Complete Cytogenetic Response) | ≤1.0% | Most Philadelphia chromosome-positive cells are gone |
| MMR (Major Molecular Response) | ≤0.1% | Very low levels of BCR::ABL1 detectable |
| MR4 (Deep Molecular Response 4) | ≤0.01% | Extremely low BCR::ABL1 — may consider treatment-free remission |
| MR4.5 (Deep Molecular Response 4.5) | ≤0.0032% | Near-complete molecular response |

### Response Categories
- **Optimal response:** BCR::ABL1 ≤0.1% (MMR) at 12 months
- **Warning:** BCR::ABL1 0.1%-1% at 12 months — discuss with hematologist
- **Failure:** BCR::ABL1 >1% at 12 months, or loss of previously achieved milestone
"""

BLOOD_COUNT_RANGES = """
## Blood Count Reference Ranges

| Test | Normal Range | Units |
|---|---|---|
| WBC (White Blood Cells) | 4.5 - 11.0 | K/µL |
| Platelets | 150 - 400 | K/µL |
| Hemoglobin | 12.0 - 17.0 | g/dL |
| RBC (Red Blood Cells) | 4.0 - 5.5 | M/µL |

### TKI-Related Blood Count Changes
- Mild cytopenias (low blood counts) are common and expected with TKI therapy
- WBC and platelets may drop in the first few months of treatment
- Dose adjustments may be needed if counts drop significantly
- Always compare with previous values to identify trends
"""

CML_GLOSSARY = """
## CML Terminology

- **CML (Chronic Myeloid Leukemia):** A type of cancer that starts in certain blood-forming cells of the bone marrow
- **BCR::ABL1:** An abnormal gene found on the Philadelphia chromosome; the target of TKI therapy
- **Philadelphia chromosome:** A genetic abnormality where pieces of chromosomes 9 and 22 swap places, creating the BCR::ABL1 gene
- **TKI (Tyrosine Kinase Inhibitor):** A drug that blocks the BCR::ABL1 protein; the standard treatment for CML
- **Molecular response:** How much BCR::ABL1 is still detectable in the blood
- **MMR (Major Molecular Response):** BCR::ABL1 ≤0.1% — a key treatment milestone
- **DMR (Deep Molecular Response):** BCR::ABL1 ≤0.01% — very low levels
- **TFR (Treatment-Free Remission):** Stopping TKI medication while maintaining deep molecular response
- **Chronic phase:** The initial, most treatable phase of CML
- **Accelerated phase:** CML that is progressing (more aggressive)
- **Blast phase:** CML that has progressed to acute leukemia
- **Cytogenetics:** Testing that examines chromosomes in cells
- **Molecular testing (PCR):** A highly sensitive blood test that measures BCR::ABL1 levels
"""


def get_cml_knowledge_base() -> str:
    """Return the complete CML knowledge base for system instruction injection."""
    return f"{TKI_PROFILES}\n{TREATMENT_MILESTONES}\n{BLOOD_COUNT_RANGES}\n{CML_GLOSSARY}"
