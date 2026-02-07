#!/usr/bin/env python3
"""
Phase 2: 주제 클러스터링 모듈
- TF-IDF 벡터화 (char_wb n-gram으로 한국어 최적화)
- 계층적 군집화 (Agglomerative Clustering)
- 카테고리별 목표 클러스터 수 기반 제어
"""

import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import AgglomerativeClustering


# 카테고리별 목표 클러스터 수
DEFAULT_TARGETS = {
    "Economy": {"min": 5, "max": 7},
    "Money": {"min": 3, "max": 5},
    "Society": {"min": 2, "max": 4},
    "Trend": {"min": 4, "max": 6},
}


class ArticleClusterer:
    """뉴스 기사 주제 클러스터링 (한국어 최적화)"""

    def __init__(self, config: dict = None):
        config = config or {}
        self.max_features = config.get("max_features", 5000)
        self.max_cluster_size = config.get("max_cluster_size", 10)
        self.targets = config.get("targets", DEFAULT_TARGETS)

        # output_targets 형식도 호환
        if not self.targets or all(isinstance(v, float) for v in self.targets.values()):
            self.targets = DEFAULT_TARGETS

    def cluster_by_category(self, articles_by_category: Dict[str, List[dict]]) -> Dict[str, List[List[dict]]]:
        """
        카테고리별로 기사를 클러스터링

        Args:
            articles_by_category: {"Economy": [...], "Money": [...], ...}

        Returns:
            카테고리별 클러스터 리스트
            {"Economy": [[기사1, 기사2], [기사3], ...], ...}
        """
        result = {}

        for category, articles in articles_by_category.items():
            if not articles:
                result[category] = []
                continue

            if len(articles) == 1:
                result[category] = [articles]
                print(f"     {category}: 1건 → 1개 클러스터")
                continue

            # 목표 클러스터 수 결정
            target = self.targets.get(category, {"min": 3, "max": 6})
            if isinstance(target, dict):
                target_n = (target.get("min", 3) + target.get("max", 6)) // 2
            else:
                target_n = int(target)

            # 기사 수가 목표보다 적으면 조정
            target_n = min(target_n, len(articles))

            clusters = self._cluster_articles(articles, target_n)

            # 대형 클러스터 분리
            split_clusters = []
            for cluster in clusters:
                if len(cluster) > self.max_cluster_size:
                    sub_n = max(2, len(cluster) // self.max_cluster_size + 1)
                    sub_clusters = self._cluster_articles(cluster, sub_n)
                    split_clusters.extend(sub_clusters)
                else:
                    split_clusters.append(cluster)

            # 대표 기사 마킹 (trend_score 최고)
            for cluster in split_clusters:
                representative = self._get_representative(cluster)
                for article in cluster:
                    article["_is_representative"] = (article is representative)

            result[category] = split_clusters
            sizes = sorted([len(c) for c in split_clusters], reverse=True)
            print(f"     {category}: {len(articles)}건 → {len(split_clusters)}개 클러스터 (목표: {target_n}, 크기: {sizes[:5]}{'...' if len(sizes) > 5 else ''})")

        total_clusters = sum(len(v) for v in result.values())
        print(f"  📊 클러스터링 결과: 총 {total_clusters}개 클러스터")

        return result

    def _cluster_articles(self, articles: List[dict], n_clusters: int) -> List[List[dict]]:
        """TF-IDF + 계층적 군집화로 기사 그룹핑"""

        # 제목 + 본문 앞 300자를 결합하여 텍스트 생성
        texts = []
        for a in articles:
            title = a.get("title", "")
            content = a.get("content", "")[:300]
            texts.append(f"{title} {content}")

        # TF-IDF 벡터화 (한국어 최적화: char_wb + 2~4 n-gram)
        vectorizer = TfidfVectorizer(
            max_features=self.max_features,
            analyzer="char_wb",
            ngram_range=(2, 4),
            min_df=1,
            max_df=0.85,
        )

        try:
            tfidf_matrix = vectorizer.fit_transform(texts)
        except ValueError as e:
            print(f"  ⚠️ TF-IDF 벡터화 실패: {e}")
            return [[a] for a in articles]

        if tfidf_matrix.shape[0] < 2:
            return [articles]

        # n_clusters가 기사 수 이상이면 개별 클러스터
        if n_clusters >= len(articles):
            return [[a] for a in articles]

        # 계층적 군집화 (n_clusters 직접 지정)
        try:
            clustering = AgglomerativeClustering(
                n_clusters=n_clusters,
                metric="cosine",
                linkage="average",
            )
            labels = clustering.fit_predict(tfidf_matrix.toarray())
        except Exception as e:
            print(f"  ⚠️ 클러스터링 실패: {e}")
            return [[a] for a in articles]

        # 라벨별 그룹핑
        clusters = {}
        for idx, label in enumerate(labels):
            clusters.setdefault(label, []).append(articles[idx])

        # 클러스터를 크기 내림차순 정렬
        sorted_clusters = sorted(clusters.values(), key=len, reverse=True)

        return sorted_clusters

    def _get_representative(self, cluster: List[dict]) -> dict:
        """클러스터 내 trend_score가 가장 높은 기사를 대표 기사로 선정"""
        return max(cluster, key=lambda a: a.get("trend_score", 0))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Phase 2: 주제 클러스터링")
    parser.add_argument("--input", required=True, help="전처리된 기사 JSON 파일 경로")
    parser.add_argument("--output", default=None, help="클러스터링 결과 출력 경로")
    args = parser.parse_args()

    print("🚀 Phase 2: 주제 클러스터링 시작")

    with open(args.input, "r", encoding="utf-8") as f:
        articles_by_category = json.load(f)

    clusterer = ArticleClusterer()
    clusters = clusterer.cluster_by_category(articles_by_category)

    if args.output:
        output_data = {}
        for category, cluster_list in clusters.items():
            output_data[category] = []
            for cluster in cluster_list:
                output_data[category].append({
                    "cluster_size": len(cluster),
                    "representative": next(
                        (a["title"] for a in cluster if a.get("_is_representative")),
                        cluster[0]["title"] if cluster else ""
                    ),
                    "articles": cluster,
                })
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"✅ 결과 저장: {args.output}")
    else:
        for category, cluster_list in clusters.items():
            print(f"\n  [{category}]")
            for i, cluster in enumerate(cluster_list):
                rep = next((a for a in cluster if a.get("_is_representative")), cluster[0])
                print(f"    클러스터 {i+1} ({len(cluster)}건): {rep['title'][:50]}...")
