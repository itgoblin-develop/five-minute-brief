#!/usr/bin/env python3
"""
브리핑 커버 이미지 생성 모듈

Gemini 2.5 Flash Image 모델로 일간/주간/월간 브리핑 커버 이미지를 생성한다.
기존 image_generator.py의 ThumbnailGenerator 패턴을 재사용.

사용법:
    from briefing_image_generator import BriefingCoverGenerator
    gen = BriefingCoverGenerator()
    url = gen.generate("daily", title="오늘의 IT 브리핑", keywords=["AI", "갤럭시"], date_str="20260302")
"""

import os
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from google import genai
from google.genai import types


# 브리핑 타입별 프롬프트 스타일
BRIEFING_STYLES = {
    "daily": {
        "style": "modern minimalist tech news digest",
        "mood": "energetic, fresh morning tech news vibe",
        "colors": "emerald green and teal gradients",
    },
    "weekly": {
        "style": "professional weekly tech report cover",
        "mood": "analytical, big-picture overview of the week",
        "colors": "blue and indigo gradients",
    },
    "monthly": {
        "style": "premium monthly tech magazine cover",
        "mood": "authoritative, deep-dive analysis",
        "colors": "purple and pink gradients",
    },
}


class BriefingCoverGenerator:
    """브리핑 커버 이미지 생성기"""

    def __init__(self, model: str = "gemini-2.5-flash-image"):
        self.model = model
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")
        self.client = genai.Client(api_key=api_key)

        # 저장 경로: 환경변수 우선, 없으면 프로젝트 루트 탐색
        # Docker 컨테이너에서는 THUMBNAILS_OUTPUT_DIR 환경변수로 주입
        thumbnails_dir = os.getenv("THUMBNAILS_OUTPUT_DIR")
        if thumbnails_dir:
            self.output_dir = Path(thumbnails_dir)
        else:
            project_root = self._find_project_root()
            self.output_dir = project_root / "app" / "backend" / "public" / "thumbnails" / "briefing"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _find_project_root(self) -> Path:
        """프로젝트 루트 디렉토리 탐색"""
        current = Path(__file__).resolve().parent
        for _ in range(5):
            if (current / ".git").exists() or (current / ".env").exists():
                return current
            parent = current.parent
            if parent == current:
                break
            current = parent
        return Path(__file__).resolve().parent.parent.parent

    def _build_prompt(self, briefing_type: str, title: str, keywords: List[str]) -> str:
        """브리핑 타입별 이미지 생성 프롬프트 구성"""
        style_info = BRIEFING_STYLES.get(briefing_type, BRIEFING_STYLES["daily"])
        keywords_str = ", ".join(keywords[:5]) if keywords else "technology, innovation"

        return (
            f"Create a wide landscape abstract conceptual cover image for an IT news briefing. "
            f"Style: {style_info['style']}. "
            f"Mood: {style_info['mood']}. "
            f"Color palette: {style_info['colors']}. "
            f"The image should evoke themes of: {keywords_str}. "
            f"Requirements: "
            f"NO text, NO letters, NO words in the image. "
            f"Clean abstract composition with geometric shapes, light effects, and subtle tech motifs. "
            f"Professional, modern design in wide 16:9 landscape format. "
            f"High contrast, visually striking. "
            f"IMPORTANT: Fill the entire canvas edge-to-edge with no black bars, no letterboxing, no borders."
        )

    def generate(
        self,
        briefing_type: str,
        title: str = "",
        keywords: Optional[List[str]] = None,
        date_str: str = "",
    ) -> Optional[str]:
        """
        브리핑 커버 이미지 생성.

        Args:
            briefing_type: "daily" | "weekly" | "monthly"
            title: 브리핑 제목
            keywords: 주요 키워드 리스트
            date_str: 날짜/주차/월 문자열 (파일명에 사용)

        Returns:
            상대 URL (예: /thumbnails/briefing/daily_20260302.png) 또는 None
        """
        if not date_str:
            date_str = datetime.now().strftime("%Y%m%d")

        prompt = self._build_prompt(briefing_type, title, keywords or [])

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
                    filename = f"{briefing_type}_{date_str}.png"
                    filepath = self.output_dir / filename
                    if filepath.exists():
                        filepath.unlink()
                    image.save(str(filepath))
                    relative_url = f"/thumbnails/briefing/{filename}"
                    print(f"  🎨 커버 이미지 생성 완료: {relative_url}")
                    return relative_url

            print(f"  ⚠️ 커버 이미지: 이미지 파트 없음")
            return None

        except Exception as e:
            print(f"  ❌ 커버 이미지 생성 실패: {e}")
            return None
