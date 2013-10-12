window.fbAsyncInit = function() {
  FB.init({
    appId: "648090275223045",
    status: true,
    xfbml: true
  });

  FB.Event.subscribe('auth.authResponseChange', function(response) {
    if (response.status === 'connected') {
      testAPI();
    } else if (response.status === 'not_authorized') {
      FB.login();
    } else {
      FB.login();
    }
  });
};

function testAPI() {
  console.log('Welcome!  Fetching your information.... ');
  FB.api('/me', function(response) {
    console.log('Good to see you, ' + response.name + '.');
  });
}

// Load the SDK asynchronously
(function(d, s, id){
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) {return;}
  js = d.createElement(s); js.id = id;
  js.src = "//connect.facebook.net/en_US/all.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
