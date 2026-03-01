"""MinHash + LSH for scalable candidate retrieval."""
from datasketch import MinHash, MinHashLSH
from typing import Set, List


class MinHashLSHEngine:
    def __init__(self, threshold: float = 0.3, num_perm: int = 128):
        self.threshold = threshold
        self.num_perm = num_perm
        self.lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
        self._store: dict = {}

    def _make_minhash(self, shingles: Set[str]) -> MinHash:
        m = MinHash(num_perm=self.num_perm)
        for s in shingles:
            m.update(s.encode("utf-8"))
        return m

    def add(self, doc_id: str, shingles: Set[str]) -> None:
        if doc_id in self._store:
            return
        m = self._make_minhash(shingles)
        self.lsh.insert(doc_id, m)
        self._store[doc_id] = m

    def query(self, shingles: Set[str]) -> List[str]:
        if not shingles:
            return []
        m = self._make_minhash(shingles)
        return self.lsh.query(m)

    def jaccard(self, shingles_a: Set[str], doc_id: str) -> float:
        if doc_id not in self._store:
            return 0.0
        m_a = self._make_minhash(shingles_a)
        return m_a.jaccard(self._store[doc_id])
