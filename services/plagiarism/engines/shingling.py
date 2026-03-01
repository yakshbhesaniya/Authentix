"""N-gram shingling for lexical overlap detection."""
import re
from typing import Set


def shingle(text: str, n: int = 5) -> Set[str]:
    """Return a set of n-gram word shingles from text."""
    text = re.sub(r"\s+", " ", text.lower().strip())
    words = text.split()
    if len(words) < n:
        return {" ".join(words)}
    return {" ".join(words[i : i + n]) for i in range(len(words) - n + 1)}
