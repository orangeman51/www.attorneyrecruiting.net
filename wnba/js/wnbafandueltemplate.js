$(function () {

  $(document).ready(function() {
    if(isAPIAvailable()) {
      $('#files').bind('change', handleFileSelect);
      $('#fd-template').bind('change', handleTemplateSelect);
    }
  });

  for (i = 1; i < 2001; i++) {
    $('#lineup-quantity').append("<option value='" + i + "'>" + i + "</option>");
  }

  for (i = 0; i <= 40000; i=i+100) {
    $('#min-salary').append("<option value='" + i + "'>" + "$" + commaSeparateNumber(i) + "</option>");
  }

  getSchedule();

  var LINEUP = {
    g1: {},
    g2: {},
    g3: {},
    f1: {},
    f2: {},
    f3: {},
    f4: {}
  }

  var LINEUPQUANTITY = 1;

  var MAXLENGTH = 0;

  var LINEUPSARRAY = [];

  var CSVLINEUPS = [];

  var PLAYERS = [];

  var GLIST = [];
  var FLIST = [];

  var TEMPLATEPLAYERS = [];

  var LOCKS = [];
  var EXCLUDES = [];

  var TEAMS = [];
  var TEAMSOBJECTS = [];
  var TEAMCOUNT = 0;

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

  $('#locks-excludes-button').on('click', function(e){
    e.preventDefault();
    $("#player-selectors").removeClass("hide");
    $('html,body').animate({
        scrollTop: $("#player-selectors").offset().top-100},
        'slow');
  });

  $('#clear-locks-button').on('click', function(e){
    e.preventDefault();
    clearLocks();
  });

  $('#clear-excludes-button').on('click', function(e){
    e.preventDefault();
    clearExcludes();
  });

  $('#csv-export').on('click', function(e){
    e.preventDefault();
    prepareCSV();
  });

  $('#schedule-retry-button').on('click', function(e){
    e.preventDefault();
    getSchedule();
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
    if (typeof $.cookie('wnba-schedule-cookie') === 'undefined') {
      $.ajax({
        url:"https://api.import.io/store/connector/a6b8429a-952f-4fa8-af65-e7ff8c943e6c/_query?input=webpage/url:http%3A%2F%2Fwww.usatoday.com%2Fsports%2Fnba%2Fschedule%2F&&_apikey=996f7681391e46a69c18e4d55f42d79ed11a3168b369aaf2daa247b4ee59aa2cffb0b34251f801583bb7c5ff5da9cd9af5c6246a4e7cc7d1c6bbf54fadace8f0da31eac819e798e8d4d6f8f98445ca8f",
        crossDomain: true,
        dataType: "json",
        success: function (scheduledata) {
          var schedule = [];
          var rawschedule = scheduledata.results;
          rawschedule.forEach(function (game) {
            var b = {
              time:game.time.replace("AM ET", " AM").replace("PM ET", " PM"),
              away:standardizeWNBATeamLabel(game["away/_text"].substring(0, game["away/_text"].indexOf(' '))),
              home:standardizeWNBATeamLabel(game["home/_text"].substring(0, game["home/_text"].indexOf(' ')))
            };
            schedule.push(b);
          });
          $.cookie("wnba-schedule-cookie", JSON.stringify(schedule), { expires: .125, path: '/' });
          displaySchedule(schedule);
        },
        error: function (xhr, status) {
          $('#schedule-retry-container').removeClass('hide');
          $('#schedule-container').data('spinner').stop();
        }
      });
    } else if (!!$.cookie('wnba-schedule-cookie')) {
      var schedule = JSON.parse($.cookie("wnba-schedule-cookie"));
      displaySchedule(schedule);
    }
  }

  function displaySchedule(schedule) {
    $("#schedule").append("<tr><th>Time (ET)</th><th class='exclude-checkbox'>Exclude</th><th>Away</th><th class='exclude-checkbox'>Exclude</th><th>Home</th></tr>");
    for (i = 0; i < schedule.length; i++) {
      $("#schedule").append("<tr><td>" + schedule[i].time + "</td><td class='exclude-checkbox' id='exclude-checkbox-away" + i + "'><input id='away-checkbox" + i + "'type='checkbox'></td><td id='schedule-away" + i + "'>" + schedule[i].away + "</td><td class='exclude-checkbox' id='exclude-checkbox-home" + i + "'><input id='home-checkbox" + i + "'type='checkbox'></td><td id='schedule-home" + i + "'>" + schedule[i].home + "</td></tr>");
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
          name:player.Name,
          cost:parseInt(player.Price),
          fp:parseFloat(player.Value || player.FPTS),
          ratio:parseFloat(player.Ratio),
          position:player.Pos,
          team:standardizeWNBATeamLabel(player.Team),
          inj:standardizeInj(player.Inj.split(" ")[0]),
          exclude:false,
          lock:false
        };
        if (b.cost > 0 && b.fp) {
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
          team:standardizeWNBATeamLabel(player.Team),
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
      setPlayerPositionLists();
      displayStackLockExclude();
      createPlayerSelectors();
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
        $('#exclude-checkbox-away'+i).addClass("danger");
        document.getElementById('away-checkbox'+i).disabled = true;
      } else {
        $('#schedule-away'+i).addClass("success");
        $('#exclude-checkbox-away'+i).addClass("success");
      }
    }
    for (i = 0; i < $('#schedule tr').length-1; i++) {
      if ($.inArray($('#schedule-home'+i).text(), TEAMS) === -1) {
        $('#schedule-home'+i).addClass("danger");
        $('#exclude-checkbox-home'+i).addClass("danger");
        document.getElementById('home-checkbox'+i).disabled = true;
      } else {
        $('#schedule-home'+i).addClass("success");
        $('#exclude-checkbox-home'+i).addClass("success");
      }
    }
  }

  // GET LIST OF PLAYERS FOR EACH POSITION
  function setPlayerPositionLists () {
    var playerList = PLAYERS.slice();

    GLIST = $.grep(playerList, function(e) { return e.position == "G" });
    FLIST = $.grep(playerList, function(e) { return e.position == "F" });

    GLIST.sort(sortByName);
    FLIST.sort(sortByName);
  }

  // DISPLAY LOCK/EXCLUDE BUTTONS
  function displayStackLockExclude () {
    $("#locks-excludes-button-container").removeClass("hide");
  }

  // CREATE PLAYER SELECTOR TABLES
  function createPlayerSelectors () {
    for (i = 0; i < GLIST.length; i++) {
      $("#g-selector").append("<tr id='player-selector-row-g" + i + "'><td id='player-selector-team-g" + i + "'>" + GLIST[i].team + "</td><td id='player-selector-name-g" + i + "'>" + GLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-g" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-g" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < FLIST.length; i++) {
      $("#f-selector").append("<tr id='player-selector-row-f" + i + "'><td id='player-selector-team-f" + i + "'>" + FLIST[i].team + "</td><td id='player-selector-name-f" + i + "'>" + FLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-f" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-f" + i + "'type='checkbox'></td></tr>");
    }
  }

  // GET AN OPTIMIZED LINEUP
  function optimize(){
    $("body").addClass("loading");
    $("#csv-export").addClass("hide");
    $("#export-type-selector").addClass("hide");
    $('#exclude-list').empty();
    $('#lock-list').empty();
    LINEUP = {
      g1: {},
      g2: {},
      g3: {},
      f1: {},
      f2: {},
      f3: {},
      f4: {}
    }
    LINEUPQUANTITY = $('#lineup-quantity').val();
    MAXLENGTH = LINEUPQUANTITY;
    setExcludes();
    setLocks();
    $('#team-percentage-table-container').empty();
    $('#lineup-container').empty();
    LINEUPSARRAY = [];

    var guardList = GLIST.slice();
    var forwardList = FLIST.slice();

    EXCLUDES = getExcludes();
    for (i = 0; i < EXCLUDES.length; i++) {
      if (EXCLUDES[i].position == "G") {
        for (j = 0; j < guardList.length; j++) {
          if (guardList[j] === EXCLUDES[i]) {
            guardList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].position == "F") {
        for (j = 0; j < forwardList.length; j++) {
          if (forwardList[j] === EXCLUDES[i]) {
            forwardList.splice(j, 1);
          }
        }
      }
    }
    showExcludeList();

    guardList.sort(sortByRatio);
    forwardList.sort(sortByRatio);

    guardList = guardList.slice(0, 100);
    forwardList = forwardList.slice(0, 100);

    var playerList = PLAYERS.slice();
    playerList.sort(sortByFP);
    for (nextPlayer = 0; nextPlayer < 10; nextPlayer++) {
      if (playerList[nextPlayer].position == "G" && playerList[nextPlayer].exclude !== true) {
        if (containsObject(playerList[nextPlayer],guardList) !== true) {
          guardList.push(playerList[nextPlayer]);
        }  
      } else if (playerList[nextPlayer].position == "F" && playerList[nextPlayer].exclude !== true) {
        if (containsObject(playerList[nextPlayer],forwardList) !== true) {
          forwardList.push(playerList[nextPlayer]);
        }  
      }
    }

    LOCKS = getLocks();
    var guardLocks = [];
    var forwardLocks = [];
    for (i = 0; i < LOCKS.length; i++) {
      if (LOCKS[i].position == "G") {
        guardLocks.push(LOCKS[i]);
        if (containsObject(LOCKS[i],guardList) !== true) {
          guardList.push(LOCKS[i]);
        }
      }
      if (LOCKS[i].position == "F") {
        forwardLocks.push(LOCKS[i]);
        if (containsObject(LOCKS[i],forwardList) !== true) {
          forwardList.push(LOCKS[i]);
        }
      }
    }
    showLockList();
    if (guardLocks.length > 3) {
      alert("You have locked " + guardLocks.length + " Guards. You may only lock a maximum of 3.");
      $("body").removeClass("loading");
      return;
    } else if (forwardLocks.length > 4) {
      alert("You have locked " + forwardLocks.length + " Forwards. You may only lock a maximum of 4.");
      $("body").removeClass("loading");
      return;
    }

    guardList.sort(reverseSortByCost);
    forwardList.sort(reverseSortByCost);

    console.log("starting new loops");
    var checkNewLineupCounter = 0;
    var maxSal = 40000;
    var minSal = $('#min-salary').val();
    gLength = guardList.length;
    fLength = forwardList.length;
    for (g1 = 0; g1 < gLength-2; g1++) {
      LINEUP.g1 = guardList[g1];
      for (g2 = g1+1; g2 < gLength-1; g2++) {
        LINEUP.g2 = guardList[g2];
        for (g3 = g2+1; g3 < gLength; g3++) {
          LINEUP.g3 = guardList[g3];
          for (f1 = 0; f1 < fLength-3; f1++) {
            LINEUP.f1 = forwardList[f1];
            for (f2 = f1+1; f2 < fLength-2; f2++) {
              LINEUP.f2 = forwardList[f2];
              for (f3 = f2+1; f3 < fLength-1; f3++) {
                LINEUP.f3 = forwardList[f3];
                for (f4 = f3+1; f4 < fLength; f4++) {
                  LINEUP.f4 = forwardList[f4];
                  var lPrice = getLineupCost(LINEUP);
                  if(lPrice > maxSal){
                    break;
                  } else if(lPrice >= minSal){
                      checkLineup(LINEUP);
                      checkNewLineupCounter++;
                  }
                  if (LINEUP.f4.lock) f4 = fLength;
                }
                if (LINEUP.f3.lock) f3 = fLength;
              }
              if (LINEUP.f2.lock) f2 = fLength;
            }
            if (LINEUP.f1.lock) f1 = fLength;
          }
          if (LINEUP.g3.lock) g3 = gLength;
        }
        if (LINEUP.g2.lock) g2 = gLength;
      }
      if (LINEUP.g1.lock) g1 = gLength;
    }

    console.log("new nested loops done");
    console.log(checkNewLineupCounter);
    
    LINEUPSARRAY.sort(sortByFP);
    setLineupPercentOwned();
    setTeamPercentOwned();
          
    $("#csv-export").removeClass("hide");
    $("#export-type-selector").removeClass("hide");

    for (i = 0; i < TEAMCOUNT; i++) {
      if (TEAMSOBJECTS[i].percentOwned > 0) {
        $('#team-percentage-table-container').append("<div class='team-percentage-table'><table class='table' id='tbl-team-percentage" + i + "'></table></div>");
        $('#tbl-team-percentage' + i).append("<tr><th>" + TEAMSOBJECTS[i].team + "</th><th>" + TEAMSOBJECTS[i].percentOwned.toFixed(2) + "%</th></tr>");
        for (j = 0; j < TEAMSOBJECTS[i].players.length; j++) {
          $('#tbl-team-percentage' + i).append("<tr><td>" + TEAMSOBJECTS[i].players[j].name + "</td><td>" + TEAMSOBJECTS[i].players[j].percentOwned.toFixed(2) + "%</td></tr>");
        }
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      $('#lineup-container').append("<div id='lineup-title" + i + "'></div>");
      $('#lineup-container').append("<div id='total-cost" + i + "'></div><div id='total-projected-points" + i + "'></div>");
      $('#lineup-container').append("<div class='table-responsive'><table class='table table-striped' id='tbl-optimized" + i + "'></table></div>");
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      $('#lineup-title' + i).append("<h3>Lineup #" + (i+1) + "</h3>");
      $('#total-cost' + i).append("Total Cost: <b>$" + commaSeparateNumber(LINEUPSARRAY[i].cost) + "</b>");
      $('#total-projected-points' + i).append("Total Projected Points: <b>" + LINEUPSARRAY[i].fp.toFixed(2) + "</b>");
      $('#tbl-optimized' + i).append("<tr><th>Team</th><th>Position</th><th>Inj</th><th>Name</th><th>Projected Points</th><th>Cost</th><th>% Owned</th><th class='lock-checkbox'>Lock</th><th class='exclude-checkbox'>Exclude</th></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-1g" + i + "'><td id='lineup-team-1g" + i + "'>" + LINEUPSARRAY[i].players.g1.team + "</td><td>G</td><td id='inj-1g" + i + "'>" + LINEUPSARRAY[i].players.g1.inj + "</td><td id='lineup-name-1g" + i + "'>" + LINEUPSARRAY[i].players.g1.name + "</td><td>" + LINEUPSARRAY[i].players.g1.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.g1.cost) + "</td><td>" + LINEUPSARRAY[i].players.g1.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-1g" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-1g" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-2g" + i + "'><td id='lineup-team-2g" + i + "'>" + LINEUPSARRAY[i].players.g2.team + "</td><td>G</td><td id='inj-2g" + i + "'>" + LINEUPSARRAY[i].players.g2.inj + "</td><td id='lineup-name-2g" + i + "'>" + LINEUPSARRAY[i].players.g2.name + "</td><td>" + LINEUPSARRAY[i].players.g2.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.g2.cost) + "</td><td>" + LINEUPSARRAY[i].players.g2.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-2g" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-2g" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-3g" + i + "'><td id='lineup-team-3g" + i + "'>" + LINEUPSARRAY[i].players.g3.team + "</td><td>G</td><td id='inj-3g" + i + "'>" + LINEUPSARRAY[i].players.g3.inj + "</td><td id='lineup-name-3g" + i + "'>" + LINEUPSARRAY[i].players.g3.name + "</td><td>" + LINEUPSARRAY[i].players.g3.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.g3.cost) + "</td><td>" + LINEUPSARRAY[i].players.g3.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-3g" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-3g" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-1f" + i + "'><td id='lineup-team-1f" + i + "'>" + LINEUPSARRAY[i].players.f1.team + "</td><td>F</td><td id='inj-1f" + i + "'>" + LINEUPSARRAY[i].players.f1.inj + "</td><td id='lineup-name-1f" + i + "'>" + LINEUPSARRAY[i].players.f1.name + "</td><td>" + LINEUPSARRAY[i].players.f1.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.f1.cost) + "</td><td>" + LINEUPSARRAY[i].players.f1.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-1f" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-1f" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-2f" + i + "'><td id='lineup-team-2f" + i + "'>" + LINEUPSARRAY[i].players.f2.team + "</td><td>F</td><td id='inj-2f" + i + "'>" + LINEUPSARRAY[i].players.f2.inj + "</td><td id='lineup-name-2f" + i + "'>" + LINEUPSARRAY[i].players.f2.name + "</td><td>" + LINEUPSARRAY[i].players.f2.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.f2.cost) + "</td><td>" + LINEUPSARRAY[i].players.f2.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-2f" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-2f" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-3f" + i + "'><td id='lineup-team-3f" + i + "'>" + LINEUPSARRAY[i].players.f3.team + "</td><td>F</td><td id='inj-3f" + i + "'>" + LINEUPSARRAY[i].players.f3.inj + "</td><td id='lineup-name-3f" + i + "'>" + LINEUPSARRAY[i].players.f3.name + "</td><td>" + LINEUPSARRAY[i].players.f3.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.f3.cost) + "</td><td>" + LINEUPSARRAY[i].players.f3.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-3f" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-3f" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-4f" + i + "'><td id='lineup-team-4f" + i + "'>" + LINEUPSARRAY[i].players.f4.team + "</td><td>F</td><td id='inj-4f" + i + "'>" + LINEUPSARRAY[i].players.f4.inj + "</td><td id='lineup-name-4f" + i + "'>" + LINEUPSARRAY[i].players.f4.name + "</td><td>" + LINEUPSARRAY[i].players.f4.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.f4.cost) + "</td><td>" + LINEUPSARRAY[i].players.f4.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-4f" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-4f" + i + "'type='checkbox'></td></tr>");
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.g1.inj == "A") {
        $("#inj-1g" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.g1.inj == "P") {
        $("#inj-1g" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.g1.inj == "Q") {
        $("#inj-1g" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.g1.inj == "D") {
        $("#inj-1g" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.g1.inj == "O") {
        $("#inj-1g" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.g2.inj == "A") {
        $("#inj-2g" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.g2.inj == "P") {
        $("#inj-2g" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.g2.inj == "Q") {
        $("#inj-2g" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.g2.inj == "D") {
        $("#inj-2g" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.g2.inj == "O") {
        $("#inj-2g" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.g3.inj == "A") {
        $("#inj-3g" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.g3.inj == "P") {
        $("#inj-3g" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.g3.inj == "Q") {
        $("#inj-3g" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.g3.inj == "D") {
        $("#inj-3g" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.g3.inj == "O") {
        $("#inj-3g" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.f1.inj == "A") {
        $("#inj-1f" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.f1.inj == "P") {
        $("#inj-1f" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.f1.inj == "Q") {
        $("#inj-1f" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.f1.inj == "D") {
        $("#inj-1f" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.f1.inj == "O") {
        $("#inj-1f" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.f2.inj == "A") {
        $("#inj-2f" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.f2.inj == "P") {
        $("#inj-2f" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.f2.inj == "Q") {
        $("#inj-2f" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.f2.inj == "D") {
        $("#inj-2f" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.f2.inj == "O") {
        $("#inj-2f" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.f3.inj == "A") {
        $("#inj-3f" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.f3.inj == "P") {
        $("#inj-3f" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.f3.inj == "Q") {
        $("#inj-3f" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.f3.inj == "D") {
        $("#inj-3f" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.f3.inj == "O") {
        $("#inj-3f" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.f4.inj == "A") {
        $("#inj-4f" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.f4.inj == "P") {
        $("#inj-4f" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.f4.inj == "Q") {
        $("#inj-4f" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.f4.inj == "D") {
        $("#inj-4f" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.f4.inj == "O") {
        $("#inj-4f" + i).addClass("inj-out");
      }
    }

    applyCheckboxStatus();
    $("body").removeClass("loading");
    if (!$('#team-percentage-table-container').is(':empty')) {
      $('html,body').animate({
          scrollTop: $("#team-percentage-table-container").offset().top-100},
          'slow');
    }
  }

  // SET EXCLUDE PARAMETER TO TRUE FOR ALL CHECKED PLAYER EXCLUDE CHECKBOXES IN PLAYER SELECTOR TABLES AND LINEUPS
  function setExcludes() {
    // SET ALL PLAYER EXCLUDES TO FALSE
    for (i = 0; i < PLAYERS.length; i++) {
      PLAYERS[i].exclude = false;
    }

  // SET EXCLUDE PARAMETER TO TRUE FOR ALL MEMBERS OF CHECKED TEAM
    for (i = 0; i < $('#schedule tr').length-1; i++) {
      if (document.getElementById('away-checkbox'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].team == $('#schedule-away'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }

    for (i = 0; i < $('#schedule tr').length-1; i++) {
      if (document.getElementById('home-checkbox'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].team == $('#schedule-home'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }
    
    // SET EXCLUDES FROM PLAYER SELECTOR TABLES
    for (i = 0; i < GLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-g'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-g'+i).text() && PLAYERS[j].team == $('#player-selector-team-g'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }
    for (i = 0; i < FLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-f'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-f'+i).text() && PLAYERS[j].team == $('#player-selector-team-f'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }

    // IF LINEUPS EXIST SET EXCLUDES FROM LINEUPS TABLES
    if (LINEUPSARRAY.length > 0) {
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-1g'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1g'+i).text() && PLAYERS[j].team == $('#lineup-team-1g'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-2g'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-2g'+i).text() && PLAYERS[j].team == $('#lineup-team-2g'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-3g'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-3g'+i).text() && PLAYERS[j].team == $('#lineup-team-3g'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-1f'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1f'+i).text() && PLAYERS[j].team == $('#lineup-team-1f'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-2f'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-2f'+i).text() && PLAYERS[j].team == $('#lineup-team-2f'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-3f'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-3f'+i).text() && PLAYERS[j].team == $('#lineup-team-3f'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-4f'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-4f'+i).text() && PLAYERS[j].team == $('#lineup-team-4f'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
    }
  }

  // SET LOCK PARAMETER TO TRUE FOR ALL CHECKED PLAYER LOCK CHECKBOXES IN PLAYER SELECTOR TABLES AND LINEUPS
  function setLocks () {
    // SET ALL PLAYER LOCKS TO FALSE
    for (i = 0; i < PLAYERS.length; i++) {
      PLAYERS[i].lock = false;
    }

    // SET LOCKS FROM PLAYER SELECTOR TABLES
    for (i = 0; i < GLIST.length; i++) {
      if (document.getElementById('lock-checkbox-g'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-g'+i).text() && PLAYERS[j].team == $('#player-selector-team-g'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }
    for (i = 0; i < FLIST.length; i++) {
      if (document.getElementById('lock-checkbox-f'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-f'+i).text() && PLAYERS[j].team == $('#player-selector-team-f'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }

    // IF LINEUPS EXIST SET LOCKS FROM LINEUPS TABLES
    if (LINEUPSARRAY.length > 0) {
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-1g'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1g'+i).text() && PLAYERS[j].team == $('#lineup-team-1g'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-2g'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-2g'+i).text() && PLAYERS[j].team == $('#lineup-team-2g'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-3g'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-3g'+i).text() && PLAYERS[j].team == $('#lineup-team-3g'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-1f'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1f'+i).text() && PLAYERS[j].team == $('#lineup-team-1f'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-2f'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-2f'+i).text() && PLAYERS[j].team == $('#lineup-team-2f'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-3f'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-3f'+i).text() && PLAYERS[j].team == $('#lineup-team-3f'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-4f'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-4f'+i).text() && PLAYERS[j].team == $('#lineup-team-4f'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
    }
  }

  function getExcludes () {
    var excludes = [];
    for (i = 0; i < PLAYERS.length; i++) {
      if (PLAYERS[i].exclude === true) {
        excludes.push(PLAYERS[i]);
      }
    }
    return excludes;
  }

  function getLocks () {
    var locks = [];
    for (i = 0; i < PLAYERS.length; i++) {
      if (PLAYERS[i].lock === true) {
        locks.push(PLAYERS[i]);
      }
    }
    return locks;
  }


  // CHECK THE BOXES FOR ALL SELECTED LOCKS AND EXCLUDES
  function applyCheckboxStatus() {
    if (LOCKS.length > 0) {
      for (i = 0; i < LOCKS.length; i++) {
        for (j = 0; j < GLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-g'+j).text() && LOCKS[i].team == $('#player-selector-team-g'+j).text()) {
            document.getElementById('lock-checkbox-g'+j).checked = true;
          }
        }
        for (j = 0; j < FLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-f'+j).text() && LOCKS[i].team == $('#player-selector-team-f'+j).text()) {
            document.getElementById('lock-checkbox-f'+j).checked = true;
          }
        }
      }
    }
    if (EXCLUDES.length > 0) {
      for (i = 0; i < EXCLUDES.length; i++) {
        for (j = 0; j < GLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-g'+j).text() && EXCLUDES[i].team == $('#player-selector-team-g'+j).text()) {
            document.getElementById('exclude-checkbox-g'+j).checked = true;
          }
        }
        for (j = 0; j < FLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-f'+j).text() && EXCLUDES[i].team == $('#player-selector-team-f'+j).text()) {
            document.getElementById('exclude-checkbox-f'+j).checked = true;
          }
        }
      }
    }
  }

  function clearLocks() {
    for (i = 0; i < GLIST.length; i++) {
      document.getElementById('lock-checkbox-g'+i).checked = false;
    }
    for (i = 0; i < FLIST.length; i++) {
      document.getElementById('lock-checkbox-f'+i).checked = false;
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-1g'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-2g'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-3g'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-1f'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-2f'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-3f'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-4f'+i).checked = false;
    }
  }

  function clearExcludes() {
    for (i = 0; i < $('#schedule tr').length-1; i++) {
      document.getElementById('away-checkbox'+i).checked = false;
      document.getElementById('home-checkbox'+i).checked = false;
    }

    for (i = 0; i < GLIST.length; i++) {
      document.getElementById('exclude-checkbox-g'+i).checked = false;
    }
    for (i = 0; i < FLIST.length; i++) {
      document.getElementById('exclude-checkbox-f'+i).checked = false;
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-1g'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-2g'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-3g'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-1f'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-2f'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-3f'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-4f'+i).checked = false;
    }
  }

  // A FUNCTION TO DETERMINE VALIDITY OF LINEUP AND ADD IT TO "LINEUPSARRAY" IF IT'S A TOP LINEUP
  function checkLineup(lineup) {
    var lineupFP = getLineupFP(lineup);
    if (LINEUPSARRAY.length < MAXLENGTH) {
      var lineupCost = getLineupCost(lineup);
      var lineupID = getLineupID(lineup);
      if(isValidLineup(lineup) && hasMinTeams(lineup)){
        LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
        LINEUPSARRAY.sort(sortByFP);
      }
    } else if (lineupFP > LINEUPSARRAY[MAXLENGTH-1].fp) {
      var lineupCost = getLineupCost(lineup);
      var lineupID = getLineupID(lineup);
      if(isValidLineup(lineup) && hasMinTeams(lineup)){
        LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
        LINEUPSARRAY.sort(sortByFP);
        LINEUPSARRAY.pop();
      }
    }
  }

  // STANDARDIZE WNBA TEAM INITIALS
  function standardizeWNBATeamLabel(team) {
    team = team.toUpperCase();
    if (team == "ATLANTA" || team == "ATL") {
      return "ATL";
    }
    if (team == "CHICAGO" || team == "CHI") {
      return "CHI";
    }
    if (team == "CONNECTICUT" || team == "CONN" || team == "CON") {
      return "CON";
    }
    if (team == "INDIANA" || team == "IND") {
      return "IND";
    }
    if (team == "NEW YORK" || team == "NY") {
      return "NY";
    }
    if (team == "WASHINGTON" || team == "WAS") {
      return "WAS";
    }
    if (team == "DALLAS" || team == "DAL") {
      return "DAL";
    }
    if (team == "LOS ANGELES" || team == "LA") {
      return "LA";
    }
    if (team == "MINNESOTA" || team == "MIN") {
      return "MIN";
    }
    if (team == "PHOENIX" || team == "PHO") {
      return "PHO";
    }
    if (team == "SAN ANTONIO" || team == "SA") {
      return "SA";
    }
    if (team == "SEATTLE" || team == "SEA") {
      return "SEA";
    }
  }

  // STANDARDIZE INJURY STATUS
  function standardizeInj (inj) {
    if (inj == "Active" || inj == "Playing" || inj == "Starting") {
      return "A";
    } else if (inj == "Probable" || inj == "P") {
      return "P";
    } else if (inj == "Questionable" || inj == "Q" || inj == "GTD") {
      return "Q";
    } else if (inj == "Doubtful" || inj == "D") {
      return "D";
    } else if (inj == "Out" || inj == "O") {
      return "O";
    } else {
      return "";
    }
  }

  // GENERATE A LINEUP ID BASED ON STRINGING NAMES TOGETHER
  function getLineupID(lineup) {
    var id = "";
    var nameArray = [lineup.g1.name, lineup.g2.name, lineup.g3.name, lineup.f1.name, lineup.f2.name, lineup.f3.name, lineup.f4.name];
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
    if (a.lock && !b.lock) {
      return -1;
    } else if (b.lock && !a.lock) {
      return 1;
    }
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

  // GET TOTAL COST OF LINEUP
  function getLineupCost(lineup) {
    var totalCost = 0;
    totalCost += lineup.g1.cost + lineup.g2.cost + lineup.g3.cost + lineup.f1.cost + lineup.f2.cost + lineup.f3.cost + lineup.f4.cost;
    return totalCost;
  }

  // GET TOTAL PROJECTED FP OF LINEUP
  function getLineupFP(lineup) {
    var totalFP = 0;
    totalFP += lineup.g1.fp + lineup.g2.fp + lineup.g3.fp + lineup.f1.fp + lineup.f2.fp + lineup.f3.fp + lineup.f4.fp;
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
    var g1Okay = incrementModeMap(uncheckedLineup.g1.team, teams);
    var g2Okay = incrementModeMap(uncheckedLineup.g2.team, teams);
    var g3Okay = incrementModeMap(uncheckedLineup.g3.team, teams);
    var f1Okay = incrementModeMap(uncheckedLineup.f1.team, teams);
    var f2Okay = incrementModeMap(uncheckedLineup.f2.team, teams);
    var f3Okay = incrementModeMap(uncheckedLineup.f3.team, teams);
    var f4Okay = incrementModeMap(uncheckedLineup.f4.team, teams);

    return g1Okay && g2Okay && g3Okay && f1Okay && f2Okay && f3Okay && f4Okay;
  }

  // CHECK IF LINEUP HAS THE MINIMUM REQUIRED NUMBER OF TEAMS
  function hasMinTeams(lineup) {
    var lineupTeams = [lineup.g1.team, lineup.g2.team, lineup.g3.team, lineup.f1.team, lineup.f2.team, lineup.f3.team, lineup.f4.team];
    lineupTeams = $.unique(lineupTeams);
    if (lineupTeams.length >= 3) {
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

  // DISPLAY THE LIST OF EXCLUDED PLAYERS
  function showExcludeList() {
    for (i = 0; i < EXCLUDES.length; i++) {
      $('#exclude-list').append("<li class='list-group-item list-group-item-danger'>" + EXCLUDES[i].name + " (" + EXCLUDES[i].team + ")</li>");
    }
    if (!$('#exclude-list').is(':empty')) {
      $("#exclude-container").removeClass("hide");
    } else {
      $("#exclude-container").addClass("hide");
    }
  }

  // DISPLAY THE LIST OF LOCKED PLAYERS
  function showLockList() {
    for (i = 0; i < LOCKS.length; i++) {
      $('#lock-list').append("<li class='list-group-item list-group-item-success'>" + LOCKS[i].name + " (" + LOCKS[i].team + ")</li>");
    }
    if (!$('#lock-list').is(':empty')) {
      $("#lock-container").removeClass("hide");
    } else {
      $("#lock-container").addClass("hide");
    }
  }

  // DETERMINE % OF LINEUPS IN WHICH PLAYER IS PRESENT AND ADD TO PLAYER OBJECTS
  function setLineupPercentOwned () {
    for (i = 0; i < PLAYERS.length; i++) {
      var count = 0;
      for (j = 0; j < LINEUPSARRAY.length; j++) {
        if (PLAYERS[i].name == LINEUPSARRAY[j].players.g1.name || PLAYERS[i].name == LINEUPSARRAY[j].players.g2.name|| PLAYERS[i].name == LINEUPSARRAY[j].players.g3.name || PLAYERS[i].name == LINEUPSARRAY[j].players.f1.name || PLAYERS[i].name == LINEUPSARRAY[j].players.f2.name || PLAYERS[i].name == LINEUPSARRAY[j].players.f3.name|| PLAYERS[i].name == LINEUPSARRAY[j].players.f4.name) {
          count++;
        }
      }
      PLAYERS[i].percentOwned = 100*count/LINEUPSARRAY.length;
    }
    for (k = 0; k < LINEUPSARRAY.length; k++) {
      for (l = 0; l < PLAYERS.length; l++) {
        if (LINEUPSARRAY[k].players.g1.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.g1.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.g2.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.g2.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.g3.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.g3.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.f1.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.f1.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.f2.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.f2.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.f3.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.f3.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.f4.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.f4.percentOwned = PLAYERS[l].percentOwned;
        } 
      }
    }
  }

  // DETERMINE % TOTAL PLAYERS FROM EACH TEAM
  function setTeamPercentOwned () {
    for (i = 0; i < TEAMCOUNT; i++) {
      TEAMSOBJECTS[i].players = [];
    }
    for (i = 0; i < TEAMCOUNT; i++) {
      var count = 0;
      for (j = 0; j < LINEUPSARRAY.length; j++) {
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.g1.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.g2.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.g3.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.f1.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.f2.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.f3.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.f4.team) {
          count++;
        }
      }
      TEAMSOBJECTS[i].percentOwned = 100*count/(LINEUPQUANTITY*7);
      for (k = 0; k < PLAYERS.length; k++) {
        if (TEAMSOBJECTS[i].team == PLAYERS[k].team && PLAYERS[k].percentOwned > 0) {
          TEAMSOBJECTS[i].players.push({name:PLAYERS[k].name, percentOwned:PLAYERS[k].percentOwned});
        }
      }
    }
    for (i = 0; i < TEAMCOUNT; i++) {
      TEAMSOBJECTS[i].players.sort(sortByPercentOwned);
    }
    TEAMSOBJECTS.sort(sortByPercentOwned);
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

  // PREPARE CSV
  function prepareCSV () {
    CSVLINEUPS = [];
    if ($('#export-ids').is(':checked')) {
      LINEUPSARRAY.forEach(function (player) {
        var n = {
          g1:player.players.g1.id,
          g2:player.players.g2.id,
          g3:player.players.g3.id,
          f1:player.players.f1.id,
          f2:player.players.f2.id,
          f3:player.players.f3.id,
          f4:player.players.f4.id
        };
          CSVLINEUPS.push(n);
      });
    } else if ($('#export-names').is(':checked')) {
      LINEUPSARRAY.forEach(function (player) {
        var n = {
          g1:player.players.g1.fdname,
          g2:player.players.g2.fdname,
          g3:player.players.g3.fdname,
          f1:player.players.f1.fdname,
          f2:player.players.f2.fdname,
          f3:player.players.f3.fdname,
          f4:player.players.f4.fdname
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

