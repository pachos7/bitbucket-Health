# gitHealthCheck.py

This application helps you determine the relative health of your git Bitbucket repository based on your branching strategy. 
It uses Github branching strategy so it expects a master branch and several features branches.
A system of negatives and positive points is used to give you a generic idea of your repository status.

# Points system
Value | Reason
----- | -------------
+7 | Health starts with a base +7 score
+1 | Having a 'master' branch set as default
+1 | Having commit with prod implementation tag
+1 | Having less than 5 active branches
-1 | Having a 'release','development','integration' named branch
-1 | Having more than 5 active branches
-1 | Each inactive branch (not updated in the last 3 months)
-1 | Having branches prefixed with 'Bugfix', 'Hotfix', 'Release'
-2 | Each merged branch (they should be deleted)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

Python 2.7.10

### Installing

Just clone the repository, set your configuration file and run the application

Example:

```
python gitHealthCheck.py -url https://bitbucketglobal.experian.local/ -u cc046fn -p 'abc123' -pr GVAPUS -r PINNING
```

### parameters

Use ```gitHealthCheck.py -h``` to ger a list of paramemeters.
* -url/--baseurl     Base bitbucket project url
* -u/--user          User to access the project
* -p/--password      Password to access the project
* -pr/--project      Project Name
* -r/--repo          Repository name, if ommited all repos in the project would be evaluated
* -s/--save          Option to save summary report to file
* -pb/--printbranch  Option to print branches details (optional)

## Running the tests

Explain how to run the automated tests for this system...



## Authors

* **Francisco Niño** - *Initial work* - [Pachos7](https://github.com/Pachos7)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Hat tip to https://github.com/rybak/bitbucket-stats for the  Inspiration

