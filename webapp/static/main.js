$(document).ready(function() {
	console.log("ready MJ!");

	$("form").on("submit", function () {
		console.log("the form has been submitted - yay!")
		var bitbucket_url = $('input[name="bitbucket_url"').val()
		var project = $('input[name="project"').val()
		var repo = $('input[name="repo"').val()
		console.log(bitbucket_url, project, repo)

		$.ajax ({
			type: "POST",
			url: "/",
			data: {bitbucket_url: bitbucket_url, project: project, repo: repo},
			success: function(results) {
				console.log(results)
				$("#message").html("this is my message")
			},
			error: function(error) {
				console.log(error)
				$("#message").html("Ops something failed, don''t ask me, just read this:" + error)
			}
		})
	});
});