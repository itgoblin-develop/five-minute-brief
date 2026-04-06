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


# IT 6개 카테고리별 목표 클러스터 수 (제한 완화)
DEFAULT_TARGETS = {
    "mobile_device": {"min": 3, "max": 15},
    "ai_cloud": {"min": 3, "max": 15},
    "security_policy": {"min": 2, "max": 10},
    "dev_tech": {"min": 2, "max": 10},
    "biz_industry": {"min": 3, "max": 15},
    "trend_life": {"min": 2, "max": 10},
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

    # 영문↔한국어 브랜드명 정규화 (영문 기사와 한국어 기사가 같은 주제를 다루는 경우 클러스터링 정확도 향상)
    _BRAND_NORMALIZE = {
        'apple': '애플', 'iphone': '아이폰', 'ipad': '아이패드', 'macbook': '맥북',
        'google': '구글', 'android': '안드로이드', 'pixel': '픽셀',
        'microsoft': '마이크로소프트', 'windows': '윈도우',
        'samsung': '삼성', 'galaxy': '갤럭시',
        'meta': '메타', 'instagram': '인스타그램', 'whatsapp': '왓츠앱',
        'openai': 'openai', 'chatgpt': 'chatgpt', 'gpt': 'gpt',
        'nvidia': '엔비디아', 'amd': 'amd', 'qualcomm': '퀄컴',
        'tesla': '테슬라', 'spacex': '스페이스엑스',
        'amazon': '아마존', 'aws': 'aws', 'azure': 'azure',
        'tiktok': '틱톡', 'youtube': '유튜브',
    }

    def _normalize_text(self, text: str) -> str:
        """영문 브랜드명을 한국어로 정규화하여 영문·한국어 기사 간 클러스터링 정확도 향상"""
        t = text.lower()
        for en, ko in self._BRAND_NORMALIZE.items():
            t = t.replace(en, ko)
        return t

    def _cluster_articles(self, articles: List[dict], n_clusters: int) -> List[List[dict]]:
        """TF-IDF + 계층적 군집화로 기사 그룹핑"""

        # 제목 + 본문 앞 300자 결합 + 브랜드명 정규화
        texts = []
        for a in articles:
            title = a.get("title", "")
            content = a.get("content", "")[:300]
            texts.append(self._normalize_text(f"{title} {content}"))

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
        """클러스터 내 trend_score + 콘텐츠 풍부도 복합 점수로 대표 기사 선정"""
        def _composite_score(a):
            score = a.get("trend_score", 0)
            # 콘텐츠가 풍부한 기사 우선 (요약만 있는 기사보다 본문이 긴 기사)
            content_len = len(a.get("content", ""))
            if content_len >= 200:
                score *= 1.2
            return score
        return max(cluster, key=_composite_score)


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
