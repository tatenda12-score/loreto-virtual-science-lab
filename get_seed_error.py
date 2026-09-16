import urllib.request
import json

req = urllib.request.Request('https://loreto-virtual-science-lab.onrender.com/setup/seed', method='POST')
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"Error {e.code}: {e.read().decode('utf-8')}")
