# Example python gitHealthCheck.py -url https://bitbucketglobal.experian.local/ -u cc046fn -p 'abc123' -pr GVAPUS -r PINNING
# Example python gitHealthCheck.py -url https://bitbucketglobal.experian.local/ -u cc046fn -p 'abc123' -pr RGPM -r expn-cis-hermes

import requests
import json
from nested_lookup import nested_lookup
import datetime
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

class activity:
    def __init__(self, id, kind, repo=None, branch=None, date=None):
        self.id     = id
        self.kind   = kind
        self.repo   = repo
        self.branch = branch
        self.date   = date 

class user:
    def __init__(self, userID):
        self.userID = userID
        self.activities = []

    def addActivity(self, activity):
        self.activities.append(activity)

    def printActivities(self):
        for thisActivity in self.activities:
            print('    ' + str(thisActivity.date) + ':' + str(thisActivity.repo) + ':' + str(thisActivity.branch) + ':' + str(thisActivity.id) + ':' + thisActivity.kind)

    def printUserDetails(self):
        print(self.userID)
        self.printActivities()

def findUserInList(userID, usersList):
    for thisUser in usersList:
        if userID in thisUser.userID:
            return thisUser

    return None 

def bitbucketDate(bitbucketDate):
    strDate = bitbucketDate/1000 # remove last 3 zeros from timestamp value
    return datetime.date.fromtimestamp(strDate)

class branchObj:
    def __init__(self, name):
        self.name = name
        self.age = 0
        self.message = ""
        self.status = ""

    def printBranchDetails(self):
        print(self.name + ' | Age: ' + str(self.age) + ' days | Message: ' + self.message)


headers = {
    'Authorization': 'Basic ' + base64.b64encode(args['user'] + ':' + args['password']),
    'Content-Type': 'application/json',
}

params = (
    ('limit', '100'),
)

reponame =''
usersList =[]
branchList = []

try:
    print('>>> git Health Check <<<') 
    if args['repo']:
        print('>> Analizing project :' + str(args['project']) + ' | repo: ' + str(args['repo'])) 
        reponame = args['repo']
    else:
        print('>> Analizing all repositories in project :' + str(args['project'])) 

    response = requests.get(args['baseurl'] + 'rest/api/1.0/projects/' + args['project'] + '/repos/' + reponame, headers=headers, params=params)
    response_jsondata = json.loads(response.content, encoding=None)
    repos_list = nested_lookup('slug', response_jsondata)

    if len(repos_list) == 0:
        print(':( Sorry no repository found with that name: ' + str(args['project']) + '/' + str(args['repo']))
         
    for repo in repos_list: 
        Health = 7
        oldBranchesCount = 0
        activeBranchesCount = len(branchList)
        # Review users commits activity in branch
        response = requests.get(args['baseurl'] + 'rest/api/1.0/projects/' + args['project'] + '/repos/' + repo + '/commits', headers=headers, params=(('limit', '100'),('details', 'true'),))
        response_jsondata = json.loads(response.content, encoding=None)
        # print(response.content)
        commits = response_jsondata['values']
        for thisCommit in commits:
            thisUser = findUserInList(thisCommit["author"]["emailAddress"].upper(), usersList)
            if  thisUser == None:
                usersList.append(user(thisCommit["author"]["emailAddress"].upper()))
                usersList[len(usersList) - 1].addActivity(activity(thisCommit["displayId"],"Commit Creator", repo, "Master", bitbucketDate(thisCommit["authorTimestamp"])))
            else:
                thisUser.addActivity(activity(thisCommit["displayId"],"Commit Creator", repo, "Master", bitbucketDate(thisCommit["authorTimestamp"])))

        response = requests.get(args['baseurl'] + 'rest/api/1.0/projects/' + args['project'] + '/repos/' + repo + '/branches', headers=headers, params=(('limit', '100'),('details', 'true'),))
        print('\n repo: *' + repo + '*') 
        response_jsondata = json.loads(response.content, encoding=None)
        #print(response.content)

        branches = response_jsondata['values']
        for branch in branches:
            #print(branch['metadata'])
            thisBranchOjb = branchObj(branch['displayId'])
            branchList.append(thisBranchOjb);
            thisBranchOjb.age = (datetime.date.today() - bitbucketDate(branch['metadata']['com.atlassian.bitbucket.server.bitbucket-branch:latest-commit-metadata']['authorTimestamp'])).days

            # Check Branch Naming conventions
            if thisBranchOjb.name.upper() == 'MASTER':
                thisBranchOjb.message = "You have a master" 
                if str(branch['isDefault']) == "True":
                    thisBranchOjb.message+= " and is set as default branch :thumbsup: "
                    Health += 1
                else:
                    thisBranchOjb.message+= "but is NOT your default branch :rage: "
            
            elif branch['displayId'].upper() == 'DEVELOPMENT' or branch['displayId'].upper() == 'RELEASE' or branch['displayId'].upper() == 'INTEGRATION':
                thisBranchOjb.message = "Hummm... you shouldn't be using this branch name :broken_heart: "
                Health -= 1
            else:
                pattern = 'feature/[A-Z]\w+-[0-9]\w+'
                if not(re.match(pattern, branch['displayId'])):
                    thisBranchOjb.message += "Don't like your branch name that much  :thumbsdown:"
            
            # Add branch age information 
            if thisBranchOjb.name.upper() <> 'MASTER':
                if thisBranchOjb.age > 365:
                    thisBranchOjb.message += ". Think about deleting this bro!  :skull:"
                elif thisBranchOjb.age > 180:
                    thisBranchOjb.message += ". I see some spiderwebs, 6 months and you have not worked on this, take a look.  :("
                elif thisBranchOjb.age > 90:
                    thisBranchOjb.message += ". Forgot about this? 3 months ago it was important, how about now?  :("
                    oldBranchesCount += 1
                else:
                    activeBranchesCount += 1

            # Review associated Pull Requests status
            try: 
                thisPullRequest = branch['metadata']['com.atlassian.bitbucket.server.bitbucket-ref-metadata:outgoing-pull-request-metadata']['pullRequest']
                #print(thisPullRequest)
                thisUserEmail = thisPullRequest['author']['user']['emailAddress'].upper()
                
                thisUser = findUserInList(thisUserEmail, usersList)
                if  thisUser == None:
                    usersList.append(user(thisUserEmail))
                    usersList[len(usersList) - 1].addActivity(activity(thisPullRequest["id"],"Pull Request Creator", repo, branch['displayId'], bitbucketDate(thisPullRequest["createdDate"])))
                else:
                    thisUser.addActivity(activity(thisPullRequest["id"],"Pull Request Creator", repo, branch['displayId'], bitbucketDate(thisPullRequest["createdDate"])))
        
                if branch['metadata']['com.atlassian.bitbucket.server.bitbucket-ref-metadata:outgoing-pull-request-metadata']['pullRequest']['state'].upper() == 'MERGED':
                    thisBranchOjb.message += '@' + thisUserEmail +' Merged branches *MUST* be deleted :rage: '
                    thisBranchOjb.status = 'Obsolete'
            except KeyError:
                pass
        
        if activeBranchesCount <= 5:
            Health += 1
        else:
            Health -= 1

    print('\n\n >> Repo details \n')
    print('    Health(' + str(Health) +'): [' + '*' * Health + ' ' * (10 - Health) + ']')
    print('    Branches: ' + str(activeBranchesCount + oldBranchesCount) + ' [' + str(activeBranchesCount) + ' active / ' + str(oldBranchesCount) + ' old]')
    
    print('\n\n >> Branches details \n')
    for branch in branchList:
        branch.printBranchDetails()

    print('\n\n >> Recent users Activity details (last 100 commits)\n')
    for user in usersList:
        user.printUserDetails()
        print('\n')

except requests.exceptions.RequestException as e: 
    print e
    sys.exit(1)


        
        

    
