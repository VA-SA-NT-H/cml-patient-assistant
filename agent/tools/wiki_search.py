import wikipedia
import json

def search_wikipedia(query: str) -> str:
    """Searches Wikipedia for general medical or disease knowledge."""
    try:
        # We limit to 4 sentences so we don't overwhelm the LLM's context window
        summary = wikipedia.summary(query, sentences=4)
        return json.dumps({"source": "Wikipedia", "query": query, "summary": summary})
    
    except wikipedia.exceptions.DisambiguationError as e:
        # If the search is too vague
        return json.dumps({"error": f"Search term is too ambiguous. Try being more specific. Options: {e.options[:5]}"})
    
    except wikipedia.exceptions.PageError:
        return json.dumps({"error": f"No Wikipedia page found for '{query}'."})
    
    except Exception as e:
        return json.dumps({"error": str(e)})
