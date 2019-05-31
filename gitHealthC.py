import requests
import json
from nested_lookup import nested_lookup
from datetime import datetime
import argparse
import sys
import base64





ap = argparse.ArgumentParser()
ap.add_argument("-url", "--baseurl", required=True, help="Provide git repository base url")
ap.add_argument("-u", "--user", required=True, help="User")
ap.add_argument("-p", "--password", required=True, help="Password")
ap.add_argument("-pr", "--project", required=True, help="Project name")

args = vars(ap.parse_args())

headers = {
    'Authorization': 'Basic ' + base64.b64encode(args['user'] + ':' + args['password']),
    'Content-Type': 'application/json',
}

params = (
    ('limit', '100'),
)

try:
    response = requests.get(args['baseurl'] + 'rest/api/1.0/projects/' + args['project'] + '/repos/', headers=headers, params=params)
    #print(response)
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

except requests.exceptions.RequestException as e: 
    print e
    sys.exit(1)


        
        

    
