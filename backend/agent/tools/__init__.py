try:
    from agent.tools.tki_info import lookup_tki_info
    from agent.tools.food_rules import lookup_food_interactions
    from agent.tools.rag_search import search_medical_guidelines, ingest_pdf, warm_up_embedding_model, ensure_pdf_ingested
    from agent.tools.wiki_search import search_wikipedia
except (ImportError, ModuleNotFoundError):
    from tki_info import lookup_tki_info
    from food_rules import lookup_food_interactions
    from rag_search import search_medical_guidelines, ingest_pdf, warm_up_embedding_model, ensure_pdf_ingested
    from wiki_search import search_wikipedia
