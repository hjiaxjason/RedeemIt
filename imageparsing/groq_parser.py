import os
import base64
import json
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv
from .models import GiftCardInfo

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def parse_gift_card_image(image_bytes: bytes) -> GiftCardInfo:
    """Parse a gift card image using Groq's vision model."""
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                    },
                    {
                        "type": "text",
                        "text": """Look at this gift card image and extract all visible information.
Return ONLY raw JSON, no markdown, no explanation:
{
  "brand": "store name or null",
  "card_number": "full card number or null",
  "pin": "PIN or security code or null",
  "balance": null,
  "expiration_date": "YYYY-MM-DD format or null",
  "confidence": 0.95,
  "raw_text": "all text you see on the card"
}"""
                    }
                ]
            }
        ],
        temperature=0,
        max_tokens=300
    )

    text = response.choices[0].message.content.strip()
    text = text.replace("```json", "").replace("```", "").strip()
    data = json.loads(text)
    
    # Parse expiration date if present
    exp_date = None
    if data.get("expiration_date"):
        try:
            exp_date = datetime.strptime(data["expiration_date"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass
    
    return GiftCardInfo(
        brand=data.get("brand"),
        card_number=data.get("card_number"),
        pin=data.get("pin"),
        balance=data.get("balance"),
        expiration_date=exp_date,
        raw_text=data.get("raw_text"),
        confidence=data.get("confidence", 0.0),
    )
