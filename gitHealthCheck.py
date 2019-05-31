import requests
import json
from nested_lookup import nested_lookup
from datetime import datetime
import argparse
import sys
import base64
import re

ap = argparse.ArgumentParser()
ap.add_argument("-url", "--baseurl", required=True, help="Provide git repository base url")
ap.add_argument("-u", "--user", required=True, help="User")
ap.add_argument("-p", "--password", required=True, help="Password")
ap.add_argument("-pr", "--project", required=True, help="Project name")
ap.add_argument("-r", "--repo", required=False, help="Repository name")

args = vars(ap.parse_args())

headers = {
    'Authorization': 'Basic ' + base64.b64encode(args['user'] + ':' + args['password']),
    'Content-Type': 'application/json',
}

params = (
    ('limit', '100'),
)

reponame =''

try:
    print('>>> git Health Check <<<') 
    if args['repo']:
        print('>> Analizing project :' + args['project'] + ' | repo: ' + args['repo']) 
        reponame = args['repo']
    else:
        print('>> Analizing all repositories in project :' + args['project']) 

    response = requests.get(args['baseurl'] + 'rest/api/1.0/projects/' + args['project'] + '/repos/' + reponame, headers=headers, params=params)
    response_jsondata = json.loads(response.content, encoding=None)
    repos_list = nested_lookup('slug', response_jsondata)

    for repo in repos_list: 
        response = requests.get(args['baseurl'] + 'rest/api/1.0/projects/' + args['project'] + '/repos/' + repo + '/branches', headers=headers, params=(('limit', '100'),('details', 'true'),))
        print('repo:' + repo) 
        response_jsondata = json.loads(response.content, encoding=None)

        branches = response_jsondata['values']
        print(branches)
        for branch in branches:
            print(branch['displayId'])

            if branch['displayId'].upper() == 'MASTER':
                print("        + You have a master ;) ")
            elif branch['displayId'].upper() == 'DEVELOPMENT' or branch['displayId'].upper() == 'RELEASE':
                print("        - Hummm... you shouldn't be using this ;( ")
            else:
                pattern = 'feature/[A-Z]\w+-[0-9]\w+'
                if re.match(pattern, branch['displayId']):
                    print("        - Nice branch name, i like it ;)")
                else:
                    print("        - Don't know if I like your branch name that much  ;(")              
            
            #response = requests.get(args['baseurl'] + 'rest/api/1.0/projects/' + args['project'] + '/repos/' + repo + '/branches/' + branch['displayId'], headers=headers, params=(('limit', '1'),('details', 'true'),))
            #print(response.content)
            #authorTimestamp = nested_lookup('authorTimestamp', response_jsondata)
            print(branch['metadata'])
            #strDate = branch['authorTimestamp']/1000 # remove last 3 zeros from timestamp value
            #print(strDate)
            #[0:9]
            #dt_object = datetime.fromtimestamp(strDate)
            #print('        authorTimestamp:' + str(dt_object))

except requests.exceptions.RequestException as e: 
    print e
    sys.exit(1)


        
        

    
