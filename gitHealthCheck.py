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
ap.add_argument("-s", "--save", required=False, help="Save report to file", action='store_true')
ap.add_argument("-pb", "--printbranch", required=False, help="Will print branches details", action='store_true')

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
        self.status = "ACTIVE"

    def printBranchDetails(self):
        print(self.name + ' | Age: ' + str(self.age) + ' days | Status: ' + self.status)


class repoObj:
    def __init__(self, name):
        self.name = name
        self.health = 7
        self.hasMasterBrach = False
        self.hasProdImplementationTag = False
        self.oldBranchesCount = 0
        self.activeBranchesCount = 0
        self.healthMessages = [['{0:+}'.format(self.health), 'Base Score']]

    def modifyHealth(self, healthModifier, healthMessage):
        self.health += healthModifier
        self.healthMessages.append(['{0:+}'.format(healthModifier) , healthMessage])

    def printRepoDetails(self):
        print('>> Repo ' + self.name + ' details.')
        if self.health <= 0:
            print('    Health(' + str(self.health) +'): [' + ' ' * 10 + ']')
        else:
            print('    Health(' + str(self.health) +'): [' + '*' * self.health + ' ' * (10 - self.health) + ']')

        print('    Branches: ' + str(self.activeBranchesCount + self.oldBranchesCount) + ' [' + str(self.activeBranchesCount) + ' active / ' + str(self.oldBranchesCount) + ' old]')
        for message in self.healthMessages:
            print('    ' + str(message))
        print('\n')

userpass = args['user'] + ':' + args['password']

headers = {
    'Authorization': 'Basic ' + base64.b64encode(userpass.encode("utf-8")).decode("ascii"),
    'Content-Type': 'application/json',
}

params = (('limit', '100'),)

reponame =''
usersList =[]
branchList = []
repoHealthSummary = []

try:
    print('>>> Bitbucket gitHealthCheck <<<') 
    if args['repo']:
        print('>> Analizing project :' + str(args['project']) + ' | repo: ' + str(args['repo'])) 
        reponame = args['repo']
    else:
        print('>> Analizing all repositories in project :' + str(args['project']))
    
    try:
        response = requests.get(args['baseurl'] + 'rest/api/1.0/projects/' + args['project'] + '/repos/' + reponame, headers=headers, params=params)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(e)
        sys.exit(1)

    response_jsondata = json.loads(response.content, encoding=None)
    repos_list = nested_lookup('slug', response_jsondata)

    if len(repos_list) == 0:
        print(':( Sorry no repository found with that name: ' + str(args['project']) + '/' + str(args['repo']))
         
    for repo in repos_list: 
        thisRepoOjb = repoObj(repo)
        # *********************************************************************************************************
        # Commits Analysis
        # *********************************************************************************************************
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

        # *********************************************************************************************************
        # Branches Analysis
        # *********************************************************************************************************
        maxBranchesLimit = 200
        response = requests.get(args['baseurl'] + 'rest/api/1.0/projects/' + args['project'] + '/repos/' + repo + '/branches', headers=headers, params=(('limit', maxBranchesLimit),('details', 'true'),))
        response_jsondata = json.loads(response.content, encoding=None)
        #print(response.content)

        branches = response_jsondata['values']
        for branch in branches:
            #print(branch['metadata'])
            thisBranchOjb = branchObj(branch['displayId'])
            branchList.append(thisBranchOjb)

            try:
                thisBranchOjb.age = (datetime.date.today() - bitbucketDate(branch['metadata']['com.atlassian.bitbucket.server.bitbucket-branch:latest-commit-metadata']['authorTimestamp'])).days
            except:
                thisBranchOjb.age = 9999

            unwantedBranchNamesPattern = "(Development|Dev|Release|Integration|Prod|bugfix/.*|Hotfix/.*|Release/.*)"
            # Check Branch Naming conventions
            if thisBranchOjb.name.upper() == 'MASTER':
                if str(branch['isDefault']) == "True":
                    thisRepoOjb.modifyHealth(+1, "You have a master branch set as default")
            
            elif (re.match(unwantedBranchNamesPattern, branch['displayId'], re.IGNORECASE)):
                thisRepoOjb.modifyHealth(-1, str('You shouldnt be using branch name: ' + branch['displayId']))
            
            # Add branch age information 
            if thisBranchOjb.age > 90:
                thisBranchOjb.status = "INACTIVE"
                thisRepoOjb.oldBranchesCount += 1
                thisRepoOjb.modifyHealth(-1, str("branch not updated in las 90 days: " + thisBranchOjb.name + " | Age: " + str(thisBranchOjb.age) + " days"))
            else:
                thisRepoOjb.activeBranchesCount += 1
                      

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
                    thisRepoOjb.modifyHealth(-2, str("Merged branches MUST be deleted " + thisBranchOjb.name))
                    thisBranchOjb.status = 'MERGED'
            except KeyError:
                pass
        
        if thisRepoOjb.activeBranchesCount > 5:
            thisRepoOjb.modifyHealth(-1, "You have more than 5 active branches, you may need to merge some")
        else: 
            thisRepoOjb.modifyHealth(+1, "You have less than 5 active branches.")

        # *********************************************************************************************************
        # Tags Analysis
        # *********************************************************************************************************
        response = requests.get(args['baseurl'] + 'rest/api/1.0/projects/' + args['project'] + '/repos/' + repo + '/tags', headers=headers, params=(('limit', '100'),('details', 'true'),))
        response_jsondata = json.loads(response.content, encoding=None)
        #   print(response.content)
        tags = response_jsondata['values']
        for tag in tags:
            prodDeployTagPattern = "PROD_DEPLOY_(0[1-9]|[12]\d|3[01])_(?:JAN|Jan|FEB|Feb|MAR|Mar|APR|Apr|MAY|May|JUN|Jun|JUL|Jul|AUG|Aug|SEP|Sep|OCT|Oct|NOV|Nov|DEC|Dec)_(19|20)\d{2}"
            if (re.match(prodDeployTagPattern, tag['displayId'])):
                thisRepoOjb.hasProdImplementationTag = True
                thisRepoOjb.modifyHealth(+1, str("You have a commit with prod implementation tag: " + tag['displayId']))
        
        if not thisRepoOjb.hasProdImplementationTag:
            thisRepoOjb.modifyHealth(0, "Warning: You should have a prod implementation Tag with format: PROD_DEPLOY_DD_MMM_YYYY ")
            
        thisRepoOjb.printRepoDetails()
        repoHealthSummary.append([str(thisRepoOjb.name), thisRepoOjb.health])

    if args['printbranch']:
        print('\n\n >> Branches details \n')
        for branch in branchList:
            branch.printBranchDetails()

#    print('\n\n >> Recent users Activity details (last 100 commits)\n')
#    for user in usersList:
        #user.printUserDetails()
#        print('\n')
    
    if args['save']:
        if args['repo'] == None:
            repoName = ''
        else:
            repoName = '.' + args['repo']

        outputSummaryFile =  open('./' + str(args['project']) + repoName + '.gitHealthCheck.txt', 'w')
        for repo in repoHealthSummary:
            outputSummaryFile.write(repo[0] + ',' + str(repo[1]) + '\n')

except requests.exceptions.RequestException as e: 
    print(e)
    sys.exit(1)


        
        

    
