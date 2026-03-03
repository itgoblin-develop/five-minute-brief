#!/usr/bin/env python3
"""
현결 자동 코멘트 생성기

비형(AI)이 작성한 브리핑에 현결(인간) 관점의 코멘트를 AI로 자동 생성한다.
"""

import sys
from pathlib import Path
from typing import Dict, Optional

PIPELINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_DIR / "reconstruction"))

PROMPT_PATH = PIPELINE_DIR / "reconstruction" / "prompts" / "hyungyeol_prompt.txt"


def generate_hyungyeol_comment(report: Dict, briefing_type: str) -> Optional[str]:
    """브리핑 리포트를 읽고 현결 톤의 짧은 코멘트를 생성"""
    import yaml
    from dotenv import load_dotenv
    from ai_rewriter import create_llm_router

    # 환경변수 로드
    project_root = PIPELINE_DIR.parent
    env_path = project_root / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    # config 로드
    config_path = PIPELINE_DIR / "reconstruction" / "config.yaml"
    config = {}
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

    # LLM 라우터 (짧은 출력)
    llm_config = config.get("llm", {})
    llm_config["max_output_tokens"] = 512
    llm_router = create_llm_router(llm_config)

    # 프롬프트 로드
    system_prompt = ""
    if PROMPT_PATH.exists():
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            system_prompt = f.read()

    # 브리핑 요약 구성
    title = report.get("title", "")
    keywords = report.get("top_keywords", [])
    keyword_str = ", ".join(
        kw.get("keyword", kw) if isinstance(kw, dict) else str(kw)
        for kw in keywords[:5]
    )

    if briefing_type == "daily":
        intro = report.get("intro_comment", "")
        comment = report.get("daily_comment", "")
        user_prompt = (
            f"비형이 오늘의 일간 브리핑을 작성했습니다.\n\n"
            f"제목: {title}\n"
            f"키워드: {keyword_str}\n"
            f"비형의 도입: {intro[:200]}\n"
            f"비형의 마무리: {comment[:200]}\n\n"
            f"위 내용을 읽고, 현결의 관점에서 1-3문장 코멘트를 남겨주세요."
        )
    elif briefing_type == "weekly":
        comment = report.get("weekly_comment", "")
        user_prompt = (
            f"비형이 주간 브리핑을 작성했습니다.\n\n"
            f"제목: {title}\n"
            f"키워드: {keyword_str}\n"
            f"비형의 코멘트: {comment[:300]}\n\n"
            f"위 내용을 읽고, 현결의 관점에서 1-3문장 코멘트를 남겨주세요."
        )
    elif briefing_type == "monthly":
        editorial = report.get("monthly_editorial", "")
        user_prompt = (
            f"비형이 월간 리포트를 작성했습니다.\n\n"
            f"제목: {title}\n"
            f"키워드: {keyword_str}\n"
            f"비형의 에디토리얼: {editorial[:400]}\n\n"
            f"위 내용을 읽고, 현결의 관점에서 1-3문장 코멘트를 남겨주세요."
        )
    else:
        return None

    try:
        # LLM 호출 (JSON 아닌 텍스트 응답)
        result = llm_router.generate_text(system_prompt, user_prompt)
        if result and isinstance(result, str):
            return result.strip()
        # dict 응답인 경우 (일부 LLM에서)
        if isinstance(result, dict):
            return result.get("content", result.get("text", str(result))).strip()
        return None
    except AttributeError:
        # generate_text 가 없는 경우 generate로 fallback
        try:
            result = llm_router.generate(system_prompt, user_prompt)
            if isinstance(result, str):
                return result.strip()
            if isinstance(result, dict):
                # JSON 응답에서 텍스트 추출
                for key in ["content", "text", "comment", "editor_comment"]:
                    if key in result:
                        return str(result[key]).strip()
                return str(result).strip()
            return None
        except Exception:
            return None
    except Exception:
        return None
