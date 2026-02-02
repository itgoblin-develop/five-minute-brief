import requests
import xml.etree.ElementTree as ET

def check_google_trends_rss():
    rss_url = "https://trends.google.co.kr/trending/rss?geo=KR"
    
    print(f"Fetching RSS feed from: {rss_url}")
    try:
        response = requests.get(rss_url)
        if response.status_code != 200:
            print(f"Error: Failed to retrieve RSS. Status code: {response.status_code}")
            return

        # Parse XML
        root = ET.fromstring(response.content)
        
        # Namespace for Google Trends specific tags (approximate_traffic etc.)
        # Often it's 'https://trends.google.co.kr/trending/rss' or similar, 
        # but usually it's easier to just find the 'item' tags first.
        # Let's check the channel items.
        
        channel = root.find('channel')
        items = channel.findall('item')
        
        print(f"Successfully fetched feed. Found {len(items)} items.\n")
        
        for idx, item in enumerate(items[:5], 1): # Print top 5 only
            title = item.find('title').text
            # ht:approx_traffic might need namespace handling, let's try basic first or look at raw if needed.
            # ElementTree namespacing can be tricky without the exact map.
            # Let's just dump the title and link first.
            link = item.find('link').text
            
            # Try to find traffic info. 
            # It usually looks like <ht:approx_traffic>20,000+</ht:approx_traffic>
            # We can search by tag name using local-name() in xpath if needed, but ET supports {uri}tag
            # Let's inspect namespace map from root if possible, or just iterate children.
            
            approx_traffic = "N/A"
            for child in item:
                if 'approx_traffic' in child.tag:
                    approx_traffic = child.text
                    break
            
            print(f"{idx}. {title}")
            print(f"   Traffic: {approx_traffic}")
            print(f"   Link: {link}")
            print("-" * 40)
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    check_google_trends_rss()
