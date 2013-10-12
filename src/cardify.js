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
var intervalId;

var moves;
var hpThemes;
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
    return card[field] ? card[field].length : 0;
  };
}

function statusWeight(n) {
  return function(card) {
    return card.statuses ? n : 0;
  };
}

function constantWeight(n) {
  return function(_) { return n; };
}

function makeGenerateMove(category, card) {
  return function(enemy) {
    var text = Math.random() <= 0.15 ?
        generateChanceMove(card, enemy) :
        category.generateMove(card, enemy);

    var damage = selectWeightedRandom([
      { item: 0,
        weight: 2 },
      { item: 1,
        weight: 6 },
      { item: 2,
        weight: 2 }]);
    return {
      text: text,
      damage: damage
    };
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
    var randomFriends =  [selectRandom(friends), selectRandom(friends)];
    randomFriends.forEach(function(friend) {
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
  FB.api('/me', { fields: "friends" }, function(response) {
    friends = response.friends.data;
    callback();
  });
}

function generateCard(friend, callback) {
  var fields = [ "statuses.fields(message)",
                 "movies.fields(name)",
                 "books.fields(name)",
                 "music.fields(name)",
                 "games.fields(name)",
                 "sports",
                 "picture.type(large)"
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

    // why is this different from movies, books, music, and games?
    if (response.sports) {
      card.sports = response.sports.map(function(sport) {
        return sport.name;
      });
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

    card.hp = 6;
    card.hpTheme = hpThemes[selectRandom(Object.keys(hpThemes))];

    callback(card);
  });
}

function enterGame() {
  $(".jumbotron").slideUp();
  $("#enter").fadeOut();
  $("#wrapper").fadeIn('slow');
  $("#logo").click(startGame);
}

function startGame() {
  turn = 0;
  $('#spinner_container').show();
  makeCards(function() {
    $('#spinner_container').hide();
    $("#header").hide();
    $("#people_wrapper").fadeIn('slow');
    displayCard(".person.left", players[0]);
    displayCard(".person.right", players[1]);

    intervalId = setInterval(takeTurn, 6000);
  });
}

function displayCard(selector, card) {
  $(selector)
    .find(".image_128")
      .append($("<img>").attr("src", card.picture))
    .end()
    .find(".name_field")
      .append($("<p>").text(card.name))
    .end()
    .find(".category")
      .append($("<p>").text("Primary Type: " + card.categoryName))
    .end()
    .find(".quote")
      .append($("<p>").text('"' + card.quote + '"'));
}

function takeTurn() {
  var next = 1 - turn,
      move = players[turn].generateMove(players[next]);

  console.log(move);

  players[next].hp = Math.max(0, players[next].hp - move.damage);
  if (!players[next].hp) {
    endGame();
  } else {
    turn = next;
  }
}

function endGame() {
  clearInterval(intervalId);
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
    hpThemes = data.hp;
  });

  FB.getLoginStatus(function(response){
    if(response.status === 'connected'){
      $("#enter-button").fadeIn();
      $("#enter-button").click(enterGame);
    } else {
      $('.fb-login-button').fadeIn();
      FB.Event.subscribe('auth.login', function(response) {
        console.log(response);
        if (response.authResponse) {
          $('.fb-login-button').fadeOut();
          enterGame();
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

$(document).ready(function() {
  var scope = "friends_interests,friends_likes,friends_status,user_friends";
  $('.fb-login-button').attr("data-scope", scope);
  $("#people_wrapper").hide();
  $("#wrapper").hide();
  $("#spinner_container").hide();
});
