import requests

API_BASE = "https://cerply-api-staging-latest.onrender.com"

def test_post_api_preview():
    url = f"{API_BASE}/api/preview"
    response = requests.post(url)
    if response.status_code != 200:
        raise Exception(f"Failed to POST to {url}: {response.status_code}")
    
    data = response.json()
    if '.summary' not in data['data']:
        raise Exception("Missing '.summary' field in response data")
    
    return data

def main():
    try:
        data = test_post_api_preview()
        print("Test passed successfully.")
        print(data)
    except Exception as e:
        print(f"Error: {e}")

# Test cases to verify the fix
def test_case_1():
    print("Running test case 1...")
    main()

# Run test case
test_case_1()