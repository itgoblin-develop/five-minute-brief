#!/usr/bin/env python3
"""
Phase 3.5: AI 썸네일 생성 모듈
- Gemini 2.5 Flash Image (Nano Banana)로 기사별 썸네일 생성
- 실패 시 default_images 폴백 (기사 발행 차단 안 함)
"""

import io
import os
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

from PIL import Image as PILImage

from google import genai
from google.genai import types


CATEGORY_TRANSLATE = {
    "mobile": "mobile devices and smartphones",
    "pc": "personal computers, laptops and peripherals",
    "ai": "artificial intelligence and machine learning",
    "network": "5G 6G networking and telecom carriers",
    "security": "cybersecurity and information security",
    "etc": "general IT and technology",
    "모바일": "mobile devices and smartphones",
    "PC": "personal computers, laptops and peripherals",
    "AI": "artificial intelligence and machine learning",
    "네트워크/통신": "5G 6G networking and telecom carriers",
    "보안": "cybersecurity and information security",
    "기타": "general IT and technology",
}

CATEGORY_KR = {
    "mobile": "모바일",
    "pc": "PC",
    "ai": "AI",
    "network": "네트워크/통신",
    "security": "보안",
    "etc": "기타",
}

# 한글/영문 카테고리 키 → 내부 영문 키로 정규화
CATEGORY_KEY_MAP = {
    "mobile": "mobile", "pc": "pc", "ai": "ai",
    "network": "network", "security": "security", "etc": "etc",
    "모바일": "mobile", "PC": "pc", "AI": "ai",
    "네트워크/통신": "network", "보안": "security", "기타": "etc",
}

# 모든 썸네일에 공통 적용되는 도깨비 사이버펑크 베이스 스타일
BASE_STYLE = (
    "Dark cyberpunk digital illustration. "
    "Deep near-black background (#030213). "
    "Electric blue (#3D61F1) neon glow as primary accent light. "
    "Subtle Korean goblin (dokkaebi) motifs: glowing eyes watching from shadows, "
    "circuit board patterns shaped like goblin horns. "
    "Atmospheric depth with light rays and particle effects. "
    "ABSOLUTELY NO text, letters, numbers, characters, glyphs, symbols, "
    "runes, or writing of any kind anywhere in the image. "
    "Horizontal wide 16:9 landscape. "
    "Fill entire canvas edge-to-edge with no empty margins whatsoever. "
    "NO letterboxing, NO pillarboxing, NO borders, NO black bars, NO white bars, "
    "NO gray bars, NO padding of any color. The dark background must bleed to every edge."
)

# 카테고리별 시각 언어 정의 (subjects: 4가지 variation, index % 4로 순환)
CATEGORY_VISUAL = {
    "ai": {
        "subjects": [
            # 0: 신경망 성운
            "A vast neural network constellation floating in deep space. "
            "Interconnected glowing nodes pulsing with electric blue light. "
            "Data streams flowing like rivers of light between clusters. "
            "A central bright core radiating intelligence.",
            # 1: AI 휴머노이드
            "A humanoid AI figure made entirely of flowing light and circuit traces, "
            "emerging from digital mist. Glowing neural pathways visible through a translucent form. "
            "Electric blue eyes with infinite depth looking forward.",
            # 2: AI 의식
            "An abstract AI consciousness: concentric rings of thought patterns radiating outward "
            "from a blazing blue core. Fractal geometry of intelligence branching like a mind map in 3D space. "
            "Each node a different hue of blue and cyan.",
            # 3: 데이터 크리스탈
            "Torrents of electric blue data light streaming through crystalline geometric structures. "
            "Angular crystal formations refracting blue light into spectrum shards in deep darkness. "
            "A cathedral of data made of glass and light.",
        ],
        "mood": "awe-inspiring, vast scale, living intelligence",
        "accent": "electric blue and cyan",
    },
    "mobile": {
        "subjects": [
            # 0: 파티클 해체
            "Abstract smartphone silhouette dissolving into streams of light particles. "
            "Holographic interface layers floating in 3D space. "
            "Fingerprint pattern morphing into circuit traces. "
            "Signal waves radiating outward with neon blue rings.",
            # 1: 홀로그래픽 손
            "A glowing hand reaching toward a holographic smartphone interface floating in dark air. "
            "Electric blue light projections forming app icons and UI elements around the hand. "
            "Touch point glowing bright where fingertip meets the hologram.",
            # 2: 위성 신호
            "A satellite in low orbit beaming electric blue signal columns down to a dark Earth below. "
            "Wireless signal rings expanding outward from impact points on glowing city clusters. "
            "Stars visible in deep space behind the satellite.",
            # 3: 5G 도시 야경
            "5G antenna towers as luminous dark obelisks towering over a cyberpunk city skyline at night. "
            "Signal waves radiating as blue neon rings, overlapping across rooftops and streets below. "
            "City lights reflecting on wet pavement far below.",
        ],
        "mood": "sleek, connected, always-on",
        "accent": "electric blue and violet",
    },
    "pc": {
        "subjects": [
            # 0: CPU 도시
            "Extreme close-up of a CPU die with electric blue current flowing "
            "through transistor pathways like city lights from above. "
            "Heat dissipation rendered as aurora-like glow. "
            "Layered silicon architecture with depth-of-field blur.",
            # 1: 서버랙 복도
            "Interior of an endless server rack corridor stretching to a vanishing point. "
            "Blue status lights reflecting on polished dark floors, cables glowing like veins. "
            "Cooling fans generating visible light shimmer in the deep blue ambiance.",
            # 2: 마더보드 항공뷰
            "Aerial view of a motherboard circuit: electronic pathways glowing like rivers of light "
            "forming a city grid, capacitors as skyscrapers, traces as highways, "
            "all in electric blue on deep dark substrate.",
            # 3: 데이터센터 야경
            "A vast data center: endless rows of servers with electric blue status lights, "
            "cooling systems generating visible heat shimmer in the dark. "
            "Scale conveying immense computing power, cathedral-like ceiling overhead.",
        ],
        "mood": "precision, power, engineering beauty",
        "accent": "electric blue and cold white",
    },
    "network": {
        "subjects": [
            # 0: 지구 노드
            "Global network visualization: glowing nodes across a dark Earth silhouette. "
            "Fiber optic light streams connecting continents. "
            "5G signal towers rendered as luminous obelisks. "
            "Packet data flowing as golden-blue light pulses along curved paths.",
            # 1: 해저 케이블
            "Underwater fiber optic cables glowing on the dark ocean floor, "
            "connecting continents across vast abyssal plains. "
            "Bioluminescent-like blue glow in the deep sea darkness. "
            "Marine life silhouettes visible in the distance.",
            # 2: 인터넷 교환소
            "Internet exchange point interior: massive dark room where light beams from all directions "
            "converge at a central routing hub. "
            "Data highways visualized as towering blue light pillars meeting at a nexus.",
            # 3: 전파탑 하늘
            "Array of radio towers against a starry night sky. "
            "Invisible signals visualized as expanding blue wave rings overlapping in the dark air. "
            "Milky Way visible above, echoing the network patterns below.",
        ],
        "mood": "scale, interconnection, speed",
        "accent": "electric blue and deep teal",
    },
    "security": {
        "subjects": [
            # 0: 균열 방패
            "A glowing digital shield in the center, cracked at the edges with red light bleeding through. "
            "Binary streams cascading behind like rain on glass. "
            "Lock mechanism rendered in holographic wireframe. "
            "Warning light pulses in deep red contrasting against the blue palette.",
            # 1: 생체인식 스캐너
            "A glowing biometric scanner: fingerprint pattern rendered in electric blue light, "
            "surrounded by concentric security rings rotating slowly. "
            "Retina scan overlay adding multiple layers of verification in the dark.",
            # 2: 해커 vs 요새
            "A shadowy hooded figure facing an impenetrable glowing fortress of cascading code. "
            "The fortress walls shimmer with defensive blue light while red probes attempt entry. "
            "Battle lines of data visualized as laser-like beams.",
            # 3: 홀로그래픽 볼트
            "A holographic vault door with concentric ring locks, each glowing electric blue, rotating. "
            "Binary code streams flowing around the vault surface like protective aura. "
            "Deep space of encrypted data visible beyond the vault.",
        ],
        "mood": "tension, vigilance, digital threat",
        "accent": "electric blue with red warning accents",
    },
    "etc": {
        "subjects": [
            # 0: 헥사곤 공간
            "Abstract technology landscape: floating geometric shapes, "
            "hexagonal grid patterns fading into darkness. "
            "Soft neon blue light sources scattered throughout. "
            "A sense of infinite digital space with depth and atmosphere.",
            # 1: 데이터 나무
            "A glowing data tree: branching luminous structures spreading across a dark void, "
            "each branch carrying streams of electric blue information. "
            "Roots buried deep in circuits, canopy reaching toward a digital sky.",
            # 2: 와이어프레임 우주
            "Floating wireframe tech objects forming a miniature cosmos: keyboard, cloud, gear, atom, chip "
            "all rendered in electric blue wireframe, slowly orbiting a central glowing blue star.",
            # 3: 디지털 지평선
            "A circuit board plain extending to infinity, subtle grid lines glowing blue "
            "against near-black, with a faint electric horizon where data meets dark sky. "
            "Lone data towers rising at the vanishing point.",
        ],
        "mood": "futuristic, expansive, technological",
        "accent": "electric blue and indigo",
    },
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

        # 저장 경로: Docker는 THUMBNAILS_BASE_DIR 환경변수 우선, 없으면 프로젝트 루트 탐색
        today = datetime.now().strftime("%Y%m%d")
        thumbnails_base = os.getenv("THUMBNAILS_BASE_DIR")
        if thumbnails_base:
            self.output_dir = Path(thumbnails_base) / today
        else:
            project_root = self._find_project_root()
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

    def _crop_white_letterbox(self, image: PILImage.Image) -> PILImage.Image:
        """상하 흰색 레터박스 자동 제거 (PIL 전용)"""
        gray = image.convert('L')
        pixels = gray.load()
        w, h = image.size
        threshold = 238  # 흰색에 가까운 밝기 기준

        top = 0
        for y in range(h // 4):          # 상위 25%만 검사
            row_avg = sum(pixels[x, y] for x in range(w)) / w
            if row_avg > threshold:
                top = y + 1
            else:
                break

        bottom = h
        for y in range(h - 1, h * 3 // 4, -1):  # 하위 25%만 검사
            row_avg = sum(pixels[x, y] for x in range(w)) / w
            if row_avg > threshold:
                bottom = y
            else:
                break

        if top > 0 or bottom < h:
            print(f"    ✂️ 흰색 레터박스 제거: top={top}px, bottom={h - bottom}px")
            return image.crop((0, top, w, bottom))
        return image

    def _build_prompt(self, article: dict, index: int = 0) -> str:
        # 한글이 포함된 title, hashtags는 프롬프트에서 제거 (이미지 안 한글 깨짐 방지)
        # index % 4로 카테고리 내 4가지 variation 순환 (동일 카테고리 반복 방지)
        category = article.get("category", "etc")
        cat_key = CATEGORY_KEY_MAP.get(category, "etc")
        visual = CATEGORY_VISUAL[cat_key]
        subject = visual["subjects"][index % len(visual["subjects"])]

        return (
            f"{BASE_STYLE} "
            f"Scene: {subject} "
            f"Mood: {visual['mood']}. "
            f"Color accent: {visual['accent']}."
        )

    def generate_one(self, article: dict, index: int) -> Optional[str]:
        """
        단일 기사 썸네일 생성.
        성공 시 상대 URL 반환, 실패 시 None.
        """
        prompt = self._build_prompt(article, index)
        category = article.get("category", "Trend")
        category_kr = CATEGORY_KR.get(category, category)
        # 파일명에 사용할 수 없는 문자 제거 ("네트워크/통신" → "네트워크_통신")
        safe_category = category_kr.replace("/", "_").replace("\\", "_")

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    temperature=1.0,  # 다양성 증가
                ),
            )

            if not response.parts:
                print(f"    ⚠️ 빈 응답 (parts 없음): [{article.get('title', '')[:20]}...]")
                return None

            for part in response.parts:
                if part.inline_data is not None:
                    # raw bytes → PIL Image (as_image()의 반환 타입에 의존하지 않음)
                    image = PILImage.open(io.BytesIO(part.inline_data.data))
                    image = self._crop_white_letterbox(image)
                    filename = f"{safe_category}_{index}.png"
                    filepath = self.output_dir / filename
                    if filepath.exists():
                        filepath.unlink()
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
