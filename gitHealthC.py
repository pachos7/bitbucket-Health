import requests
import json
from nested_lookup import nested_lookup
from datetime import datetime

headers = {
    'Authorization': 'Basic Y2MwNDZmbjohTHBxdHAxOA==',
    'Content-Type': 'application/json',
}

params = (
    ('limit', '100'),
)

timestamp = 1469655531
dt_object = datetime.fromtimestamp(timestamp)

print("dt_object =", dt_object)
print("type(dt_object) =", type(dt_object))

response = requests.get('https://bitbucketglobal.experian.local/rest/api/1.0/projects/GVAPUS/repos', headers=headers, params=params)
print(response.status_code)
#print(response.content)

response_jsondata = json.loads(response.content, encoding=None)
repos_list = nested_lookup('slug', response_jsondata)
#print(repos_list)

for repo in repos_list: 
    response = requests.get('https://bitbucketglobal.experian.local/rest/api/1.0/projects/GVAPUS/repos/'+repo+'/branches', headers=headers, params=params)
    print('repo:' + repo) 
    #print(response.content)
    response_jsondata = json.loads(response.content, encoding=None)
    branches_list = nested_lookup('displayId', response_jsondata)
    latestCommit_list = nested_lookup('latestCommit', response_jsondata)
    #print(branches_list)
    #print(latestCommit_list)


    for i in range(len(branches_list)):
    #for branch in branches_list:
        #print('    branch:' + branch)
        print('    branch:' + branches_list[i])
        response = requests.get('https://bitbucketglobal.experian.local/rest/api/1.0/projects/GVAPUS/repos/'+repo+'/commits/' + latestCommit_list[i], headers=headers, params=(('limit', '1'),))
        #print(response.content)
        response_jsondata = json.loads(response.content, encoding=None)
        authorTimestamp = nested_lookup('authorTimestamp', response_jsondata)
        strDate = authorTimestamp[0]/1000 # remove last 3 zeros from timestamp value
        #print(strDate)
        #[0:9]
        dt_object = datetime.fromtimestamp(strDate)
        print('        authorTimestamp:' + str(dt_object))
        
        

    
