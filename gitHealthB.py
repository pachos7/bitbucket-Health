import requests
import json

#url = 'https://bitbucketglobal.experian.local/'
url = 'https://bitbucketglobal.experian.local/'
headers = {'Content-Type': 'application/json'}

# get user
r = requests.get(url, auth=('cc046fn', '!Lpqtp18'), headers=headers)
print(r.status_code)
#print(r.text)
print(r.content)