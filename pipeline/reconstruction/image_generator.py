#!/usr/bin/env python3
"""
Phase 3.5: AI 썸네일 생성 모듈
- Gemini 2.5 Flash Image (Nano Banana)로 기사별 썸네일 생성
- 실패 시 default_images 폴백 (기사 발행 차단 안 함)
"""

import os
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

from google import genai
from google.genai import types


CATEGORY_TRANSLATE = {
    "mobile_device": "mobile devices and smartphones",
    "ai_cloud": "artificial intelligence and cloud computing",
    "security_policy": "cybersecurity and IT policy",
    "dev_tech": "software development and technology",
    "biz_industry": "tech business and industry",
    "trend_life": "tech trends and digital lifestyle",
    "모바일·디바이스": "mobile devices and smartphones",
    "AI·클라우드": "artificial intelligence and cloud computing",
    "보안·정책": "cybersecurity and IT policy",
    "개발·테크": "software development and technology",
    "기업·산업": "tech business and industry",
    "트렌드·라이프": "tech trends and digital lifestyle",
}

CATEGORY_KR = {
    "mobile_device": "모바일·디바이스",
    "ai_cloud": "AI·클라우드",
    "security_policy": "보안·정책",
    "dev_tech": "개발·테크",
    "biz_industry": "기업·산업",
    "trend_life": "트렌드·라이프",
}


class ThumbnailGenerator:
    def __init__(self, image_config: dict):
        self.config = image_config
        self.model = image_config.get("model", "gemini-2.5-flash-image")
        self.interval = image_config.get("request_interval", 1.0)
        self.default_images = image_config.get("default_images", {})

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")
        self.client = genai.Client(api_key=api_key)

        # 저장 경로: app/backend/public/thumbnails/YYYYMMDD/
        project_root = self._find_project_root()
        today = datetime.now().strftime("%Y%m%d")
        self.output_dir = project_root / "app" / "backend" / "public" / "thumbnails" / today
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.date_str = today

    def _find_project_root(self) -> Path:
        current = Path(__file__).resolve().parent
        for _ in range(5):
            if (current / ".git").exists() or (current / ".env").exists():
                return current
            parent = current.parent
            if parent == current:
                break
            current = parent
        return Path(__file__).resolve().parent.parent.parent

    def _build_prompt(self, article: dict) -> str:
        title = article.get("title", "")
        category = article.get("category", "Trend")
        hashtags = article.get("hashtags", [])
        category_en = CATEGORY_TRANSLATE.get(category, "news")
        tags_str = ", ".join(hashtags[:3]) if hashtags else ""

        return (
            f"Create a photorealistic news thumbnail image for a Korean news article. "
            f"Category: {category_en}. "
            f"Article title: {title}. "
            f"Related keywords: {tags_str}. "
            f"Requirements: NO text or letters in the image, clean composition, "
            f"professional news media style, suitable as a 16:9 thumbnail."
        )

    def generate_one(self, article: dict, index: int) -> Optional[str]:
        """
        단일 기사 썸네일 생성.
        성공 시 상대 URL 반환, 실패 시 None.
        """
        prompt = self._build_prompt(article)
        category = article.get("category", "Trend")
        category_kr = CATEGORY_KR.get(category, category)

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                ),
            )

            for part in response.parts:
                if part.inline_data is not None:
                    image = part.as_image()
                    filename = f"{category_kr}_{index}.png"
                    filepath = self.output_dir / filename
                    image.save(str(filepath))
                    relative_url = f"/thumbnails/{self.date_str}/{filename}"
                    return relative_url

            print(f"    ⚠️ 이미지 파트 없음: [{article.get('title', '')[:20]}...]")
            return None

        except Exception as e:
            print(f"    ❌ 썸네일 생성 실패 [{article.get('title', '')[:20]}...]: {e}")
            return None

    def generate_all(self, articles: List[dict]) -> List[dict]:
        """
        전체 기사 썸네일 생성.
        각 article dict에 image_url 필드 추가.
        """
        print(f"  🎨 썸네일 생성 시작 ({len(articles)}건)")

        # 카테고리별 인덱스 추적
        cat_counters: Dict[str, int] = {}
        success = 0
        fallback = 0

        for article in articles:
            category = article.get("category", "Trend")
            cat_counters[category] = cat_counters.get(category, 0) + 1
            idx = cat_counters[category]

            image_url = self.generate_one(article, idx)

            if image_url:
                article["image_url"] = image_url
                success += 1
            else:
                # 폴백: default_images 사용
                category_kr = CATEGORY_KR.get(category, category)
                default = self.default_images.get(category_kr, "")
                article["image_url"] = default
                fallback += 1

            # rate limit 대기
            if self.interval > 0:
                time.sleep(self.interval)

        print(f"  ✅ 썸네일 생성 완료: {success}건 성공, {fallback}건 폴백")
        return articles
