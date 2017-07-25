$(function () {

  $(document).ready(function() {
    if(isAPIAvailable()) {
      $('#files').bind('change', handleFileSelect);
      $('#fd-template').bind('change', handleTemplateSelect);
    }
  });

  for (i = 1; i < 1001; i++) {
    $('#lineup-quantity').append("<option value='" + i + "'>" + i + "</option>");
  }

  for (i = 20000; i <= 35000; i=i+100) {
    $('#min-salary').append("<option value='" + i + "'>" + "$" + commaSeparateNumber(i) + "</option>");
  }

  getSchedule();

  var LINEUP = {
    p: {},
    c: {},
    fb: {},
    sb: {},
    tb: {},
    ss: {},
    of1: {},
    of2: {},
    of3: {}
  };

  var LINEUPQUANTITY = 1;

  var MAXLENGTH = 0;

  var LINEUPSARRAY = [];

  var CSVLINEUPS = [];

  var PLAYERS = [];

  var PLIST = [];
  var CLIST = [];
  var FBLIST = [];
  var SBLIST = [];
  var TBLIST = [];
  var SSLIST = [];
  var OFLIST = [];

  var TEMPLATEPLAYERS = [];

  var TEAMS = [];
  var TEAMSOBJECTS = [];
  var TEAMCOUNT = 0;

  var STACKTEAM = "";

  var SELECTEDPLAYERS = [];

  $('#optimize').on('click', function(e){
    e.preventDefault();
    if (PLAYERS.length === 0) {
      alert("Please import projections CSV");
    } else if (TEMPLATEPLAYERS.length === 0) {
      alert("Please import FanDuel template");
    } else {
      $("body").addClass("loading");
      setTimeout(optimize, 50);
    }
  });

  $('#csv-export').on('click', function(e){
    e.preventDefault();
    prepareCSV();
  });

  $('#schedule-retry-button').on('click', function(e){
    e.preventDefault();
    getSchedule();
  });

  $('#all-p-button').on('click', function(e){
    e.preventDefault();
    for (i = 0; i < PLIST.length; i++) {
      $("#checkbox-p"+[i]).attr("checked", true);
    }
  });

  $('#all-c-button').on('click', function(e){
    e.preventDefault();
    for (i = 0; i < CLIST.length; i++) {
      $("#checkbox-c"+[i]).attr("checked", true);
    }
  });

  $('#all-fb-button').on('click', function(e){
    e.preventDefault();
    for (i = 0; i < FBLIST.length; i++) {
      $("#checkbox-fb"+[i]).attr("checked", true);
    }
  });

  $('#all-sb-button').on('click', function(e){
    e.preventDefault();
    for (i = 0; i < SBLIST.length; i++) {
      $("#checkbox-sb"+[i]).attr("checked", true);
    }
  });

  $('#all-tb-button').on('click', function(e){
    e.preventDefault();
    for (i = 0; i < TBLIST.length; i++) {
      $("#checkbox-tb"+[i]).attr("checked", true);
    }
  });

  $('#all-ss-button').on('click', function(e){
    e.preventDefault();
    for (i = 0; i < SSLIST.length; i++) {
      $("#checkbox-ss"+[i]).attr("checked", true);
    }
  });

  $('#all-of-button').on('click', function(e){
    e.preventDefault();
    for (i = 0; i < OFLIST.length; i++) {
      $("#checkbox-of"+[i]).attr("checked", true);
    }
  });

  $('#default-fp').on('click', function(e){
    e.preventDefault();
    for (i = 0; i < SELECTEDPLAYERS.length; i++) {
      $("#projection-slider-" + i).slider('setValue', SELECTEDPLAYERS[i].defaultFP);
    }
    for (i = 0; i < PLAYERS.length; i++) {
      PLAYERS[i].fp = PLAYERS[i].defaultFP;
    }
  });

  $('#even-ratios').on('click', function(e){
    e.preventDefault();
    for (i = 0; i < SELECTEDPLAYERS.length; i++) {
      $("#projection-slider-" + i).slider('setValue', SELECTEDPLAYERS[i].evenRatioFP);
    }
    for (i = 0; i < PLAYERS.length; i++) {
      PLAYERS[i].fp = PLAYERS[i].evenRatioFP;
    }
  });

  $('#close-missing-position-alert').on('click', function(e){
    e.preventDefault();
    $("#missing-position-message").addClass("hide");
  });
  $('#close-no-lineups-alert').on('click', function(e){
    e.preventDefault();
    $("#no-lineups-message").addClass("hide");
  });

  function isAPIAvailable() {
    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      // Great success! The File APIs are supported.
      return true;
    } else {
      // source: File API availability - http://caniuse.com/#feat=fileapi
      // source: <output> availability - http://html5doctor.com/the-output-element/
      document.writeln('The HTML5 APIs used in this form are only available in the following browsers:<br />');
      // 6.0 File API & 13.0 <output>
      document.writeln(' - Google Chrome: 13.0 or later<br />');
      // 3.6 File API & 6.0 <output>
      document.writeln(' - Mozilla Firefox: 6.0 or later<br />');
      // 10.0 File API & 10.0 <output>
      document.writeln(' - Internet Explorer: Not supported (partial support expected in 10.0)<br />');
      // ? File API & 5.1 <output>
      document.writeln(' - Safari: Not supported<br />');
      // ? File API & 9.2 <output>
      document.writeln(' - Opera: Not supported');
      return false;
    }
  }

  function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    var file = files[0];

    // READ THE FILE METADATA
    var output = ''
        output += '<span style="font-weight:bold;">' + escape(file.name) + '</span><br />\n';
        output += ' - File Type: ' + (file.type || 'n/a') + '<br />\n';
        output += ' - File Size: ' + file.size + ' bytes<br />\n';
        output += ' - Last Modified: ' + (file.lastModifiedDate ? file.lastModifiedDate.toLocaleDateString() : 'n/a') + '<br />\n';

    // READ THE FILE CONTENTS
    getData(file);
  }

  function handleTemplateSelect(evt) {
    var files = evt.target.files; // FileList object
    var file = files[0];

    // READ THE FILE METADATA
    var output = ''
        output += '<span style="font-weight:bold;">' + escape(file.name) + '</span><br />\n';
        output += ' - File Type: ' + (file.type || 'n/a') + '<br />\n';
        output += ' - File Size: ' + file.size + ' bytes<br />\n';
        output += ' - Last Modified: ' + (file.lastModifiedDate ? file.lastModifiedDate.toLocaleDateString() : 'n/a') + '<br />\n';

    // READ THE FILE CONTENTS
    getTemplateData(file);
  }

  function getSchedule() {
    $('#schedule-retry-container').addClass('hide');
    $("#schedule").empty();
    var target = document.getElementById('schedule-container');
    var spinner = new Spinner().spin(target);
    $(target).data('spinner', spinner);
    if (typeof $.cookie('mlb-schedule-cookie') === 'undefined') {
      $.ajax({
        url:"https://api.import.io/store/connector/b9cb1685-fa06-43df-9891-667d98f88360/_query?input=webpage/url:http%3A%2F%2Fwww.usatoday.com%2Fsports%2Fmlb%2Fschedule%2F&&_apikey=996f7681391e46a69c18e4d55f42d79ed11a3168b369aaf2daa247b4ee59aa2cffb0b34251f801583bb7c5ff5da9cd9af5c6246a4e7cc7d1c6bbf54fadace8f0da31eac819e798e8d4d6f8f98445ca8f",
        crossDomain: true,
        dataType: "json",
        success: function (scheduledata) {
          var schedule = [];
          var rawschedule = scheduledata.results;
          rawschedule.forEach(function (game) {
            var b = {
              time:game.time.replace("AM ET", " AM").replace("PM ET", " PM"),
              away:standardizeMLBTeamLabel(game["away/_text"].substring(0, game["away/_text"].indexOf(' '))),
              home:standardizeMLBTeamLabel(game["home/_text"].substring(0, game["home/_text"].indexOf(' ')))
            };
            schedule.push(b);
          });
          $.cookie("mlb-schedule-cookie", JSON.stringify(schedule), { expires: .125, path: '/' });
          displaySchedule(schedule);
        },
        error: function (xhr, status) {
          $('#schedule-retry-container').removeClass('hide');
          $('#schedule-container').data('spinner').stop();
        }
      });
    } else if (!!$.cookie('mlb-schedule-cookie')) {
      var schedule = JSON.parse($.cookie("mlb-schedule-cookie"));
      displaySchedule(schedule);
    }
  }

  function displaySchedule(schedule) {
    $("#schedule").append("<tr><th>Time</th><th class='include-checkbox'>LHB</th><th class='include-checkbox'>RHB</th><th>Away</th><th class='include-checkbox'>LHB</th><th class='include-checkbox'>RHB</th><th>Home</th></tr>");
    for (i = 0; i < schedule.length; i++) {
      $("#schedule").append("<tr><td>" + schedule[i].time + "</td><td class='include-checkbox' id='include-checkbox-away-lhb" + i + "'><input id='away-checkbox-lhb" + i + "'type='checkbox'></td><td class='include-checkbox'id='include-checkbox-away-rhb" + i + "'><input id='away-checkbox-rhb" + i + "'type='checkbox'></td><td id='schedule-away" + i + "'>" + schedule[i].away + "</td><td class='include-checkbox'id='include-checkbox-home-lhb" + i + "'><input id='home-checkbox-lhb" + i + "'type='checkbox'></td><td class='include-checkbox'id='include-checkbox-home-rhb" + i + "'><input id='home-checkbox-rhb" + i + "'type='checkbox'></td><td id='schedule-home" + i + "'>" + schedule[i].home + "</td></tr>");
    }
    $('#schedule-container').data('spinner').stop();
  }

  function getData(file) {
    PLAYERS = [];
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(event){
      var csv = event.target.result;
      var match = /\n/.exec(csv);
      if (match == null) {
        csv = csv.replace(/[\r|\r\n]/g, "\n");
      }
      var raw = $.csv.toObjects(csv);
      raw.forEach(function (player) {
        var b = {
          name:player.Name.replace(/\./g,''),
          cost:parseInt(player.Price),
          fp:parseFloat(player.Value || player.FPTS),
          defaultFP:parseFloat(player.Value || player.FPTS),
          evenRatioFP:evenRatios(parseInt(player.Price)),
          ratio:parseFloat(player.Ratio),
          position:player.Pos,
          handedness:getHandedness(player.Pos,player.Matchup),
          team:standardizeMLBTeamLabel(player.Team),
          opponent:standardizeMLBTeamLabel(fixMatchupString(player.Matchup)),
          starting:isStarting(player.Matchup),
          inj:standardizeInj(player.Inj.split(" ")[0]),
          percentOwned:0
        };
        if (b.cost > 0 && b.fp && b.starting != "Not Starting") {
          PLAYERS.push(b);
        }
      });
      preparePlayerData();
    };
    reader.onerror = function(){ alert('Unable to read ' + file.fileName); };
  }

  function getTemplateData(file) {
    TEMPLATEPLAYERS = [];
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(event){
      var csv = event.target.result;
      var match = /\n/.exec(csv);
      if (match == null) {
        csv = csv.replace(/[\r|\r\n]/g, "\n");
      }
      var raw = $.csv.toObjects(csv);
      raw.forEach(function (player) {
        var b = {
          name:player['First Name'] + " " + player['Last Name'],
          cost:parseInt(player.Salary),
          id:player.Id,
          team:standardizeMLBTeamLabel(player.Team),
          position:player.Position
        };
        if (b.cost > 0) {
          TEMPLATEPLAYERS.push(b);
        }
      });
      preparePlayerData();
    };
    reader.onerror = function(){ alert('Unable to read ' + file.fileName); };
  }

  function preparePlayerData () {
    if (PLAYERS.length > 0 && TEMPLATEPLAYERS.length > 0) {
      getTeams();
      removeNonTemplateTeamPlayers();
      updateScheduleDisplay();
      addTemplateIDs();
      displayPlayerSelectors();
    }
  }

  // GET ALL TEAMS AND TEAM COUNT
  function getTeams () {
    var allTeams = [];
    for (p = 0; p < TEMPLATEPLAYERS.length; p++) {
      allTeams.push(TEMPLATEPLAYERS[p].team);
    }
    TEAMS = $.unique(allTeams);
    TEAMCOUNT = TEAMS.length;
    TEAMS.sort();
    for (q = 0; q < TEAMS.length; q++) {
      TEAMSOBJECTS[q] = {team:TEAMS[q],players:[]};
    }
  }

  // REMOVE FROM PLAYER POOL ALL PLAYERS WHO HAVE TEAM THAT DOES NOT MATCH ANY OF THE TEAMS IN TEAMS VARIABLE
  function removeNonTemplateTeamPlayers () {
    for (i = PLAYERS.length - 1; i >= 0; i--) {
      if($.inArray(PLAYERS[i].team, TEAMS) === -1) {
        console.log("Removing " + PLAYERS[i].name + " (" + PLAYERS[i].team + ") from player pool");
        PLAYERS.splice(i, 1);
      }
    }
  }

  // UPDATE SCHEDULE DISPLAY TO COLORCODE THE GAME SLATE AS DEFINED BY THE TEAMS PRESENT IN TEAMS VARIABLE
  function updateScheduleDisplay () {
    for (i = 0; i < $('#schedule tr').length-1; i++) {
      if ($.inArray($('#schedule-away'+i).text(), TEAMS) === -1) {
        $('#schedule-away'+i).addClass("danger");
        $('#include-checkbox-away-lhb'+i).addClass("danger");
        $('#include-checkbox-away-rhb'+i).addClass("danger");
        document.getElementById('away-checkbox-lhb'+i).disabled = true;
        document.getElementById('away-checkbox-rhb'+i).disabled = true;
      } else {
        $('#schedule-away'+i).addClass("success");
        $('#include-checkbox-away-lhb'+i).addClass("success");
        $('#include-checkbox-away-rhb'+i).addClass("success");
      }
    }
    for (i = 0; i < $('#schedule tr').length-1; i++) {
      if ($.inArray($('#schedule-home'+i).text(), TEAMS) === -1) {
        $('#schedule-home'+i).addClass("danger");
        $('#include-checkbox-home-lhb'+i).addClass("danger");
        $('#include-checkbox-home-rhb'+i).addClass("danger");
        document.getElementById('home-checkbox-lhb'+i).disabled = true;
        document.getElementById('home-checkbox-rhb'+i).disabled = true;
      } else {
        $('#schedule-home'+i).addClass("success");
        $('#include-checkbox-home-lhb'+i).addClass("success");
        $('#include-checkbox-home-rhb'+i).addClass("success");
      }
    }
  }

  // DISPLAY STACK SELECTOR AND SELECTORS FOR EACH POSITION
  function displayPlayerSelectors () {

    var playerList = PLAYERS.slice();
    PLIST = $.grep(playerList, function(e) { return e.position == "P" });
    CLIST = $.grep(playerList, function(e) { return e.position == "C" });
    FBLIST = $.grep(playerList, function(e) { return e.position == "1B" });
    SBLIST = $.grep(playerList, function(e) { return e.position == "2B" });
    TBLIST = $.grep(playerList, function(e) { return e.position == "3B" });
    SSLIST = $.grep(playerList, function(e) { return e.position == "SS" });
    OFLIST = $.grep(playerList, function(e) { return e.position == "OF" });

    PLIST.sort(sortByFP);
    CLIST.sort(sortByFP);
    FBLIST.sort(sortByFP);
    SBLIST.sort(sortByFP);
    TBLIST.sort(sortByFP);
    SSLIST.sort(sortByFP);
    OFLIST.sort(sortByFP);

    PLIST.sort(sortByName);
    CLIST.sort(sortByName);
    FBLIST.sort(sortByName);
    SBLIST.sort(sortByName);
    TBLIST.sort(sortByName);
    SSLIST.sort(sortByName);
    OFLIST.sort(sortByName);
    
    $("#stack-selector").append("<option value='none'>None</option><option value='any'>Any</option>");
    for (i = 0; i < TEAMS.length; i++) {
      $("#stack-selector").append("<option value='" + TEAMS[i] + "'>" + TEAMS[i] + "</option>");
    }
    $("#stack-container").removeClass("hide");
    for (i = 0; i < PLIST.length; i++) {
      $("#p-selector").append("<tr id='player-selector-row-p" + i + "'><td>" + PLIST[i].team + "</td><td>" + PLIST[i].name + "</td><td class='include-checkbox'><input id='checkbox-p" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < CLIST.length; i++) {
      $("#c-selector").append("<tr id='player-selector-row-c" + i + "'><td>" + CLIST[i].team + "</td><td>" + CLIST[i].name + "</td><td class='include-checkbox'><input id='checkbox-c" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < FBLIST.length; i++) {
      $("#fb-selector").append("<tr id='player-selector-row-fb" + i + "'><td>" + FBLIST[i].team + "</td><td>" + FBLIST[i].name + "</td><td class='include-checkbox'><input id='checkbox-fb" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < SBLIST.length; i++) {
      $("#sb-selector").append("<tr id='player-selector-row-sb" + i + "'><td>" + SBLIST[i].team + "</td><td>" + SBLIST[i].name + "</td><td class='include-checkbox'><input id='checkbox-sb" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < TBLIST.length; i++) {
      $("#tb-selector").append("<tr id='player-selector-row-tb" + i + "'><td>" + TBLIST[i].team + "</td><td>" + TBLIST[i].name + "</td><td class='include-checkbox'><input id='checkbox-tb" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < SSLIST.length; i++) {
      $("#ss-selector").append("<tr id='player-selector-row-ss" + i + "'><td>" + SSLIST[i].team + "</td><td>" + SSLIST[i].name + "</td><td class='include-checkbox'><input id='checkbox-ss" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < OFLIST.length; i++) {
      $("#of-selector").append("<tr id='player-selector-row-of" + i + "'><td>" + OFLIST[i].team + "</td><td>" + OFLIST[i].name + "</td><td class='include-checkbox'><input id='checkbox-of" + i + "'type='checkbox'></td></tr>");
    }

    for (i = 0; i < PLIST.length; i++) {
      if (PLIST[i].starting == "Not Starting") {
        $("#player-selector-row-p" + i).addClass("danger");
      } else if (PLIST[i].starting == "Starting") {
        $("#player-selector-row-p" + i).addClass("success");
      } 
    }
    for (i = 0; i < CLIST.length; i++) {
      if (CLIST[i].starting == "Not Starting") {
        $("#player-selector-row-c" + i).addClass("danger");
      } else if (CLIST[i].starting == "Starting") {
        $("#player-selector-row-c" + i).addClass("success");
      } 
    }
    for (i = 0; i < FBLIST.length; i++) {
      if (FBLIST[i].starting == "Not Starting") {
        $("#player-selector-row-fb" + i).addClass("danger");
      } else if (FBLIST[i].starting == "Starting") {
        $("#player-selector-row-fb" + i).addClass("success");
      } 
    }
    for (i = 0; i < SBLIST.length; i++) {
      if (SBLIST[i].starting == "Not Starting") {
        $("#player-selector-row-sb" + i).addClass("danger");
      } else if (SBLIST[i].starting == "Starting") {
        $("#player-selector-row-sb" + i).addClass("success");
      } 
    }
    for (i = 0; i < TBLIST.length; i++) {
      if (TBLIST[i].starting == "Not Starting") {
        $("#player-selector-row-tb" + i).addClass("danger");
      } else if (TBLIST[i].starting == "Starting") {
        $("#player-selector-row-tb" + i).addClass("success");
      } 
    }
    for (i = 0; i < SSLIST.length; i++) {
      if (SSLIST[i].starting == "Not Starting") {
        $("#player-selector-row-ss" + i).addClass("danger");
      } else if (SSLIST[i].starting == "Starting") {
        $("#player-selector-row-ss" + i).addClass("success");
      } 
    }
    for (i = 0; i < OFLIST.length; i++) {
      if (OFLIST[i].starting == "Not Starting") {
        $("#player-selector-row-of" + i).addClass("danger");
      } else if (OFLIST[i].starting == "Starting") {
        $("#player-selector-row-of" + i).addClass("success");
      } 
    }

    $("#player-selectors").removeClass("hide");
  }

  // GET AN OPTIMIZED LINEUP
  function optimize(){
    $("body").addClass("loading");
    $("#csv-export").addClass("hide");
    $("#export-type-selector").addClass("hide");
    if (!$('#percent-owned-list').is(':empty')) {
    	updateProjections(SELECTEDPLAYERS);
    }
    $('#percent-owned-list').empty();
    $("#percent-owned-container").addClass("hide");
    $("#missing-position-message").addClass("hide");
    $("#missing-position-text").empty();
    $("#no-lineups-message").addClass("hide");

    LINEUP = {
      p: {},
      c: {},
      fb: {},
      sb: {},
      tb: {},
      ss: {},
      of1: {},
      of2: {},
      of3: {}
    }
    LINEUPQUANTITY = $('#lineup-quantity').val();
    MAXLENGTH = LINEUPQUANTITY;
    $('#team-pitcher-percentage-table-container').empty();
    $('#team-hitter-percentage-table-container').empty();
    $('#lineup-container').empty();
    LINEUPSARRAY = [];

    var playerList = PLAYERS.slice();

    var userPList = [];
    var userCList = [];
    var userFBList = [];
    var userSBList = [];
    var userTBList = [];
    var userSSList = [];
    var userOFList = [];

    STACKTEAM = $('#stack-selector').val();

    for (i = 0; i < $('#schedule tr').length-1; i++) {
      if (document.getElementById('away-checkbox-lhb'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].team == $('#schedule-away'+i).text()) {
          	if (PLAYERS[j].handedness == "L") {
  	          if (PLAYERS[j].starting == "Starting" || PLAYERS[j].starting == "Projected Starting") {
                if (PLAYERS[j].position == "C" && containsObject(PLAYERS[j],userCList) !== true) {
                  userCList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "1B" && containsObject(PLAYERS[j],userFBList) !== true) {
                  userFBList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "2B" && containsObject(PLAYERS[j],userSBList) !== true) {
                  userSBList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "3B" && containsObject(PLAYERS[j],userTBList) !== true) {
                  userTBList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "SS" && containsObject(PLAYERS[j],userSSList) !== true) {
                  userSSList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "OF" && containsObject(PLAYERS[j],userOFList) !== true) {
                  userOFList.push(PLAYERS[j]);
                }
  	          }
            }
          }
        }
      }
    }
    for (i = 0; i < $('#schedule tr').length-1; i++) {
      if (document.getElementById('away-checkbox-rhb'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].team == $('#schedule-away'+i).text()) {
          	if (PLAYERS[j].handedness == "R") {
  	          if (PLAYERS[j].starting == "Starting" || PLAYERS[j].starting == "Projected Starting") {
                if (PLAYERS[j].position == "C" && containsObject(PLAYERS[j],userCList) !== true) {
                  userCList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "1B" && containsObject(PLAYERS[j],userFBList) !== true) {
                  userFBList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "2B" && containsObject(PLAYERS[j],userSBList) !== true) {
                  userSBList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "3B" && containsObject(PLAYERS[j],userTBList) !== true) {
                  userTBList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "SS" && containsObject(PLAYERS[j],userSSList) !== true) {
                  userSSList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "OF" && containsObject(PLAYERS[j],userOFList) !== true) {
                  userOFList.push(PLAYERS[j]);
                }
  	          }
            }
          }
        }
      }
    }
    for (i = 0; i < $('#schedule tr').length-1; i++) {
      if (document.getElementById('home-checkbox-lhb'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].team == $('#schedule-home'+i).text()) {
          	if (PLAYERS[j].handedness == "L") {
  	          if (PLAYERS[j].starting == "Starting" || PLAYERS[j].starting == "Projected Starting") {
                if (PLAYERS[j].position == "C" && containsObject(PLAYERS[j],userCList) !== true) {
                  userCList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "1B" && containsObject(PLAYERS[j],userFBList) !== true) {
                  userFBList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "2B" && containsObject(PLAYERS[j],userSBList) !== true) {
                  userSBList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "3B" && containsObject(PLAYERS[j],userTBList) !== true) {
                  userTBList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "SS" && containsObject(PLAYERS[j],userSSList) !== true) {
                  userSSList.push(PLAYERS[j]);
                } else if (PLAYERS[j].position == "OF" && containsObject(PLAYERS[j],userOFList) !== true) {
                  userOFList.push(PLAYERS[j]);
                }
  	          }
            }
          }
        }
      }
    }
    for (i = 0; i < $('#schedule tr').length-1; i++) {
      if (document.getElementById('home-checkbox-rhb'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].team == $('#schedule-home'+i).text()) {
          	if (PLAYERS[j].handedness == "R") {
  	          if (PLAYERS[j].starting == "Starting" || PLAYERS[j].starting == "Projected Starting") {
  	            if (PLAYERS[j].position == "C" && containsObject(PLAYERS[j],userCList) !== true) {
  	              userCList.push(PLAYERS[j]);
  	            } else if (PLAYERS[j].position == "1B" && containsObject(PLAYERS[j],userFBList) !== true) {
  	              userFBList.push(PLAYERS[j]);
  	            } else if (PLAYERS[j].position == "2B" && containsObject(PLAYERS[j],userSBList) !== true) {
  	              userSBList.push(PLAYERS[j]);
  	            } else if (PLAYERS[j].position == "3B" && containsObject(PLAYERS[j],userTBList) !== true) {
  	              userTBList.push(PLAYERS[j]);
  	            } else if (PLAYERS[j].position == "SS" && containsObject(PLAYERS[j],userSSList) !== true) {
  	              userSSList.push(PLAYERS[j]);
  	            } else if (PLAYERS[j].position == "OF" && containsObject(PLAYERS[j],userOFList) !== true) {
  	              userOFList.push(PLAYERS[j]);
  	            }
  	          }
            }
          }
        }
      }
    }

    for (i = 0; i < PLIST.length; i++) {
      if (document.getElementById('checkbox-p'+i).checked) {
        if (containsObject(PLIST[i],userPList) !== true) {
          userPList.push(PLIST[i]);
        }
      }
    }
    for (i = 0; i < CLIST.length; i++) {
      if (document.getElementById('checkbox-c'+i).checked) {
        if (containsObject(CLIST[i],userCList) !== true) {
          userCList.push(CLIST[i]);
        }
      }
    }
    for (i = 0; i < FBLIST.length; i++) {
      if (document.getElementById('checkbox-fb'+i).checked) {
        if (containsObject(FBLIST[i],userFBList) !== true) {
          userFBList.push(FBLIST[i]);
        }
      }
    }
    for (i = 0; i < SBLIST.length; i++) {
      if (document.getElementById('checkbox-sb'+i).checked) {
        if (containsObject(SBLIST[i],userSBList) !== true) {
          userSBList.push(SBLIST[i]);
        }
      }
    }
    for (i = 0; i < TBLIST.length; i++) {
      if (document.getElementById('checkbox-tb'+i).checked) {
        if (containsObject(TBLIST[i],userTBList) !== true) {
          userTBList.push(TBLIST[i]);
        }
      }
    }
    for (i = 0; i < SSLIST.length; i++) {
      if (document.getElementById('checkbox-ss'+i).checked) {
        if (containsObject(SSLIST[i],userSSList) !== true) {
          userSSList.push(SSLIST[i]);
        }
      }
    }
    for (i = 0; i < OFLIST.length; i++) {
      if (document.getElementById('checkbox-of'+i).checked) {
        if (containsObject(OFLIST[i],userOFList) !== true) {
          userOFList.push(OFLIST[i]);
        }
      }
    }

    var allSelectedPlayers = userPList.concat(userCList, userFBList, userSBList, userTBList, userSSList, userOFList);
    var playerCount = allSelectedPlayers.length;

    if (playerCount > 90) {
      if (TEAMCOUNT <= 16) {
        userPList.sort(sortByFP);
        userPList = userPList.slice(0, TEAMCOUNT);
      } else {
        userPList.sort(sortByRatio);
        var pListByRatio = userPList.slice(0, 10);
        userPList.sort(sortByFP);
        var pListByFP = userPList.slice(0, 6);
        userPList = arrayUnique(pListByRatio.concat(pListByFP));
      }

      userCList.sort(sortByRatio);
      var cListByRatio = userCList.slice(0, 5);
      userCList.sort(sortByFP);
      var cListByFP = userCList.slice(0, 5);
      userCList = arrayUnique(cListByRatio.concat(cListByFP));

      userFBList.sort(sortByRatio);
      var fbListByRatio = userFBList.slice(0, 5);
      userFBList.sort(sortByFP);
      var fbListByFP = userFBList.slice(0, 5);
      userFBList = arrayUnique(fbListByRatio.concat(fbListByFP));

      userSBList.sort(sortByRatio);
      var sbListByRatio = userSBList.slice(0, 5);
      userSBList.sort(sortByFP);
      var sbListByFP = userSBList.slice(0, 5);
      userSBList = arrayUnique(sbListByRatio.concat(sbListByFP));

      userTBList.sort(sortByRatio);
      var tbListByRatio = userTBList.slice(0, 5);
      userTBList.sort(sortByFP);
      var tbListByFP = userTBList.slice(0, 5);
      userTBList = arrayUnique(tbListByRatio.concat(tbListByFP));

      userSSList.sort(sortByRatio);
      var ssListByRatio = userSSList.slice(0, 5);
      userSSList.sort(sortByFP);
      var ssListByFP = userSSList.slice(0, 5);
      userSSList = arrayUnique(ssListByRatio.concat(ssListByFP));

      userOFList.sort(sortByRatio);
      var ofListByRatio = userOFList.slice(0, 20);
      userOFList.sort(sortByFP);
      var ofListByFP = userOFList.slice(0, 10);
      userOFList = arrayUnique(ofListByRatio.concat(ofListByFP));
    }

    userPList.sort(reverseSortByCost);
    userCList.sort(reverseSortByCost);
    userFBList.sort(reverseSortByCost);
    userSBList.sort(reverseSortByCost);
    userTBList.sort(reverseSortByCost);
    userSSList.sort(reverseSortByCost);
    userOFList.sort(reverseSortByCost);

    LINEUP.p = userPList[0];
    LINEUP.c = userCList[0];
    LINEUP.fb = userFBList[0];
    LINEUP.sb = userSBList[0];
    LINEUP.tb = userTBList[0];
    LINEUP.ss = userSSList[0];
    LINEUP.of1 = userOFList[0];

    console.log("starting new loops");
    var checkNewLineupCounter = 0;
    var maxSal = 35000;
    var minSal = $('#min-salary').val();
    pLength = userPList.length;
    cLength = userCList.length;
    fbLength = userFBList.length;
    sbLength = userSBList.length;
    tbLength = userTBList.length;
    ssLength = userSSList.length;
    ofLength = userOFList.length;

    if (pLength < 1) {
    	$("#missing-position-text").append("<strong>You must select at least one Pitcher.</strong><br>");
    }
    if (cLength < 1) {
    	$("#missing-position-text").append("<strong>You must select at least one Catcher.</strong><br>");
    }
    if (fbLength < 1) {
    	$("#missing-position-text").append("<strong>You must select at least one First Baseman.</strong><br>");
    }
    if (sbLength < 1) {
    	$("#missing-position-text").append("<strong>You must select at least one Second Baseman.</strong><br>");
    }
    if (tbLength < 1) {
    	$("#missing-position-text").append("<strong>You must select at least one Third Baseman.</strong><br>");
    }
    if (ssLength < 1) {
    	$("#missing-position-text").append("<strong>You must select at least one Shortstop.</strong><br>");
    }
    if (ofLength < 3) {
    	$("#missing-position-text").append("<strong>You must select at least three Outfielders.</strong>");
    }

    if (pLength < 1 || cLength < 1 || fbLength < 1 || sbLength < 1 || tbLength < 1 || ssLength < 1 || ofLength < 3) {
    	$("#missing-position-message").removeClass("hide");
		$("body").removeClass("loading");
		return false;
    }

    if (STACKTEAM !== "none") {
      for (p = 0; p < pLength; p++) {
        LINEUP.p = userPList[p];
        for (c = 0; c < cLength; c++){
          LINEUP.c = userCList[c];
          for (fb = 0; fb < fbLength; fb++){
            LINEUP.fb = userFBList[fb];
            for (sb = 0; sb < sbLength; sb++){
              LINEUP.sb = userSBList[sb];
              for (tb = 0; tb < tbLength; tb++){
                LINEUP.tb = userTBList[tb];
                for (ss = 0; ss < ssLength; ss++){
                  LINEUP.ss = userSSList[ss];
                  for (of1 = 0; of1 < ofLength-2; of1++) {
                    LINEUP.of1 = userOFList[of1];
                    for (of2 = of1+1; of2 < ofLength-1; of2++) {
                      LINEUP.of2 = userOFList[of2];
                      for (of3 = of2+1; of3 < ofLength; of3++) {
                        LINEUP.of3 = userOFList[of3];
                        var lPrice = getLineupCost(LINEUP);
                        if(lPrice > maxSal){
                          break;
                        } else if(lPrice >= minSal){
                            checkLineupStack(LINEUP);
                            checkNewLineupCounter++;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      for (p = 0; p < pLength; p++) {
        LINEUP.p = userPList[p];
        for (c = 0; c < cLength; c++){
          LINEUP.c = userCList[c];
          for (fb = 0; fb < fbLength; fb++){
            LINEUP.fb = userFBList[fb];
            for (sb = 0; sb < sbLength; sb++){
              LINEUP.sb = userSBList[sb];
              for (tb = 0; tb < tbLength; tb++){
                LINEUP.tb = userTBList[tb];
                for (ss = 0; ss < ssLength; ss++){
                  LINEUP.ss = userSSList[ss];
                  for (of1 = 0; of1 < ofLength-2; of1++) {
                    LINEUP.of1 = userOFList[of1];
                    for (of2 = of1+1; of2 < ofLength-1; of2++) {
                      LINEUP.of2 = userOFList[of2];
                      for (of3 = of2+1; of3 < ofLength; of3++) {
                        LINEUP.of3 = userOFList[of3];
                        var lPrice = getLineupCost(LINEUP);
                        if(lPrice > maxSal){
                          break;
                        } else if(lPrice >= minSal){
                            checkLineup(LINEUP);
                            checkNewLineupCounter++;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log("new nested loops done");
    console.log(checkNewLineupCounter);
    
    LINEUPSARRAY.sort(sortByFP);
    console.log("Array done");
    setLineupPercentOwned();
    setTeamPercentOwned();
          
    $("#csv-export").removeClass("hide");
    $("#export-type-selector").removeClass("hide");
    if (LINEUPSARRAY.length < 1) {
      $("#no-lineups-message").removeClass("hide");
    } else {
      displayPercentOwnedList(allSelectedPlayers);
    }

    TEAMSOBJECTS.sort(sortByPitcherPercentOwned);
    $('#team-pitcher-percentage-table-container').append("<h3>Pitchers Percent Owned</h3>");
    for (i = 0; i < TEAMCOUNT; i++) {
      if (TEAMSOBJECTS[i].pitcherPercentOwned > 0) {
        $('#team-pitcher-percentage-table-container').append("<div class='team-percentage-table'><table class='table' id='tbl-team-pitcher-percentage" + i + "'></table></div>");
        $('#tbl-team-pitcher-percentage' + i).append("<tr><th>" + TEAMSOBJECTS[i].team + "</th><th>" + TEAMSOBJECTS[i].pitcherPercentOwned.toFixed(2) + "%</th></tr>");
        for (j = 0; j < TEAMSOBJECTS[i].players.length; j++) {
          if (TEAMSOBJECTS[i].players[j].position == "P") {
            $('#tbl-team-pitcher-percentage' + i).append("<tr><td>" + TEAMSOBJECTS[i].players[j].name + "</td><td>" + TEAMSOBJECTS[i].players[j].percentOwned.toFixed(2) + "%</td></tr>");
          }
        }
      }
    }

    TEAMSOBJECTS.sort(sortByHitterPercentOwned);
    $('#team-hitter-percentage-table-container').append("<h3>Hitters Percent Owned</h3>");
    for (i = 0; i < TEAMCOUNT; i++) {
      if (TEAMSOBJECTS[i].hitterPercentOwned > 0) {
        $('#team-hitter-percentage-table-container').append("<div class='team-percentage-table'><table class='table' id='tbl-team-hitter-percentage" + i + "'></table></div>");
        $('#tbl-team-hitter-percentage' + i).append("<tr><th>" + TEAMSOBJECTS[i].team + "</th><th>" + TEAMSOBJECTS[i].hitterPercentOwned.toFixed(2) + "%</th></tr>");
        for (j = 0; j < TEAMSOBJECTS[i].players.length; j++) {
          if (TEAMSOBJECTS[i].players[j].position != "P") {
            $('#tbl-team-hitter-percentage' + i).append("<tr><td>" + TEAMSOBJECTS[i].players[j].name + "</td><td>" + TEAMSOBJECTS[i].players[j].percentOwned.toFixed(2) + "%</td></tr>");
          }
        }
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      $('#lineup-container').append("<div id='lineup-title" + i + "'></div>");
      $('#lineup-container').append("<div id='total-cost" + i + "'></div><div id='total-projected-points" + i + "'></div>");
      $('#lineup-container').append("<div class='table-responsive'><table class='table' id='tbl-optimized" + i + "'></table></div>");
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      $('#lineup-title' + i).append("<h3>Lineup #" + (i+1) + "</h3>");
      $('#total-cost' + i).append("Total Cost: <b>$" + commaSeparateNumber(LINEUPSARRAY[i].cost) + "</b>");
      $('#total-projected-points' + i).append("Total Projected Points: <b>" + LINEUPSARRAY[i].fp.toFixed(2) + "</b>");
      $('#tbl-optimized' + i).append("<tr><th>Team</th><th>Position</th><th>Inj</th><th>Name</th><th>Projected Points</th><th>Cost</th><th>% Owned</th></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-p" + i + "'><td>" + LINEUPSARRAY[i].players.p.team + "</td><td>P</td><td id='inj-p" + i + "'>" + LINEUPSARRAY[i].players.p.inj + "</td><td id='name-p" + i + "'>" + LINEUPSARRAY[i].players.p.name + "</td><td>" + LINEUPSARRAY[i].players.p.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.p.cost) + "</td><td>" + LINEUPSARRAY[i].players.p.percentOwned.toFixed(2) + "%</td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-c" + i + "'><td>" + LINEUPSARRAY[i].players.c.team + "</td><td>C</td><td id='inj-c" + i + "'>" + LINEUPSARRAY[i].players.c.inj + "</td><td id='name-c" + i + "'>" + LINEUPSARRAY[i].players.c.name + "</td><td>" + LINEUPSARRAY[i].players.c.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.c.cost) + "</td><td>" + LINEUPSARRAY[i].players.c.percentOwned.toFixed(2) + "%</td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-fb" + i + "'><td>" + LINEUPSARRAY[i].players.fb.team + "</td><td>1B</td><td id='inj-fb" + i + "'>" + LINEUPSARRAY[i].players.fb.inj + "</td><td id='name-fb" + i + "'>" + LINEUPSARRAY[i].players.fb.name + "</td><td>" + LINEUPSARRAY[i].players.fb.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.fb.cost) + "</td><td>" + LINEUPSARRAY[i].players.fb.percentOwned.toFixed(2) + "%</td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-sb" + i + "'><td>" + LINEUPSARRAY[i].players.sb.team + "</td><td>2B</td><td id='inj-sb" + i + "'>" + LINEUPSARRAY[i].players.sb.inj + "</td><td id='name-sb" + i + "'>" + LINEUPSARRAY[i].players.sb.name + "</td><td>" + LINEUPSARRAY[i].players.sb.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.sb.cost) + "</td><td>" + LINEUPSARRAY[i].players.sb.percentOwned.toFixed(2) + "%</td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-tb" + i + "'><td>" + LINEUPSARRAY[i].players.tb.team + "</td><td>3B</td><td id='inj-tb" + i + "'>" + LINEUPSARRAY[i].players.tb.inj + "</td><td id='name-tb" + i + "'>" + LINEUPSARRAY[i].players.tb.name + "</td><td>" + LINEUPSARRAY[i].players.tb.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.tb.cost) + "</td><td>" + LINEUPSARRAY[i].players.tb.percentOwned.toFixed(2) + "%</td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-ss" + i + "'><td>" + LINEUPSARRAY[i].players.ss.team + "</td><td>SS</td><td id='inj-ss" + i + "'>" + LINEUPSARRAY[i].players.ss.inj + "</td><td id='name-ss" + i + "'>" + LINEUPSARRAY[i].players.ss.name + "</td><td>" + LINEUPSARRAY[i].players.ss.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.ss.cost) + "</td><td>" + LINEUPSARRAY[i].players.ss.percentOwned.toFixed(2) + "%</td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-1of" + i + "'><td>" + LINEUPSARRAY[i].players.of1.team + "</td><td>OF</td><td id='inj-1of" + i + "'>" + LINEUPSARRAY[i].players.of1.inj + "</td><td id='name-1of" + i + "'>" + LINEUPSARRAY[i].players.of1.name + "</td><td>" + LINEUPSARRAY[i].players.of1.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.of1.cost) + "</td><td>" + LINEUPSARRAY[i].players.of1.percentOwned.toFixed(2) + "%</td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-2of" + i + "'><td>" + LINEUPSARRAY[i].players.of2.team + "</td><td>OF</td><td id='inj-2of" + i + "'>" + LINEUPSARRAY[i].players.of2.inj + "</td><td id='name-2of" + i + "'>" + LINEUPSARRAY[i].players.of2.name + "</td><td>" + LINEUPSARRAY[i].players.of2.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.of2.cost) + "</td><td>" + LINEUPSARRAY[i].players.of2.percentOwned.toFixed(2) + "%</td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-3of" + i + "'><td>" + LINEUPSARRAY[i].players.of3.team + "</td><td>OF</td><td id='inj-3of" + i + "'>" + LINEUPSARRAY[i].players.of3.inj + "</td><td id='name-3of" + i + "'>" + LINEUPSARRAY[i].players.of3.name + "</td><td>" + LINEUPSARRAY[i].players.of3.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.of3.cost) + "</td><td>" + LINEUPSARRAY[i].players.of3.percentOwned.toFixed(2) + "%</td></tr>");
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.p.starting == "Not Starting") {
        $("#lineup-table-row-p" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.p.starting == "Starting") {
        $("#lineup-table-row-p" + i).addClass("success");
      } 
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.c.starting == "Not Starting") {
        $("#lineup-table-row-c" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.c.starting == "Starting") {
        $("#lineup-table-row-c" + i).addClass("success");
      } 
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.fb.starting == "Not Starting") {
        $("#lineup-table-row-fb" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.fb.starting == "Starting") {
        $("#lineup-table-row-fb" + i).addClass("success");
      } 
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.sb.starting == "Not Starting") {
        $("#lineup-table-row-sb" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.sb.starting == "Starting") {
        $("#lineup-table-row-sb" + i).addClass("success");
      } 
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.tb.starting == "Not Starting") {
        $("#lineup-table-row-tb" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.tb.starting == "Starting") {
        $("#lineup-table-row-tb" + i).addClass("success");
      } 
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.ss.starting == "Not Starting") {
        $("#lineup-table-row-ss" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.ss.starting == "Starting") {
        $("#lineup-table-row-ss" + i).addClass("success");
      } 
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.of1.starting == "Not Starting") {
        $("#lineup-table-row-1of" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.of1.starting == "Starting") {
        $("#lineup-table-row-1of" + i).addClass("success");
      } 
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.of2.starting == "Not Starting") {
        $("#lineup-table-row-2of" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.of2.starting == "Starting") {
        $("#lineup-table-row-2of" + i).addClass("success");
      } 
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.of3.starting == "Not Starting") {
        $("#lineup-table-row-3of" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.of3.starting == "Starting") {
        $("#lineup-table-row-3of" + i).addClass("success");
      } 
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.p.inj == "A") {
        $("#inj-p" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.p.inj == "P") {
        $("#inj-p" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.p.inj == "Q") {
        $("#inj-p" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.p.inj == "D") {
        $("#inj-p" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.p.inj == "O") {
        $("#inj-p" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.c.inj == "A") {
        $("#inj-c" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.c.inj == "P") {
        $("#inj-c" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.c.inj == "Q") {
        $("#inj-c" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.c.inj == "D") {
        $("#inj-c" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.c.inj == "O") {
        $("#inj-c" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.fb.inj == "A") {
        $("#inj-fb" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.fb.inj == "P") {
        $("#inj-fb" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.fb.inj == "Q") {
        $("#inj-fb" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.fb.inj == "D") {
        $("#inj-fb" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.fb.inj == "O") {
        $("#inj-fb" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.sb.inj == "A") {
        $("#inj-sb" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.sb.inj == "P") {
        $("#inj-sb" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.sb.inj == "Q") {
        $("#inj-sb" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.sb.inj == "D") {
        $("#inj-sb" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.sb.inj == "O") {
        $("#inj-sb" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.tb.inj == "A") {
        $("#inj-tb" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.tb.inj == "P") {
        $("#inj-tb" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.tb.inj == "Q") {
        $("#inj-tb" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.tb.inj == "D") {
        $("#inj-tb" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.tb.inj == "O") {
        $("#inj-tb" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.ss.inj == "A") {
        $("#inj-ss" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.ss.inj == "P") {
        $("#inj-ss" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.ss.inj == "Q") {
        $("#inj-ss" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.ss.inj == "D") {
        $("#inj-ss" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.ss.inj == "O") {
        $("#inj-ss" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.of1.inj == "A") {
        $("#inj-1of" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.of1.inj == "P") {
        $("#inj-1of" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.of1.inj == "Q") {
        $("#inj-1of" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.of1.inj == "D") {
        $("#inj-1of" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.of1.inj == "O") {
        $("#inj-1of" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.of2.inj == "A") {
        $("#inj-2of" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.of2.inj == "P") {
        $("#inj-2of" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.of2.inj == "Q") {
        $("#inj-2of" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.of2.inj == "D") {
        $("#inj-2of" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.of2.inj == "O") {
        $("#inj-2of" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.of3.inj == "A") {
        $("#inj-3of" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.of3.inj == "P") {
        $("#inj-3of" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.of3.inj == "Q") {
        $("#inj-3of" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.of3.inj == "D") {
        $("#inj-3of" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.of3.inj == "O") {
        $("#inj-3of" + i).addClass("inj-out");
      }
    }

    $("body").removeClass("loading");
    if (!$("#percent-owned-container").hasClass("hide")) {
      $('html,body').animate({
          scrollTop: $("#percent-owned-container").offset().top-100},
          'slow');
    }
  }

  // A FUNCTION TO DETERMINE VALIDITY & STACK OF LINEUP AND ADD IT TO "LINEUPSARRAY" IF IT'S A TOP LINEUP
  function checkLineupStack(lineup) {
    var lineupFP = getLineupFP(lineup);
    if (STACKTEAM == "any") {
      if (LINEUPSARRAY.length < MAXLENGTH) {
        if (!isNotStack(lineup) && isValidLineup(lineup) && !pitchersOpposeBatters(lineup)) {
          var lineupCost = getLineupCost(lineup);
          var lineupID = getLineupID(lineup);
          LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
          LINEUPSARRAY.sort(sortByFP);
        }
      } else if (lineupFP > LINEUPSARRAY[MAXLENGTH-1].fp) {
        if (!isNotStack(lineup) && isValidLineup(lineup) && !pitchersOpposeBatters(lineup)) {
          var lineupCost = getLineupCost(lineup);
          var lineupID = getLineupID(lineup);
          LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
          LINEUPSARRAY.sort(sortByFP);
          LINEUPSARRAY.pop();
        }
      }
    } else {
      if (LINEUPSARRAY.length < MAXLENGTH) {
        if (isSelectedStack(lineup, STACKTEAM) && isValidLineup(lineup) && !pitchersOpposeBatters(lineup)) {
          var lineupCost = getLineupCost(lineup);
          var lineupID = getLineupID(lineup);
          LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
          LINEUPSARRAY.sort(sortByFP);
        }
      } else if (lineupFP > LINEUPSARRAY[MAXLENGTH-1].fp) {
        if (isSelectedStack(lineup, STACKTEAM) && isValidLineup(lineup) && !pitchersOpposeBatters(lineup)) {
          var lineupCost = getLineupCost(lineup);
          var lineupID = getLineupID(lineup);
          LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
          LINEUPSARRAY.sort(sortByFP);
          LINEUPSARRAY.pop();
        }
      }
    }
  }

  // A FUNCTION TO DETERMINE VALIDITY OF LINEUP AND ADD IT TO "LINEUPSARRAY" IF IT'S A TOP LINEUP
  function checkLineup(lineup) {
    var lineupFP = getLineupFP(lineup);
    if (LINEUPSARRAY.length < MAXLENGTH) {
      if (isValidLineup(lineup) && !pitchersOpposeBatters(lineup)) {
        var lineupCost = getLineupCost(lineup);
        var lineupID = getLineupID(lineup);
        LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
        LINEUPSARRAY.sort(sortByFP);
      }
    } else if (lineupFP > LINEUPSARRAY[MAXLENGTH-1].fp) {
      if (isValidLineup(lineup) && !pitchersOpposeBatters(lineup)) {
        var lineupCost = getLineupCost(lineup);
        var lineupID = getLineupID(lineup);
        LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
        LINEUPSARRAY.sort(sortByFP);
        LINEUPSARRAY.pop();
      }
    }
  }

  // A FUNCTION TO RETURN PLAYER HANDEDNESS BASED ON POSITION(S) AND MATCHUP STRING
  function getHandedness(pos, matchupString) {
    if (pos == "P") {
      return matchupString.charAt(0);
    } else if (matchupString.toLowerCase().indexOf(") r") >= 0) {
      return "R";
    } else if (matchupString.toLowerCase().indexOf(") l") >= 0) {
      return "L";
    } else if (matchupString.toLowerCase().indexOf("l) s") >= 0) {
      return "R";
    } else if (matchupString.toLowerCase().indexOf("r) s") >= 0) {
      return "L";
    } else {
      return null;
    }
  }

  // STANDARDIZE MLB TEAM INITIALS
  function standardizeMLBTeamLabel(team) {
    team = team.toUpperCase();
    if (team == "ARI") {
      return "ARI";
    }
    if (team == "ATL") {
      return "ATL";
    }
    if (team == "BAL") {
      return "BAL";
    }
    if (team == "BOS") {
      return "BOS";
    }
    if (team == "CHC") {
      return "CHC";
    }
    if (team == "CWS" || team == "CHW") {
      return "CWS";
    }
    if (team == "CIN") {
      return "CIN";
    }
    if (team == "CLE") {
      return "CLE";
    }
    if (team == "COL") {
      return "COL";
    }
    if (team == "DET") {
      return "DET";
    }
    if (team == "MIA") {
      return "MIA";
    }
    if (team == "HOU") {
      return "HOU";
    }
    if (team == "KC" || team == "KAN" || team == "KCR") {
      return "KC";
    }
    if (team == "LAA") {
      return "LAA";
    }
    if (team == "LAD" || team == "LOS") {
      return "LAD";
    }
    if (team == "MIL") {
      return "MIL";
    }
    if (team == "MIN") {
      return "MIN";
    }
    if (team == "NYM") {
      return "NYM";
    }
    if (team == "NYY") {
      return "NYY";
    }
    if (team == "OAK") {
      return "OAK";
    }
    if (team == "PHI") {
      return "PHI";
    }
    if (team == "PIT") {
      return "PIT";
    }
    if (team == "STL") {
      return "STL";
    }
    if (team == "SD" || team == "SDP") {
      return "SD";
    }
    if (team == "SF" || team == "SFG") {
      return "SF";
    }
    if (team == "SEA") {
      return "SEA";
    }
    if (team == "TB" || team == "TAM" || team == "TBR") {
      return "TB";
    }
    if (team == "TEX") {
      return "TEX";
    }
    if (team == "TOR") {
      return "TOR";
    }
    if (team == "WAS" || team == "WSH") {
      return "WAS";
    }
  }

  // STANDARDIZE INJURY STATUS
  function standardizeInj (inj) {
    if (inj == "Active" || inj == "Playing" || inj == "Starting") {
      return "A";
    } else if (inj == "Probable") {
      return "P";
    } else if (inj == "Questionable") {
      return "Q";
    } else if (inj == "Doubtful") {
      return "D";
    } else if (inj == "Out") {
      return "O";
    } else {
      return "";
    }
  }

  // GENERATE A LINEUP ID BASED ON STRINGING NAMES TOGETHER
  function getLineupID(lineup) {
    var id = "";
    var nameArray = [lineup.p.name, lineup.c.name, lineup.fb.name, lineup.sb.name, lineup.tb.name, lineup.ss.name, lineup.of1.name, lineup.of2.name, lineup.of3.name];
    nameArray.sort();
    for (i = 0; i < nameArray.length; i++) {
      id += nameArray[i];
    }
    return id;
  }

  // A FUNCTION TO SORT BY NAME
  function sortByName(a, b) {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    } else {
      return 0;
    }
  }

  // SORT BY ID
  function sortByID(a, b) {
    if (a.id < b.id) {
      return -1;
    } else if (a.id > b.id) {
      return 1;
    } else {
      return 0;
    }
  }

  // SORT BY PROJECTED FP
  function sortByFP(a, b) {
    return b.fp - a.fp;
  }

  // SORT BY COST
  function sortByCost(a, b) {
    return b.cost - a.cost;
  }

  // REVERSE SORT BY COST
  function reverseSortByCost(a, b) {
    return a.cost - b.cost;
  }

  // SORT BY RATIO
  function sortByRatio(a, b) {
    return b.ratio - a.ratio;
  }

  // SORT BY % OWNED
  function sortByPercentOwned(a, b) {
    return b.percentOwned - a.percentOwned;
  }

  // SORT BY PITCHER % OWNED
  function sortByPitcherPercentOwned(a, b) {
    return b.pitcherPercentOwned - a.pitcherPercentOwned;
  }

  // SORT BY HITTER % OWNED
  function sortByHitterPercentOwned(a, b) {
    return b.hitterPercentOwned - a.hitterPercentOwned;
  }

  // GET TOTAL COST OF LINEUP
  function getLineupCost(lineup) {
    var totalCost = 0;
    totalCost += lineup.p.cost + lineup.c.cost + lineup.fb.cost + lineup.sb.cost + lineup.tb.cost + lineup.ss.cost + lineup.of1.cost + lineup.of2.cost + lineup.of3.cost;
    return totalCost;
  }

  // GET TOTAL PROJECTED FP OF LINEUP
  function getLineupFP(lineup) {
    var totalFP = 0;
    totalFP += lineup.p.fp + lineup.c.fp + lineup.fb.fp + lineup.sb.fp + lineup.tb.fp + lineup.ss.fp + lineup.of1.fp + lineup.of2.fp + lineup.of3.fp;
    return totalFP;
  }

  // REMOVE LINEUPS THAT HAVE IDENTICAL PLAYER SETS
  function removeDupes(originalArray) {
    originalArray.sort(sortByID);
    var uniqueArray = [originalArray[0]];
    for (i = 0; i < originalArray.length; i++) {
      if (originalArray[i].id != uniqueArray[uniqueArray.length-1].id) {
        uniqueArray.push(originalArray[i]);
      }
    }
    return uniqueArray;
  }

  // REMOVE DUPLICATE ITEMS FROM AN ARRAY AND RETURN THE NEW ARRAY
  function arrayUnique(array) {
      var a = array.concat();
      for(var i=0; i<a.length; ++i) {
          for(var j=i+1; j<a.length; ++j) {
              if(a[i] === a[j])
                  a.splice(j--, 1);
          }
      }
      return a;
  }

  //INCREMENT MODE MAP FOR TEAM
  function incrementModeMap(team, modeMap) {  
    var updatedCount = 1;
    if(modeMap[team]){
      updatedCount = modeMap[team]+1;
    }
    modeMap[team] = updatedCount;
    if(updatedCount > 4) {
      return false;
    }
    return true;
  }

  // CHECK IF LINEUP HAS MORE THAN THE MAX AMOUNT OF PLAYERS ALLOWED FROM A SINGLE TEAM AND RETURN TRUE OR FALSE
  function isValidLineup(uncheckedLineup) {
    var teams = {};
    var pOkay = incrementModeMap(uncheckedLineup.p.team, teams);
    var cOkay = incrementModeMap(uncheckedLineup.c.team, teams);
    var fbOkay = incrementModeMap(uncheckedLineup.fb.team, teams);
    var sbOkay = incrementModeMap(uncheckedLineup.sb.team, teams);
    var tbOkay = incrementModeMap(uncheckedLineup.tb.team, teams);
    var ssOkay = incrementModeMap(uncheckedLineup.ss.team, teams);
    var of1Okay = incrementModeMap(uncheckedLineup.of1.team, teams);
    var of2Okay = incrementModeMap(uncheckedLineup.of2.team, teams);
    var of3Okay = incrementModeMap(uncheckedLineup.of3.team, teams);

    return pOkay && cOkay && fbOkay && sbOkay && tbOkay && ssOkay && of1Okay && of2Okay && of3Okay;
  }

  //INCREMENT STACK MODE MAP FOR TEAM
  function incrementStackModeMap(team, modeMap) {  
    var updatedCount = 1;
    if(modeMap[team]){
      updatedCount = modeMap[team]+1;
    }
    modeMap[team] = updatedCount;
    if(updatedCount > 3) {
      return false;
    }
    return true;
  }

  // CHECK IF LINEUP HAS MORE THAN 3 HITTERS AND RETURN TRUE OR FALSE
  function isNotStack(uncheckedLineup) {
    var teams = {};
    var cOkay = incrementStackModeMap(uncheckedLineup.c.team, teams);
    var fbOkay = incrementStackModeMap(uncheckedLineup.fb.team, teams);
    var sbOkay = incrementStackModeMap(uncheckedLineup.sb.team, teams);
    var tbOkay = incrementStackModeMap(uncheckedLineup.tb.team, teams);
    var ssOkay = incrementStackModeMap(uncheckedLineup.ss.team, teams);
    var of1Okay = incrementStackModeMap(uncheckedLineup.of1.team, teams);
    var of2Okay = incrementStackModeMap(uncheckedLineup.of2.team, teams);
    var of3Okay = incrementStackModeMap(uncheckedLineup.of3.team, teams);

    return cOkay && fbOkay && sbOkay && tbOkay && ssOkay && of1Okay && of2Okay && of3Okay;
  }

  // CHECK IF LINEUP CONTAINS STACK FOR A SPECIFIC TEAM
  function isSelectedStack (lineup, team) {
    var count = 0;
    if (lineup.c.team == team) {
      count++;
    }
    if (lineup.fb.team == team) {
      count++;
    }
    if (lineup.sb.team == team) {
      count++;
    }
    if (lineup.tb.team == team) {
      count++;
    }
    if (lineup.ss.team == team) {
      count++;
    }
    if (lineup.of1.team == team) {
      count++;
    }
    if (lineup.of2.team == team) {
      count++;
    }
    if (lineup.of3.team == team) {
      count++;
    }
    if (count == 4) {
      return true;
    } else {
      return false;
    }
  }

  // RETURN TRUE IF THE PITCHER IS OPPOSING ANY HITTERS IN A GIVEN LINEUP, OTHERWISE RETURN FALSE
  function pitchersOpposeBatters(lineup) {
    if (lineup.p.opponent == lineup.c.team || lineup.p.opponent == lineup.fb.team || lineup.p.opponent == lineup.sb.team || lineup.p.opponent == lineup.tb.team || lineup.p.opponent == lineup.ss.team || lineup.p.opponent == lineup.of1.team || lineup.p.opponent == lineup.of2.team || lineup.p.opponent == lineup.of3.team) {
      return true;
    } else {
      return false;
    }
  }

  // CHECK IF AN ARRAY CONTAINS A SPECIFIC OBJECT
  function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i] === obj) {
            return true;
        }
    }
    return false;
  }

  // DETERMINE % OF LINEUPS IN WHICH PLAYER IS PRESENT AND ADD TO PLAYER OBJECTS
  function setLineupPercentOwned () {
    for (i = 0; i < PLAYERS.length; i++) {
      var count = 0;
      for (j = 0; j < LINEUPSARRAY.length; j++) {
        if (PLAYERS[i].name == LINEUPSARRAY[j].players.p.name || PLAYERS[i].name == LINEUPSARRAY[j].players.c.name|| PLAYERS[i].name == LINEUPSARRAY[j].players.fb.name || PLAYERS[i].name == LINEUPSARRAY[j].players.sb.name || PLAYERS[i].name == LINEUPSARRAY[j].players.tb.name || PLAYERS[i].name == LINEUPSARRAY[j].players.ss.name|| PLAYERS[i].name == LINEUPSARRAY[j].players.of1.name || PLAYERS[i].name == LINEUPSARRAY[j].players.of2.name || PLAYERS[i].name == LINEUPSARRAY[j].players.of3.name) {
          count++;
        }
      }
      PLAYERS[i].percentOwned = 100*count/LINEUPSARRAY.length;
    }
    for (k = 0; k < LINEUPSARRAY.length; k++) {
      for (l = 0; l < PLAYERS.length; l++) {
        if (LINEUPSARRAY[k].players.p.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.p.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.c.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.c.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.fb.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.fb.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.sb.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.sb.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.tb.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.tb.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.ss.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.ss.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.of1.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.of1.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.of2.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.of2.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.of3.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.of3.percentOwned = PLAYERS[l].percentOwned;
        }
      }
    }
  }

  function displayPercentOwnedList (playerArray) {
  	var projectionMax = 60;
  	playerArray.sort(sortByFP);
  	if (playerArray[0].fp > 60) {
  		projectionMax = playerArray[0].fp;
  	}
    playerArray.sort(sortByPercentOwned);
    for (i = 0; i < playerArray.length; i++) {
      if (playerArray[i].starting == "Not Starting") {
    	  $('#percent-owned-list').append("<li class='list-group-item list-group-item-danger percent-owned-list-item'>" + playerArray[i].name + " (" + playerArray[i].position + ", " + playerArray[i].team + "): <b>" + playerArray[i].percentOwned.toFixed(2) + "%</b><input id='projection-slider-" + i + "' data-slider-id='projection-" + i + "-slider' type='text' data-slider-min='0' data-slider-max='" + projectionMax + "' data-slider-step='.00001' data-slider-value='" + playerArray[i].fp + "'/></li>");
  		} else if (playerArray[i].starting == "Starting") {
        $('#percent-owned-list').append("<li class='list-group-item list-group-item-success percent-owned-list-item'>" + playerArray[i].name + " (" + playerArray[i].position + ", " + playerArray[i].team + "): <b>" + playerArray[i].percentOwned.toFixed(2) + "%</b><input id='projection-slider-" + i + "' data-slider-id='projection-" + i + "-slider' type='text' data-slider-min='0' data-slider-max='" + projectionMax + "' data-slider-step='.00001' data-slider-value='" + playerArray[i].fp + "'/></li>");
      } else {
        $('#percent-owned-list').append("<li class='list-group-item percent-owned-list-item'>" + playerArray[i].name + " (" + playerArray[i].position + ", " + playerArray[i].team + "): <b>" + playerArray[i].percentOwned.toFixed(2) + "%</b><input id='projection-slider-" + i + "' data-slider-id='projection-" + i + "-slider' type='text' data-slider-min='0' data-slider-max='" + projectionMax + "' data-slider-step='.00001' data-slider-value='" + playerArray[i].fp + "'/></li>");
      }
      $('#projection-slider-' + i).slider({
  			formatter: function(value) {
  				return value;
  			}
  		});
    }
    SELECTEDPLAYERS = playerArray;
    if (!$('#percent-owned-list').is(':empty')) {
    	$("#percent-owned-container").removeClass("hide");
    } else {
    	$("#percent-owned-container").addClass("hide");
    }
  }

  function updateProjections (playerArray) {
  	for (i = 0; i < playerArray.length; i++) {
  		playerArray[i].fp = parseFloat($("#projection-slider-" + i).val());
  		playerArray[i].ratio = 10000*playerArray[i].fp/playerArray[i].cost;
  	}
  }

  // RETURN A NEW FP BASED ON A FIXED RATIO
  function evenRatios (price) {
    var newFP = price/500;
    return newFP;
  }

  // DETERMINE % TOTAL PLAYERS FROM EACH TEAM
  function setTeamPercentOwned () {
    for (i = 0; i < TEAMCOUNT; i++) {
      TEAMSOBJECTS[i].players = [];
    }
    for (i = 0; i < TEAMCOUNT; i++) {
      var pitcherCount = 0;
      var hitterCount = 0;
      for (j = 0; j < LINEUPSARRAY.length; j++) {
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.p.team) {
          pitcherCount++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.c.team) {
          hitterCount++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.fb.team) {
          hitterCount++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.sb.team) {
          hitterCount++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.tb.team) {
          hitterCount++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.ss.team) {
          hitterCount++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.of1.team) {
          hitterCount++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.of2.team) {
          hitterCount++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.of3.team) {
          hitterCount++;
        }
      }
      TEAMSOBJECTS[i].pitcherPercentOwned = 100*pitcherCount/(LINEUPQUANTITY);
      TEAMSOBJECTS[i].hitterPercentOwned = 100*hitterCount/(LINEUPQUANTITY*8);
      for (k = 0; k < PLAYERS.length; k++) {
        if (TEAMSOBJECTS[i].team == PLAYERS[k].team && PLAYERS[k].percentOwned > 0) {
          TEAMSOBJECTS[i].players.push({name:PLAYERS[k].name, position:PLAYERS[k].position, percentOwned:PLAYERS[k].percentOwned});
        }
      }
    }
    for (i = 0; i < TEAMCOUNT; i++) {
      TEAMSOBJECTS[i].players.sort(sortByPercentOwned);
    }
  }

  // CREATE COMMA SEPARATED NUMBERS
  function commaSeparateNumber(val){
    while (/(\d+)(\d{3})/.test(val.toString())){
      val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
    }
    return val;
  }

  // ADD IDS FROM FANDUEL TEMPLATE TO IMPORTED PLAYER OBJECTS
  function addTemplateIDs () {
    for (i = 0; i < PLAYERS.length; i++) {
      for (j = 0; j < TEMPLATEPLAYERS.length; j++) {
        if (PLAYERS[i].name.toLowerCase().replace(/[^a-zA-Z ]/g, "") == TEMPLATEPLAYERS[j].name.toLowerCase().replace(/[^a-zA-Z ]/g, "") && PLAYERS[i].team == TEMPLATEPLAYERS[j].team && PLAYERS[i].cost == TEMPLATEPLAYERS[j].cost && PLAYERS[i].position == TEMPLATEPLAYERS[j].position) {
          PLAYERS[i].id = TEMPLATEPLAYERS[j].id;
          PLAYERS[i].fdname = TEMPLATEPLAYERS[j].name;
        } 
      }
    }

    // USE FUZZYSET TO MATCH APPROXIMATE STRINGS
    var matcherNames = FuzzySet();
    var matchResult = [];
    for (s = 0; s < TEMPLATEPLAYERS.length; s++) {
      matcherNames.add(TEMPLATEPLAYERS[s].name);
    }
    for (t = 0; t < PLAYERS.length; t++) {
      if (!("id" in PLAYERS[t])) {
        matchResult = matcherNames.get(PLAYERS[t].name);
        if (matchResult[0][0] > 0.5) {
          for (u = 0; u < TEMPLATEPLAYERS.length; u++) {
            if (matchResult[0][1] == TEMPLATEPLAYERS[u].name && PLAYERS[t].team == TEMPLATEPLAYERS[u].team && PLAYERS[t].cost == TEMPLATEPLAYERS[u].cost && PLAYERS[t].position == TEMPLATEPLAYERS[u].position) {
              PLAYERS[t].id = TEMPLATEPLAYERS[u].id;
              PLAYERS[t].fdname = TEMPLATEPLAYERS[u].name;
              console.log("Matching " + PLAYERS[t].name + " with " + TEMPLATEPLAYERS[u].name + " with a score of " + matchResult[0][0]);
            }
          }
        }
      }
    }

    // PROMPT USER TO MATCH BASED ON TEAM, COST, AND POSITION
    var suggestedMatch = {};
    for (k = 0; k < PLAYERS.length; k++) {
      if (!("id" in PLAYERS[k])) {
        for (l = 0; l < TEMPLATEPLAYERS.length; l++) {
          if (PLAYERS[k].team == TEMPLATEPLAYERS[l].team && PLAYERS[k].cost == TEMPLATEPLAYERS[l].cost && PLAYERS[k].position == TEMPLATEPLAYERS[l].position) {
            suggestedMatch = TEMPLATEPLAYERS[l];
            var r = confirm("No match for " + PLAYERS[k].name + ". Suggestion: " + suggestedMatch.name);
            if (r == true) {
              PLAYERS[k].id = suggestedMatch.id;
              PLAYERS[k].fdname = suggestedMatch.name;
              break;
            }
          }
        }    
      }
    }

    // WARN USER IF THERE ARE PLAYERS WITHOUT IDS
    var noIDList = [];
    for (v = 0; v < PLAYERS.length; v++) {
      if (!("id" in PLAYERS[v])) {
        noIDList.push(PLAYERS[v].name);
      }
    }
    if (noIDList.length > 0) {
      alert("Warning: Unable to match IDs for the following players. If these players appear in lineups, their IDs will be undefined:\n\n" + noIDList.join("\n"));
    }
  }

  function fixMatchupString(string) {
    if (string.indexOf("ARI") > -1) {
      return "ARI";
    } else if (string.indexOf("ATL") > -1) {
      return "ATL";
    } else if (string.indexOf("BAL") > -1) {
      return "BAL";
    } else if (string.indexOf("BOS") > -1) {
      return "BOS";
    } else if (string.indexOf("CHC") > -1) {
      return "CHC";
    } else if (string.indexOf("CHW") > -1) {
      return "CHW";
    } else if (string.indexOf("CIN") > -1) {
      return "CIN";
    } else if (string.indexOf("CLE") > -1) {
      return "CLE";
    } else if (string.indexOf("COL") > -1) {
      return "COL";
    } else if (string.indexOf("DET") > -1) {
      return "DET";
    } else if (string.indexOf("HOU") > -1) {
      return "HOU";
    } else if (string.indexOf("KC") > -1) {
      return "KC";
    } else if (string.indexOf("LAA") > -1) {
      return "LAA";
    } else if (string.indexOf("LAD") > -1) {
      return "LAD";
    } else if (string.indexOf("MIA") > -1) {
      return "MIA";
    } else if (string.indexOf("MIL") > -1) {
      return "MIL";
    } else if (string.indexOf("MIN") > -1) {
      return "MIN";
    } else if (string.indexOf("NYM") > -1) {
      return "NYM";
    } else if (string.indexOf("NYY") > -1) {
      return "NYY";
    } else if (string.indexOf("OAK") > -1) {
      return "OAK";
    } else if (string.indexOf("PHI") > -1) {
      return "PHI";
    } else if (string.indexOf("PIT") > -1) {
      return "PIT";
    } else if (string.indexOf("SD") > -1) {
      return "SD";
    } else if (string.indexOf("SEA") > -1) {
      return "SEA";
    } else if (string.indexOf("SF") > -1) {
      return "SF";
    } else if (string.indexOf("STL") > -1) {
      return "STL";
    } else if (string.indexOf("TB") > -1) {
      return "TB";
    } else if (string.indexOf("TEX") > -1) {
      return "TEX";
    } else if (string.indexOf("TOR") > -1) {
      return "TOR";
    } else if (string.indexOf("WAS") > -1) {
      return "WAS";
    }
  }

  function isStarting(string) {
    if (string.toLowerCase().indexOf("not starting") >= 0) {
      return "Not Starting";
    } else if (string.toLowerCase().indexOf("starting") >= 0) {
      return "Starting";
    } else if (string.toLowerCase().indexOf(" ord ") >= 0) {
      return "Projected Starting";
    } else {
      return "Projected Not Starting";
    }
  }

  // PREPARE CSV
  function prepareCSV () {
    CSVLINEUPS = [];
    if ($('#export-ids').is(':checked')) {
      LINEUPSARRAY.forEach(function (player) {
        var n = {
          p:player.players.p.id,
          c:player.players.c.id,
          fb:player.players.fb.id,
          sb:player.players.sb.id,
          tb:player.players.tb.id,
          ss:player.players.ss.id,
          of1:player.players.of1.id,
          of2:player.players.of2.id,
          of3:player.players.of3.id
        };
          CSVLINEUPS.push(n);
      });
    } else if ($('#export-names').is(':checked')) {
      LINEUPSARRAY.forEach(function (player) {
        var n = {
          p:player.players.p.fdname,
          c:player.players.c.fdname,
          fb:player.players.fb.fdname,
          sb:player.players.sb.fdname,
          tb:player.players.tb.fdname,
          ss:player.players.ss.fdname,
          of1:player.players.of1.fdname,
          of2:player.players.of2.fdname,
          of3:player.players.of3.fdname
        };
          CSVLINEUPS.push(n);
      });
    }
    convertArrayOfObjectsToCSV(CSVLINEUPS);
    downloadCSV({ filename: "lineups.csv" });
  }

  // CONVERT ARRAY OF OBJECTS TO CSV
  function convertArrayOfObjectsToCSV(args) {  
        var result, ctr, keys, columnDelimiter, lineDelimiter, data;

        data = args.data || null;
        if (data == null || !data.length) {
            return null;
        }

        columnDelimiter = args.columnDelimiter || ',';
        lineDelimiter = args.lineDelimiter || '\n';

        keys = Object.keys(data[0]);
        var header = [];
        for (i = 0; i < keys.length; i++) {
          header[i] = keys[i].replace(/\d+/g, '').toUpperCase();
          if (header[i] == "FB") {
            header[i] = "1B";
          } else if (header[i] == "SB") {
            header[i] = "2B";
          } else if (header[i] == "TB") {
            header[i] = "3B";
          }
        }

        result = '';
        result += header.join(columnDelimiter);
        result += lineDelimiter;

        data.forEach(function(item) {
            ctr = 0;
            keys.forEach(function(key) {
                if (ctr > 0) result += columnDelimiter;

                result += item[key];
                ctr++;
            });
            result += lineDelimiter;
        });

        return result;
    }

    // DOWNLOAD CSV FILE
    function downloadCSV(args) {  
        var data, filename, link;
        var csv = convertArrayOfObjectsToCSV({
            data: CSVLINEUPS
        });
        if (csv == null) return;

        filename = args.filename || 'export.csv';

        if (!csv.match(/^data:application\/csv/i)) {
            csv = 'data:application/csv;charset=utf-8,' + csv;
        }
        data = encodeURI(csv);

        link = document.createElement('a');
        link.setAttribute('href', data);
        link.setAttribute('download', filename);
        link.click();
    }

});

