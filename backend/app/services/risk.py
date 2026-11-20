def score_transaction(amount: float, country: str, channel: str, category: str):
    # Transparent demo rules only. These are not calibrated fraud probabilities.
    score, reasons = 8.0, []
    if amount >= 1500:
        score += 34; reasons.append("High transaction amount")
    elif amount >= 700:
        score += 17; reasons.append("Elevated transaction amount")
    if country.upper() not in {"USA", "IND", "GBR", "CAN", "AUS"}:
        score += 24; reasons.append("Unusual country in demo rules")
    if channel.lower() == "online":
        score += 8
    if category.lower() in {"gift_cards", "crypto", "electronics"}:
        score += 18; reasons.append("Higher-risk merchant category")
    score = min(score, 99.0)
    level = "high" if score >= 70 else "medium" if score >= 40 else "low"
    status = "review" if level == "high" else "flagged" if level == "medium" else "approved"
    return score, level, status, "; ".join(reasons) if reasons else "No demo rule triggered"
