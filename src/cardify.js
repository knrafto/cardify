function selectRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeCard() {
  getRandomFriend(function(friend) {
    generateCard(friend, function(card) {
      displayCard(card);
    });
  });
};

// Note: only selects from first page of friends
function getRandomFriend(callback) {
  console.log("getting friend...");
  FB.api('/me', { fields: "friends" }, function(response) {
    callback(selectRandom(response.friends.data));
  });
}

function generateCard(friend, callback) {
  console.log("generating card...");
  var fields = "statuses.fields(message)," +
               "movies.fields(name)";
  FB.api(friend.id, { fields: fields }, function(response) {
    console.log(response);
    var card = {
      name: friend.name,
      id: friend.id
    };
    if (response.statuses) {
      card.quote = selectRandom(response.statuses.data).message;
    }
    if (response.movies) {
      card.movies = response.movies.data
        .slice(0, 15)
        .map(function(movie) {
          return movie.name;
        });
    }
    callback(card);
  });
}

function displayCard(card) {
  console.log(card);
}

window.fbAsyncInit = function() {
  FB.init({
    appId: "648090275223045",
    status: true,
    xfbml: true
  });

  FB.Event.subscribe('auth.authResponseChange', function(response) {
    console.log(response.status);
    if (response.status === 'connected') {
      makeCard();
    } else if (response.status === 'not_authorized') {
      FB.login();
    } else {
      FB.login();
    }
  });
};

// Load the SDK asynchronously
(function(d, s, id){
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) {return;}
  js = d.createElement(s); js.id = id;
  js.src = "//connect.facebook.net/en_US/all.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
