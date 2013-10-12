enter = function() {
	$(".jumbotron").slideUp();
	$("#enter").fadeOut();
	$('#spinner_container').fadeIn();
	$("#wrapper").fadeIn('slow');
	
}

fight = function() {
	$("#header").hide();
	$("#people_wrapper").fadeIn('slow');
}

$(document).ready( function() {
	$("#people_wrapper").hide();
	$("#people_wrapper").fadeOut();
	$("#wrapper").hide();
	$("#wrapper").fadeOut();
	$("#spinner_container").hide();
	$("#spinner_container").fadeOut();

});