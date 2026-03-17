#!/usr/bin/env python3
"""
앱 스토어 수집 대상 앱 기본 설정
- DB에 초기 앱 목록 시딩 (Play Store + App Store)
- ica_2week_ai_feedback_automation 프로젝트에서 가져온 42개 앱
"""

import logging

logger = logging.getLogger(__name__)

# Android 패키지 ID → iOS App Store ID 매핑
# iTunes Search API + 수동 보정으로 매핑
APPSTORE_ID_MAP = {
    "com.android.chrome": 535886823,           # Google Chrome
    "com.google.android.youtube": 544007664,   # Youtube
    "com.instagram.android": 389801252,        # Instagram
    "com.ss.android.ugc.trill": 1235601864,    # TikTok
    "com.nhn.android.search": 393499958,       # 네이버
    "com.kakaopay.app": 1464496236,            # 카카오페이
    "viva.republica.toss": 839333328,          # 토스
    "com.coupang.mobile": 454434967,           # 쿠팡
    "com.towneers.www": 1018769995,            # 당근
    "com.netflix.mediaclient": 363590051,      # Netflix
    "kr.co.captv.pooqV2": 987782077,           # Wavve
    "net.cj.cjhv.gs.tving": 400101401,        # TVING
    "com.iloen.melon": 415597317,              # 멜론
    "skplanet.musicmate": 1129048043,          # FLO
    "com.nhn.android.webtoon": 315795555,      # 네이버 웹툰
    "com.kakao.talk": 362057947,               # 카카오톡
    "com.sampleapp": 378084485,                # 배달의민족
    "com.fineapp.yogiyo": 543831532,           # 요기요
    "com.coupang.mobile.eats": 1445504255,     # 쿠팡이츠
    "com.nhn.android.nmap": 311867728,         # 네이버지도
    "net.daum.android.map": 304608425,         # 카카오맵
    "com.kakao.taxi": 981110422,               # 카카오 T
    "com.openai.chatgpt": 6448311069,          # ChatGPT
    "com.anthropic.claude": 6473753684,        # Claude
    "com.google.android.apps.bard": 6477489729,# Google Gemini
    "com.wrtn.app": 6448556170,                # 뤼튼
    "com.lemon.lvoverseas": 1500855883,        # CapCut
    "kr.go.minwon.m": 586454505,               # 정부24
    "com.sktelecom.tauth": 1141258007,         # PASS by SKT
    "com.samsung.android.oneconnect": 1222822904,  # SmartThings
    "com.samsung.android.app.watchmanager": 1117310635,  # Galaxy Wearable
}

# 기본 앱 목록: (name, package_id, store_url, category)
DEFAULT_APPS = [
    # 브라우저 & 미디어
    ("Google Chrome", "com.android.chrome", "https://play.google.com/store/apps/details?id=com.android.chrome&hl=ko", "브라우저"),
    ("Youtube", "com.google.android.youtube", "https://play.google.com/store/apps/details?id=com.google.android.youtube&hl=ko", "동영상"),
    ("Instagram", "com.instagram.android", "https://play.google.com/store/apps/details?id=com.instagram.android&hl=ko", "소셜미디어"),
    ("TikTok", "com.ss.android.ugc.trill", "https://play.google.com/store/apps/details?id=com.ss.android.ugc.trill&hl=ko", "소셜미디어"),

    # 검색 & 포털
    ("네이버", "com.nhn.android.search", "https://play.google.com/store/apps/details?id=com.nhn.android.search&hl=ko", "포털"),

    # 금융
    ("Samsung Wallet", "com.samsung.android.spay", "https://play.google.com/store/apps/details?id=com.samsung.android.spay&hl=ko", "금융"),
    ("카카오페이", "com.kakaopay.app", "https://play.google.com/store/apps/details?id=com.kakaopay.app&hl=ko", "금융"),
    ("토스", "viva.republica.toss", "https://play.google.com/store/apps/details?id=viva.republica.toss&hl=ko", "금융"),

    # 쇼핑 & 커머스
    ("쿠팡", "com.coupang.mobile", "https://play.google.com/store/apps/details?id=com.coupang.mobile&hl=ko", "쇼핑"),
    ("당근", "com.towneers.www", "https://play.google.com/store/apps/details?id=com.towneers.www&hl=ko", "중고거래"),

    # 스트리밍 (영상)
    ("Netflix", "com.netflix.mediaclient", "https://play.google.com/store/apps/details?id=com.netflix.mediaclient&hl=ko", "스트리밍"),
    ("Wavve", "kr.co.captv.pooqV2", "https://play.google.com/store/apps/details?id=kr.co.captv.pooqV2&hl=ko", "스트리밍"),
    ("TVING", "net.cj.cjhv.gs.tving", "https://play.google.com/store/apps/details?id=net.cj.cjhv.gs.tving&hl=ko", "스트리밍"),

    # 음악
    ("멜론", "com.iloen.melon", "https://play.google.com/store/apps/details?id=com.iloen.melon&hl=ko", "음악"),
    ("FLO", "skplanet.musicmate", "https://play.google.com/store/apps/details?id=skplanet.musicmate&hl=ko", "음악"),

    # 웹툰 & 메신저
    ("네이버 웹툰", "com.nhn.android.webtoon", "https://play.google.com/store/apps/details?id=com.nhn.android.webtoon&hl=ko", "웹툰"),
    ("카카오톡", "com.kakao.talk", "https://play.google.com/store/apps/details?id=com.kakao.talk&hl=ko", "메신저"),

    # 배달
    ("배달의 민족", "com.sampleapp", "https://play.google.com/store/apps/details?id=com.sampleapp&hl=ko", "배달"),
    ("배달요기요", "com.fineapp.yogiyo", "https://play.google.com/store/apps/details?id=com.fineapp.yogiyo&hl=ko", "배달"),
    ("쿠팡이츠", "com.coupang.mobile.eats", "https://play.google.com/store/apps/details?id=com.coupang.mobile.eats&hl=ko", "배달"),
    ("땡겨요", "com.shinhan.o2o", "https://play.google.com/store/apps/details?id=com.shinhan.o2o&hl=ko", "배달"),

    # 지도 & 교통
    ("네이버지도", "com.nhn.android.nmap", "https://play.google.com/store/apps/details?id=com.nhn.android.nmap&hl=ko", "지도"),
    ("카카오맵", "net.daum.android.map", "https://play.google.com/store/apps/details?id=net.daum.android.map&hl=ko", "지도"),
    ("카카오 T", "com.kakao.taxi", "https://play.google.com/store/apps/details?id=com.kakao.taxi&hl=ko", "교통"),

    # IoT & 웨어러블
    ("Galaxy Wearable", "com.samsung.android.app.watchmanager", "https://play.google.com/store/apps/details?id=com.samsung.android.app.watchmanager&hl=ko", "웨어러블"),
    ("SmartThings", "com.samsung.android.oneconnect", "https://play.google.com/store/apps/details?id=com.samsung.android.oneconnect&hl=ko", "IoT"),

    # 통신사 서비스
    ("PASS by SKT", "com.sktelecom.tauth", "https://play.google.com/store/apps/details?id=com.sktelecom.tauth&hl=ko", "통신"),
    ("T world", "com.sktelecom.minit", "https://play.google.com/store/apps/details?id=com.sktelecom.minit&hl=ko", "통신"),
    ("에이닷 전화", "com.skt.prod.dialer", "https://play.google.com/store/apps/details?id=com.skt.prod.dialer&hl=ko", "통신"),
    ("에이닷 통화녹음", "com.skt.prod.tphonerecorder.samsung", "https://play.google.com/store/apps/details?id=com.skt.prod.tphonerecorder.samsung&hl=ko", "통신"),
    ("T 멤버십", "com.tms", "https://play.google.com/store/apps/details?id=com.tms&hl=ko", "통신"),
    ("누구 스마트홈", "com.skt.sh", "https://play.google.com/store/apps/details?id=com.skt.sh&hl=ko", "IoT"),
    ("에이닷", "com.skt.nugu.apollo", "https://play.google.com/store/apps/details?id=com.skt.nugu.apollo&hl=ko", "AI"),

    # AI 서비스
    ("ChatGPT", "com.openai.chatgpt", "https://play.google.com/store/apps/details?id=com.openai.chatgpt&hl=ko", "AI"),
    ("Claude by Anthropic", "com.anthropic.claude", "https://play.google.com/store/apps/details?id=com.anthropic.claude&hl=ko", "AI"),
    ("Google Gemini", "com.google.android.apps.bard", "https://play.google.com/store/apps/details?id=com.google.android.apps.bard&hl=ko", "AI"),
    ("뤼튼", "com.wrtn.app", "https://play.google.com/store/apps/details?id=com.wrtn.app&hl=ko", "AI"),
    ("Grok AI", "ai.x.grok", "https://play.google.com/store/apps/details?id=ai.x.grok&hl=ko", "AI"),
    ("SEIO Agent", "com.skp.seio", "https://play.google.com/store/apps/details?id=com.skp.seio&hl=ko", "AI"),

    # 기타
    ("CapCut", "com.lemon.lvoverseas", "https://play.google.com/store/apps/details?id=com.lemon.lvoverseas&hl=ko", "동영상편집"),
    ("Bill Letter", "com.skt.smartbill", "https://play.google.com/store/apps/details?id=com.skt.smartbill&hl=ko", "금융"),
    ("정부24", "kr.go.minwon.m", "https://play.google.com/store/apps/details?id=kr.go.minwon.m&hl=ko", "정부서비스"),
]


def seed_apps(conn):
    """DB에 기본 앱 목록 시딩 — Play Store + App Store (이미 있으면 스킵)"""
    cur = conn.cursor()
    added = 0

    # Play Store 앱 시딩
    for name, package_id, store_url, category in DEFAULT_APPS:
        cur.execute(
            "SELECT 1 FROM playstore_apps WHERE package_id = %s",
            (package_id,)
        )
        if cur.fetchone():
            # 기존 Play Store 앱에 app_store_id 업데이트 (매핑 있으면)
            appstore_id = APPSTORE_ID_MAP.get(package_id)
            if appstore_id:
                cur.execute(
                    "UPDATE playstore_apps SET app_store_id = %s WHERE package_id = %s AND app_store_id IS NULL",
                    (appstore_id, package_id)
                )
            continue

        appstore_id = APPSTORE_ID_MAP.get(package_id)
        cur.execute(
            """INSERT INTO playstore_apps (package_id, name, store_url, category, is_active, store_type, app_store_id)
               VALUES (%s, %s, %s, %s, TRUE, 'playstore', %s)""",
            (package_id, name, store_url, category, appstore_id)
        )
        added += 1
        logger.info(f"앱 추가: {name} ({package_id})")

    # App Store 전용 앱 시딩 (Play Store에 없는 iOS 앱 — 현재는 매핑 기반이라 별도 없음)

    conn.commit()
    logger.info(f"앱 시딩 완료: {added}개 추가 (기존 {len(DEFAULT_APPS) - added}개 스킵)")
    return added
