from bitbucket.client import Client

client = Client('cc046fn', '!Lpqtp18') 

# Or to specify owner URL to find repo own by other user
#client = Client('EMAIL', 'PASSWORD', 'Owner')

response = client.get_user()

print(response)