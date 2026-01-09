import requests

try:
    # Login to get token
    resp = requests.post("http://localhost:8000/token", data={"username": "Utpal", "password": "password"}) # Assuming 'Utpal' user exists or I need to register
    if resp.status_code != 200:
        # Register if login fails
        print("Login failed, trying to register...")
        resp = requests.post("http://localhost:8000/register", json={"username": "Utpal", "password": "password", "email": "utpal@test.com"})
        if resp.status_code == 200:
             # Login again
             resp = requests.post("http://localhost:8000/token", data={"username": "Utpal", "password": "password"})
    
    if resp.status_code == 200:
        token = resp.json()["access_token"]
        print("Got token.")
        
        # Get reports
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get("http://localhost:8000/reports", headers=headers)
        import json
        with open("debug_output.txt", "w") as f:
             f.write(f"Status: {r.status_code}\n")
             f.write(f"Content: {r.text}\n")
    else:
        with open("debug_output.txt", "w") as f:
             f.write(f"Auth failed: {resp.text}\n")

except Exception as e:
    with open("debug_output.txt", "w") as f:
         f.write(f"Error: {e}\n")
