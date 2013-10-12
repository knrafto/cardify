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

var friends;
var players;
var turn;

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
    if (Math.random() <= 0.15) {
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

function makeCards(callback) {
  getFriends(function() {
    players = [];
    [selectRandom(friends), selectRandom(friends)].forEach(function(friend) {
      generateCard(friend, function(card) {
        players.push(card);
        if (players.length === 2) {
          callback();
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

function startGame() {
  turn = 0;
  makeCards(function() {
    console.log(players);
  });
}

function takeTurn() {
  var next = 1 - turn,
      move = players[turn].generateMove(players[next]);
  
  console.log(move);
  player[next].hp = Math.max(0, player[next].hp - move.damage);
  if (!player[next].hp) {
    endGame();
  } else {
    turn = next;
  }
}

function endGame() {

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

  var scope = "friends_interests,friends_likes,friends_status,user_friends";
  $('.fb-login-button').attr("data-scopes", scope);

  FB.getLoginStatus(function(response){
    if(response.status === 'connected'){
      $('.start').css('display', 'block');
      $(".start").click(function(e){
        $('.start').slideUp();
        e.preventDefault();
        startGame();
      });
    } else {
      $('.fb-login-button').fadeIn();
      FB.Event.subscribe('auth.login', function(response) {
        console.log(response);
        if (response.authResponse) {
          $('.fb-login-button').fadeOut();
          $('.start').slideUp();
          startGame();
        } else {
          console.log('User cancelled login or did not fully authorize.');
        }
      });
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
