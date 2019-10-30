from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route("/", methods=['GET', 'POST'])
def home():
	print('Aqui Toy')
	if request.method == 'POST':
		print('Toy en POST')
		bitbucket_url = request.form['bitbucket_url']
		project = request.form['project']
		repo = request.form['repo']
		data = {"bitbucket_url" : bitbucket_url, "project" : project, "repo" : repo}
		#return render_template('index.html', bitbucket_url=bitbucket_url, project=project, repo=repository)
		return jsonify(data), 500
	else: 
		print('Pos No Toy en POST')
		return render_template('index.html', bitbucket_url='some_bitbucket_url')

if __name__ == '__main__':
	app.run(debug=True)
