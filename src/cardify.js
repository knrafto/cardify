function format(str, replacement) {
  str.replace(/___/, replacement);
}

function selectRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function selectWeightedRandom(list) {
  var i, items = [];
  list.forEach(function(elem) {
    for (i = 0; i < elem.weight; ++i) {
      items.push(elem.item);
    }
  });
  return selectRandom(items);
}

var changeEventChance = 0.15;
var moves;
var categories = [
  { name: "Movies",
    calculateWeight: likeWeight("movies")
  },
  { name: "Books",
    calculateWeight: likeWeight("books")
  },
  { name: "Music",
    calculateWeight: likeWeight("music")
  },
  { name: "Games",
    calculateWeight: likeWeight("games")
  },
  { name: "Sports",
    calculateWeight: likeWeight("sports")
  },
  { name: "Status Updates",
    calculateWeight: constantWeight(10)
  },
  { name: "Betrayer",
    calculateWeight: constantWeight(5)
  }
];

function likeWeight(field) {
  return function(card) {
    if (!card[field]) return 0;
    return card[field].length;
  };
}

function constantWeight(n) {
  return function(_) { return n; };
}

function makeGenerateMove(category, card) {
  return function(enemy) {
    if (Math.random() <= changeEventChange) {
      return generateChanceMove(card, enemy);
    }
    return category.generateMove(card, enemy);
  };
}

function generateChangeMove(card, enemy) {
  return selectRandom(moves['chance']).format(card.name, enemy.name);
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
  var fields = [ "statuses.fields(message)",
                 "movies.fields(name)",
                 "books.fields(name)",
                 "music.fields(name)",
                 "games.fields(name)",
                 "sports",
                 "picture"
               ]
  FB.api(friend.id, { fields: fields.join(",") }, function(response) {
    var card = {
      name: friend.name,
      id: friend.id,
    };

    function addNames(category) {
      if (!response[category]) return;
      card[category] = response[category].data.map(function(item) {
        return item.name;
      });
    }

    ["movies", "books", "music", "games"].forEach(addNames);
    if (response.picture) {
      card.picture = response.picture.data.url;
    }
    if (response.statuses) {
      card.quote = selectRandom(response.statuses.data).message;
    }

    var weightedCategories = categories.map(function(category) {
      return {
        weight: category.calculateWeight(card),
        item: category
      };
    });
    var category = selectWeightedRandom(weightedCategories);
    card.categoryName = category.name;
    card.generateMove = makeGenerateMove(category, card);
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

  // Hack: assumes that getting JSON data is much faster than Facebook
  // API calls
  $.getJSON("data/moves.json", function(data) {
    moves = data;
  });

  var scope = "friends_about_me,friends_actions.books," +
              "friends_actions.music,friends_actions.news," +
              "friends_actions.video,friends_activities," +
              "friends_birthday,friends_education_history," +
              "friends_events,friends_games_activity,friends_groups," +
              "friends_hometown,friends_interests,friends_likes," +
              "friends_location,friends_notes,friends_photo_video_tags," +
              "friends_photos,friends_questions," +
              "friends_relationship_details,friends_relationships,"
              "friends_status,friends_subscriptions,friends_videos," +
              "friends_website,friends_work_history,user_friends";

  FB.Event.subscribe('auth.authResponseChange', function(response) {
    console.log(response.status);
    if (response.status === 'connected') {
      makeCard();
    } else {
      FB.login(function(response) {
        makeCard();
      }, { scope: scope });
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
