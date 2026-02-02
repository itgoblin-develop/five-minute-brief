import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def check_blackkiwi_trend_selenium():
    url = "https://blackkiwi.net/service/trend"
    print(f"Fetching BlackKiwi trend page (Selenium) from: {url}")

    # 브라우저 설정 (Headless 모드 권장)
    chrome_options = Options()
    chrome_options.add_argument("--headless") # 창 안 띄우고 실행
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # 봇 탐지 회피용 User-Agent
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        driver.get(url)
        
        # 데이터가 로딩될 때까지 잠시 대기 (최대 10초)
        wait = WebDriverWait(driver, 10)
        
        print("Page loaded. Extracting keywords...\n")
        
        # 1. 인기 급상승 키워드 (Rising)
        # Selector: #popularKeywordList a
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#popularKeywordList a")))
            rising_elements = driver.find_elements(By.CSS_SELECTOR, "#popularKeywordList a")
            rising_keywords = [el.text for el in rising_elements if el.text.strip()]
            
            print(f"🔥 인기 급상승 키워드 (Top 5/{len(rising_keywords)}):")
            for i, kw in enumerate(rising_keywords[:5], 1):
                print(f"   {i}. {kw}")
        except Exception as e:
            print(f"   (인기 급상승 키워드 추출 실패: {e})")

        print("-" * 40)

        # 2. 새롭게 등장한 키워드 (New)
        # Selector: div[class*='NewKeywordsList'] a
        try:
            new_elements = driver.find_elements(By.CSS_SELECTOR, "div[class*='NewKeywordsList'] a")
            new_keywords = [el.text for el in new_elements if el.text.strip()]
            
            print(f"🆕 새롭게 등장한 키워드 (Top 5/{len(new_keywords)}):")
            for i, kw in enumerate(new_keywords[:5], 1):
                print(f"   {i}. {kw}")
        except Exception as e:
            print(f"   (새 키워드 추출 실패: {e})")

        print("-" * 40)

        # 3. 시즌 키워드 (Season)
        # Selector: .bottomTable a
        try:
            # 스크롤을 좀 내려야 로딩될 수도 있으므로 스크롤 시도
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight/3);")
            time.sleep(1) # 스크롤 후 렌더링 대기
            
            season_elements = driver.find_elements(By.CSS_SELECTOR, ".bottomTable a")
            season_keywords = [el.text for el in season_elements if el.text.strip()]
            
            print(f"🍂 시즌 키워드 (Top 5/{len(season_keywords)}):")
            for i, kw in enumerate(season_keywords[:5], 1):
                print(f"   {i}. {kw}")
        except Exception as e:
            print(f"   (시즌 키워드 추출 실패: {e})")
            
    except Exception as e:
        print(f"An error occurred: {e}")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    check_blackkiwi_trend_selenium()
