function format(str) {
  [].slice.call(arguments, 1).forEach(function(replacement) {
    str = str.replace(/__/, replacement);
  });
  return str;
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

var chanceEventChance = 0.15;
var friends;
var moves;
var categories = [
  { name: "Movies",
    calculateWeight: likeWeight("movies"),
    generateMove: generateTextMove("Movies")
  },
  { name: "Books",
    calculateWeight: likeWeight("books"),
    generateMove: generateTextMove("Books")
  },
  { name: "Music",
    calculateWeight: likeWeight("music"),
    generateMove: generateTextMove("Music")
  },
  { name: "Games",
    calculateWeight: likeWeight("games"),
    generateMove: generateTextMove("Games")
  },
  { name: "Sports",
    calculateWeight: likeWeight("sports"),
    generateMove: generateTextMove("Sports")
  },
  { name: "Random",
    calculateWeight: constantWeight(2),
    generateMove: generateTextMove("Random")
  },
  { name: "Status Updates",
    calculateWeight: statusWeight(4),
    generateMove: generateStatusMove
  },
  { name: "Betrayer",
    calculateWeight: constantWeight(2),
    generateMove: generateBetrayerMove
  }
];

function likeWeight(field) {
  return function(card) {
    if (!card[field]) return 0;
    return card[field].length;
  };
}

function statusWeight(n) {
  return function(card) {
    if (card.statuses) {
      return n;
    }
    return 0;
  };
}

function constantWeight(n) {
  return function(_) { return n; };
}

function makeGenerateMove(category, card) {
  return function(enemy) {
    if (Math.random() <= chanceEventChance) {
      return generateChanceMove(card, enemy);
    }
    return category.generateMove(card, enemy);
  };
}

function getMove(key) {
  return selectRandom(moves[key]);
}

function generateChanceMove(card, enemy) {
  return format(getMove("Chance"), card.name, enemy.name);
}

function generateTextMove(key) {
  return function(card, enemy) {
    return format(getMove(key), card.name, enemy.name);
  };
}

function generateStatusMove(card, enemy) {
  var status = selectRandom(card.statuses);
  return format(getMove("Status Updates"), card.name, status, enemy.name);
}

function generateBetrayerMove(card, enemy) {
  var friend = selectRandom(friends);
  return format(getMove("Betrayer"), card.name, enemy.name, friend.name);
}

function makeCards() {
  getFriends(function() {
    combatants = selectCombatants();
    var cards = [];
    combatants.forEach(function(friend) {
      generateCard(friend, function(card) {
        cards.push(card);
        if (cards.length === 2) {
          playGame(cards[0], cards[1]);
        }
      });
    });
  });
};

function getFriends(callback) {
  console.log("getting friends...");
  FB.api('/me', { fields: "friends" }, function(response) {
    friends = response.friends.data;
    callback();
  });
}

function selectCombatants() {
  var i, friend, results = [];
  for (i = 0; i < 2; ++i) {
    do {
      friend = selectRandom(friends);
    } while (friends.indexOf(results) !== -1);
    results.push(friend);
  }
  return results;
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
      card.statuses = []
      response.statuses.data.forEach(function(status) {
        if (status.message) {
          card.statuses.push(status.message);
        }
      });
      card.quote = selectRandom(card.statuses);
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

function playGame(player1, player2) {
  console.log(player1);
  console.log(player2);
  console.log(player1.generateMove(player2))
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
    moves = data.categories;
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
      makeCards();
    } else {
      FB.login(function(response) {
        makeCards();
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
