#!/usr/bin/env python3
"""
Phase 3: AI 재구성 모듈
- LLM 클라이언트 (Gemini, OpenAI) 추상화
- LLMRouter: 메인/폴백 자동 전환 + 재시도
- AIRewriter: 클러스터 → 재구성 기사 변환
"""

import json
import os
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, List, Optional


class LLMClient(ABC):
    """LLM API 클라이언트 추상 클래스"""

    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str) -> dict:
        """JSON 형태의 응답을 반환"""
        pass

    @abstractmethod
    def name(self) -> str:
        """클라이언트 이름 반환"""
        pass


class GeminiClient(LLMClient):
    """Google Gemini API 클라이언트 (google-genai SDK)"""

    def __init__(self, api_key: str = None, temperature: float = 0.7, max_output_tokens: int = 2048):
        from google import genai
        from google.genai import types

        api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")

        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-2.0-flash"
        self.temperature = temperature
        self.max_output_tokens = max_output_tokens
        self._types = types

    def generate(self, system_prompt: str, user_prompt: str) -> dict:
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=f"{system_prompt}\n\n{user_prompt}",
            config=self._types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=self.temperature,
                max_output_tokens=self.max_output_tokens,
            ),
        )
        return json.loads(response.text)

    def name(self) -> str:
        return "gemini"


class OpenAIClient(LLMClient):
    """OpenAI API 클라이언트"""

    def __init__(self, api_key: str = None, temperature: float = 0.7, max_tokens: int = 2048):
        from openai import OpenAI

        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.temperature = temperature
        self.max_tokens = max_tokens

    def generate(self, system_prompt: str, user_prompt: str) -> dict:
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )
        return json.loads(response.choices[0].message.content)

    def name(self) -> str:
        return "openai"


class LLMRouter:
    """메인/폴백 LLM 자동 전환 라우터 (재시도 로직 통합)"""

    def __init__(self, primary: LLMClient = None, fallback: LLMClient = None,
                 max_retries: int = 3, retry_delay_base: int = 1):
        self.primary = primary
        self.fallback = fallback
        self.max_retries = max_retries
        self.retry_delay_base = retry_delay_base

        # 통계
        self.stats = {
            "primary_success": 0,
            "primary_fail": 0,
            "fallback_success": 0,
            "fallback_fail": 0,
        }

    def generate(self, system_prompt: str, user_prompt: str) -> dict:
        """재시도 + 폴백이 통합된 LLM 호출"""

        # 메인 API 재시도
        if self.primary:
            for attempt in range(self.max_retries):
                try:
                    result = self.primary.generate(system_prompt, user_prompt)
                    self.stats["primary_success"] += 1
                    return result
                except Exception as e:
                    wait = min(self.retry_delay_base * (2 ** attempt), 30)
                    print(f"  ⚠️ {self.primary.name()} 실패 (시도 {attempt + 1}/{self.max_retries}): {e}")
                    self.stats["primary_fail"] += 1
                    if attempt < self.max_retries - 1:
                        time.sleep(wait)

        # 폴백 API 시도
        if self.fallback:
            print(f"  🔄 폴백 API ({self.fallback.name()})로 전환")
            for attempt in range(self.max_retries):
                try:
                    result = self.fallback.generate(system_prompt, user_prompt)
                    self.stats["fallback_success"] += 1
                    return result
                except Exception as e:
                    wait = min(self.retry_delay_base * (2 ** attempt), 30)
                    print(f"  ⚠️ {self.fallback.name()} 폴백 실패 (시도 {attempt + 1}/{self.max_retries}): {e}")
                    self.stats["fallback_fail"] += 1
                    if attempt < self.max_retries - 1:
                        time.sleep(wait)

        raise RuntimeError("모든 LLM API 호출 실패")

    def get_stats(self) -> dict:
        return self.stats.copy()


def build_articles_block(cluster: List[dict], max_chars_per_article: int = 1500) -> str:
    """클러스터 내 기사들을 프롬프트에 삽입할 텍스트 블록으로 변환"""
    blocks = []
    for i, article in enumerate(cluster, 1):
        content = article.get("content", "")[:max_chars_per_article]
        block = f"""--- 기사 {i} ---
[제목] {article.get('title', '')}
[출처] {article.get('press', '알 수 없음')}
[내용]
{content}
"""
        blocks.append(block)
    return "\n".join(blocks)


class AIRewriter:
    """AI 뉴스 재구성기"""

    def __init__(self, llm_router: LLMRouter, config: dict = None):
        self.llm = llm_router
        self.config = config or {}
        self.request_interval = self.config.get("request_interval", 0.5)

        # 프롬프트 로드
        self.system_prompt = self._load_prompt("system_prompt.txt")
        self.merge_template = self._load_prompt("merge_prompt.txt")
        self.single_template = self._load_prompt("single_prompt.txt")

    def _load_prompt(self, filename: str) -> str:
        """프롬프트 파일 로드"""
        prompt_dir = Path(__file__).parent / "prompts"
        prompt_path = prompt_dir / filename
        if not prompt_path.exists():
            raise FileNotFoundError(f"프롬프트 파일을 찾을 수 없습니다: {prompt_path}")
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()

    def reconstruct_cluster(self, cluster: List[dict], category: str) -> Optional[dict]:
        """하나의 클러스터를 재구성 기사로 변환"""

        if not cluster:
            return None

        if len(cluster) == 1:
            article = cluster[0]
            user_prompt = self.single_template.format(
                category=category,
                title=article.get("title", ""),
                press=article.get("press", "알 수 없음"),
                content=article.get("content", "")[:2000],
            )
        else:
            articles_block = build_articles_block(cluster)
            user_prompt = self.merge_template.format(
                article_count=len(cluster),
                category=category,
                articles_block=articles_block,
            )

        # LLM 호출 (LLMRouter가 재시도+폴백 처리)
        try:
            result = self.llm.generate(self.system_prompt, user_prompt)

            # 필수 필드 존재 확인
            required_fields = ["title", "summary", "bullet_summary", "content", "hashtags"]
            for field in required_fields:
                if field not in result:
                    print(f"  ⚠️ LLM 응답에 '{field}' 필드 누락")
                    result[field] = self._get_default_value(field, cluster)

            return result
        except RuntimeError:
            print(f"  ❌ 클러스터 재구성 실패 (기사 {len(cluster)}건), 폴백 재구성 사용")
            return self._fallback_reconstruct(cluster, category)

    def _get_default_value(self, field: str, cluster: List[dict]):
        """누락된 필드의 기본값 생성"""
        representative = max(cluster, key=lambda a: a.get("trend_score", 0))

        if field == "title":
            return representative.get("title", "제목 없음")[:30]
        elif field == "summary":
            return representative.get("content", "")[:200]
        elif field == "bullet_summary":
            return ["요약 정보 1", "요약 정보 2", "요약 정보 3"]
        elif field == "content":
            return representative.get("content", "")[:600]
        elif field == "hashtags":
            return representative.get("matched_keywords", [])[:5] or ["뉴스"]
        return ""

    def _fallback_reconstruct(self, cluster: List[dict], category: str) -> dict:
        """LLM 완전 실패 시 원문 기반 간이 재구성"""
        representative = max(cluster, key=lambda a: a.get("trend_score", 0))
        content = representative.get("content", "")

        # 문장 경계 기준으로 분리
        sentences = [s.strip() for s in content.replace('.\n', '. ').split('.') if s.strip()]

        return {
            "title": representative.get("title", "")[:30],
            "summary": '. '.join(sentences[:2]) + '.' if len(sentences) >= 2 else content[:200],
            "bullet_summary": [
                sentences[0][:40] if len(sentences) > 0 else "요약 생성 불가",
                sentences[1][:40] if len(sentences) > 1 else "추가 정보 없음",
                sentences[2][:40] if len(sentences) > 2 else "상세 내용은 원문 참조",
            ],
            "content": '. '.join(sentences[:6]) + '.' if len(sentences) >= 6 else content[:600],
            "hashtags": representative.get("matched_keywords", [])[:5] or ["뉴스"],
            "_fallback": True,
        }

    def reconstruct_all(self, clustered_data: Dict[str, List[List[dict]]]) -> List[dict]:
        """전체 카테고리의 클러스터를 순차 재구성"""
        results = []
        total_clusters = sum(len(clusters) for clusters in clustered_data.values())
        processed = 0

        for category, clusters in clustered_data.items():
            for cluster in clusters:
                processed += 1
                print(f"  🔄 [{processed}/{total_clusters}] {category} - {len(cluster)}건 병합 중...")

                result = self.reconstruct_cluster(cluster, category)
                if result:
                    result["category"] = category
                    result["source_count"] = len(cluster)
                    result["source_links"] = [a.get("link", "") for a in cluster]
                    result["_source_articles"] = cluster
                    results.append(result)

                # Rate limit 대응
                if processed < total_clusters:
                    time.sleep(self.request_interval)

        fallback_count = sum(1 for r in results if r.get("_fallback"))
        print(f"  📊 재구성 결과: {len(results)}건 (폴백: {fallback_count}건)")

        return results


def create_llm_router(config: dict = None) -> LLMRouter:
    """설정 기반 LLMRouter 생성 팩토리"""
    config = config or {}
    primary_type = config.get("primary", os.getenv("LLM_PRIMARY", "gemini"))
    fallback_type = config.get("fallback", os.getenv("LLM_FALLBACK", "openai"))
    temperature = config.get("temperature", 0.7)
    max_output_tokens = config.get("max_output_tokens", 2048)
    max_retries = config.get("retry_count", 3)
    retry_delay_base = config.get("retry_delay_base", 1)

    clients = {}

    # 필요한 클라이언트만 생성
    needed = set([primary_type, fallback_type]) - {"none", ""}
    for client_type in needed:
        try:
            if client_type == "gemini":
                clients["gemini"] = GeminiClient(
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                )
            elif client_type == "openai":
                clients["openai"] = OpenAIClient(
                    temperature=temperature,
                    max_tokens=max_output_tokens,
                )
        except (ValueError, ImportError) as e:
            print(f"  ⚠️ {client_type} 클라이언트 초기화 실패: {e}")

    primary = clients.get(primary_type)
    fallback = clients.get(fallback_type)

    if not primary and not fallback:
        print("  ⚠️ 사용 가능한 LLM API가 없습니다. 폴백 재구성만 사용됩니다.")

    return LLMRouter(
        primary=primary,
        fallback=fallback,
        max_retries=max_retries,
        retry_delay_base=retry_delay_base,
    )
