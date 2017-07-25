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

  for (i = 60000; i >= 0; i=i-100) {
    $('#min-salary').append("<option value='" + i + "'>" + "$" + commaSeparateNumber(i) + "</option>");
  }

  getSchedule();

  var LINEUP = {
    pg: {},
    pg1: {},
    sg: {},
    sg1: {},
    sf: {},
    sf1: {},
    pf: {},
    pf1: {},
    c: {}
  }

  var LINEUPQUANTITY = 1;

  var MAXLENGTH = 0;

  var LINEUPSARRAY = [];

  var CSVLINEUPS = [];

  var PLAYERS = [];

  var PGLIST = [];
  var SGLIST = [];
  var SFLIST = [];
  var PFLIST = [];
  var CLIST = [];

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
    if (typeof $.cookie('nba-schedule-cookie') === 'undefined') {
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
              away:standardizeNBATeamLabel(game["away/_text"].substring(0, game["away/_text"].indexOf(' '))),
              home:standardizeNBATeamLabel(game["home/_text"].substring(0, game["home/_text"].indexOf(' ')))
            };
            schedule.push(b);
          });
          $.cookie("nba-schedule-cookie", JSON.stringify(schedule), { expires: .125, path: '/' });
          displaySchedule(schedule);
        },
        error: function (xhr, status) {
          $('#schedule-retry-container').removeClass('hide');
          $('#schedule-container').data('spinner').stop();
        }
      });
    } else if (!!$.cookie('nba-schedule-cookie')) {
      var schedule = JSON.parse($.cookie("nba-schedule-cookie"));
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
          team:standardizeNBATeamLabel(player.Team),
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
          team:standardizeNBATeamLabel(player.Team),
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

    PGLIST = $.grep(playerList, function(e) { return e.position == "PG" });
    SGLIST = $.grep(playerList, function(e) { return e.position == "SG" });
    SFLIST = $.grep(playerList, function(e) { return e.position == "SF" });
    PFLIST = $.grep(playerList, function(e) { return e.position == "PF" });
    CLIST = $.grep(playerList, function(e) { return e.position == "C" });

    PGLIST.sort(sortByName);
    SGLIST.sort(sortByName);
    SFLIST.sort(sortByName);
    PFLIST.sort(sortByName);
    CLIST.sort(sortByName);
  }

  // DISPLAY LOCK/EXCLUDE BUTTONS
  function displayStackLockExclude () {
    $("#locks-excludes-button-container").removeClass("hide");
  }

  // CREATE PLAYER SELECTOR TABLES
  function createPlayerSelectors () {
    for (i = 0; i < PGLIST.length; i++) {
      $("#pg-selector").append("<tr id='player-selector-row-pg" + i + "'><td id='player-selector-team-pg" + i + "'>" + PGLIST[i].team + "</td><td id='player-selector-name-pg" + i + "'>" + PGLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-pg" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-pg" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < SGLIST.length; i++) {
      $("#sg-selector").append("<tr id='player-selector-row-sg" + i + "'><td id='player-selector-team-sg" + i + "'>" + SGLIST[i].team + "</td><td id='player-selector-name-sg" + i + "'>" + SGLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-sg" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-sg" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < SFLIST.length; i++) {
      $("#sf-selector").append("<tr id='player-selector-row-sf" + i + "'><td id='player-selector-team-sf" + i + "'>" + SFLIST[i].team + "</td><td id='player-selector-name-sf" + i + "'>" + SFLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-sf" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-sf" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < PFLIST.length; i++) {
      $("#pf-selector").append("<tr id='player-selector-row-pf" + i + "'><td id='player-selector-team-pf" + i + "'>" + PFLIST[i].team + "</td><td id='player-selector-name-pf" + i + "'>" + PFLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-pf" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-pf" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < CLIST.length; i++) {
      $("#c-selector").append("<tr id='player-selector-row-c" + i + "'><td id='player-selector-team-c" + i + "'>" + CLIST[i].team + "</td><td id='player-selector-name-c" + i + "'>" + CLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-c" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-c" + i + "'type='checkbox'></td></tr>");
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
      pg: {},
      pg1: {},
      sg: {},
      sg1: {},
      sf: {},
      sf1: {},
      pf: {},
      pf1: {},
      c: {}
    }
    LINEUPQUANTITY = $('#lineup-quantity').val();
    MAXLENGTH = LINEUPQUANTITY;
    setExcludes();
    setLocks();
    $('#team-percentage-table-container').empty();
    $('#lineup-container').empty();
    LINEUPSARRAY = [];

    var pointGuardList = PGLIST.slice();
    var shootingGuardList = SGLIST.slice();
    var smallForwardList = SFLIST.slice();
    var powerForwardList = PFLIST.slice();
    var centerList = CLIST.slice();

    EXCLUDES = getExcludes();
    for (i = 0; i < EXCLUDES.length; i++) {
      if (EXCLUDES[i].position == "PG") {
        for (j = 0; j < pointGuardList.length; j++) {
          if (pointGuardList[j] === EXCLUDES[i]) {
            pointGuardList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].position == "SG") {
        for (j = 0; j < shootingGuardList.length; j++) {
          if (shootingGuardList[j] === EXCLUDES[i]) {
            shootingGuardList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].position == "SF") {
        for (j = 0; j < smallForwardList.length; j++) {
          if (smallForwardList[j] === EXCLUDES[i]) {
            smallForwardList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].position == "PF") {
        for (j = 0; j < powerForwardList.length; j++) {
          if (powerForwardList[j] === EXCLUDES[i]) {
            powerForwardList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].position == "C") {
        for (j = 0; j < centerList.length; j++) {
          if (centerList[j] === EXCLUDES[i]) {
            centerList.splice(j, 1);
          }
        }
      }
    }
    showExcludeList();

    pointGuardList.sort(sortByRatio);
    shootingGuardList.sort(sortByRatio);
    smallForwardList.sort(sortByRatio);
    powerForwardList.sort(sortByRatio);
    centerList.sort(sortByRatio);

    pointGuardList = pointGuardList.slice(0, 15);
    shootingGuardList = shootingGuardList.slice(0, 15);
    smallForwardList = smallForwardList.slice(0, 15);
    powerForwardList = powerForwardList.slice(0, 15);
    centerList = centerList.slice(0, 15);

    var playerList = PLAYERS.slice();
    playerList.sort(sortByFP);
    for (nextPlayer = 0; nextPlayer < 10; nextPlayer++) {
      if (playerList[nextPlayer].position == "PG" && playerList[nextPlayer].exclude !== true) {
        if (containsObject(playerList[nextPlayer],pointGuardList) !== true) {
          pointGuardList.push(playerList[nextPlayer]);
        }  
      } else if (playerList[nextPlayer].position == "SG" && playerList[nextPlayer].exclude !== true) {
        if (containsObject(playerList[nextPlayer],shootingGuardList) !== true) {
          shootingGuardList.push(playerList[nextPlayer]);
        }  
      } else if (playerList[nextPlayer].position == "SF" && playerList[nextPlayer].exclude !== true) {
        if (containsObject(playerList[nextPlayer],smallForwardList) !== true) {
          smallForwardList.push(playerList[nextPlayer]);
        }  
      } else if (playerList[nextPlayer].position == "PF" && playerList[nextPlayer].exclude !== true) {
        if (containsObject(playerList[nextPlayer],powerForwardList) !== true) {
          powerForwardList.push(playerList[nextPlayer]);
        }  
      } else if (playerList[nextPlayer].position == "C" && playerList[nextPlayer].exclude !== true) {
        if (containsObject(playerList[nextPlayer],centerList) !== true) {
          centerList.push(playerList[nextPlayer]);
        }  
      }
    }

    LOCKS = getLocks();
    var pointGuardLocks = [];
    var shootingGuardLocks = [];
    var smallForwardLocks = [];
    var powerForwardLocks = [];
    var centerLocks = [];
    for (i = 0; i < LOCKS.length; i++) {
      if (LOCKS[i].position == "PG") {
        pointGuardLocks.push(LOCKS[i]);
        if (containsObject(LOCKS[i],pointGuardList) !== true) {
          pointGuardList.push(LOCKS[i]);
        }
      }
      if (LOCKS[i].position == "SG") {
        shootingGuardLocks.push(LOCKS[i]);
        if (containsObject(LOCKS[i],shootingGuardList) !== true) {
          shootingGuardList.push(LOCKS[i]);
        }
      }
      if (LOCKS[i].position == "SF") {
        smallForwardLocks.push(LOCKS[i]);
        if (containsObject(LOCKS[i],smallForwardList) !== true) {
          smallForwardList.push(LOCKS[i]);
        }
      }
      if (LOCKS[i].position == "PF") {
        powerForwardLocks.push(LOCKS[i]);
        if (containsObject(LOCKS[i],powerForwardList) !== true) {
          powerForwardList.push(LOCKS[i]);
        }
      }
      if (LOCKS[i].position == "C") {
        centerLocks.push(LOCKS[i]);
        if (containsObject(LOCKS[i],centerList) !== true) {
          centerList.push(LOCKS[i]);
        }
      }
    }
    showLockList();
    if (pointGuardLocks.length > 2) {
      alert("You have locked " + pointGuardLocks.length + " Point Guards. You may only lock a maximum of 2.");
      $("body").removeClass("loading");
      return;
    } else if (shootingGuardLocks.length > 2) {
      alert("You have locked " + shootingGuardLocks.length + " Shooting Guards. You may only lock a maximum of 2.");
      $("body").removeClass("loading");
      return;
    } else if (smallForwardLocks.length > 2) {
      alert("You have locked " + smallForwardLocks.length + " Small Forwards. You may only lock a maximum of 2.");
      $("body").removeClass("loading");
      return;
    } else if (powerForwardLocks.length > 2) {
      alert("You have locked " + powerForwardLocks.length + " Power Forwards. You may only lock a maximum of 2.");
      $("body").removeClass("loading");
      return;
    } else if (centerLocks.length > 1) {
      alert("You have locked " + centerLocks.length + " Centers. You may only lock a maximum of 1.");
      $("body").removeClass("loading");
      return;
    }

    pointGuardList.sort(reverseSortByCost);
    shootingGuardList.sort(reverseSortByCost);
    smallForwardList.sort(reverseSortByCost);
    powerForwardList.sort(reverseSortByCost);
    centerList.sort(reverseSortByCost);
    
    LINEUP.pg = pointGuardList[0];
    LINEUP.sg = shootingGuardList[0];
    LINEUP.sf = smallForwardList[0];
    LINEUP.pf = powerForwardList[0];
    LINEUP.c = centerList[0];

    console.log("starting new loops");
    var checkNewLineupCounter = 0;
    var maxSal = 60000;
    var minSal = $('#min-salary').val();
    if (minSal === "default") {
      var minSal = 0;
      if (TEAMCOUNT <= 4) {
        minSal = 43000;
      } else if (TEAMCOUNT <= 6) {
        minSal = 44000;
      } else if (TEAMCOUNT <= 8) {
        minSal = 45000;
      } else if (TEAMCOUNT <= 10) {
        minSal = 46000;
      } else if (TEAMCOUNT <= 12) {
        minSal = 47000;
      } else if (TEAMCOUNT <= 14) {
        minSal = 48000;
      } else if (TEAMCOUNT <= 16) {
        minSal = 49000;
      } else if (TEAMCOUNT <= 18) {
        minSal = 50000;
      } else if (TEAMCOUNT <= 20) {
        minSal = 51000;
      } else if (TEAMCOUNT <= 22) {
        minSal = 52000;
      } else {
        minSal = 53000;
      }
    }
    pgLength = pointGuardList.length;
    sgLength = shootingGuardList.length;
    sfLength = smallForwardList.length;
    pfLength = powerForwardList.length;
    cLength = centerList.length;
    for (pg = 0; pg < pgLength-1; pg++) {
      LINEUP.pg = pointGuardList[pg];
      for (pg1 = pg+1; pg1 < pgLength; pg1++) {
        LINEUP.pg1 = pointGuardList[pg1];
        for (sg = 0; sg < sgLength-1; sg++) {
          LINEUP.sg = shootingGuardList[sg];
          for (sg1 = sg+1; sg1 < sgLength; sg1++) {
            LINEUP.sg1 = shootingGuardList[sg1];
            for (sf = 0; sf < sfLength-1; sf++) {
              LINEUP.sf = smallForwardList[sf];
              for (sf1 = sf+1; sf1 < sfLength; sf1++) {
                LINEUP.sf1 = smallForwardList[sf1];
                for (pf = 0; pf < pfLength-1; pf++) {
                  LINEUP.pf = powerForwardList[pf];
                  for (pf1 = pf+1; pf1 < pfLength; pf1++) {
                    LINEUP.pf1 = powerForwardList[pf1];
                    for (c = 0; c < cLength; c++){
                      LINEUP.c = centerList[c];
                      var lPrice = getLineupCost(LINEUP);
                      if(lPrice > maxSal){
                        break;
                      } else if(lPrice >= minSal){
                          checkLineup(LINEUP);
                          checkNewLineupCounter++;
                      }
                      if (LINEUP.c.lock) c = cLength;
                    }
                    if (LINEUP.pf1.lock) pf1 = pfLength;
                  }
                  if (LINEUP.pf.lock) pf = pfLength;
                }
                if (LINEUP.sf1.lock) sf1 = sfLength;
              }
              if (LINEUP.sf.lock) sf = sfLength;
            }
            if (LINEUP.sg1.lock) sg1 = sgLength;
          }
          if (LINEUP.sg.lock) sg = sgLength;
        }
        if (LINEUP.pg1.lock) pg1 = pgLength;
      }
      if (LINEUP.pg.lock) pg = pgLength;
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
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-pg" + i + "'><td id='lineup-team-pg" + i + "'>" + LINEUPSARRAY[i].players.pg.team + "</td><td>PG</td><td id='inj-pg" + i + "'>" + LINEUPSARRAY[i].players.pg.inj + "</td><td id='lineup-name-pg" + i + "'>" + LINEUPSARRAY[i].players.pg.name + "</td><td>" + LINEUPSARRAY[i].players.pg.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.pg.cost) + "</td><td>" + LINEUPSARRAY[i].players.pg.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-pg" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-pg" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-1pg" + i + "'><td id='lineup-team-1pg" + i + "'>" + LINEUPSARRAY[i].players.pg1.team + "</td><td>PG</td><td id='inj-1pg" + i + "'>" + LINEUPSARRAY[i].players.pg1.inj + "</td><td id='lineup-name-1pg" + i + "'>" + LINEUPSARRAY[i].players.pg1.name + "</td><td>" + LINEUPSARRAY[i].players.pg1.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.pg1.cost) + "</td><td>" + LINEUPSARRAY[i].players.pg1.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-1pg" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-1pg" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-sg" + i + "'><td id='lineup-team-sg" + i + "'>" + LINEUPSARRAY[i].players.sg.team + "</td><td>SG</td><td id='inj-sg" + i + "'>" + LINEUPSARRAY[i].players.sg.inj + "</td><td id='lineup-name-sg" + i + "'>" + LINEUPSARRAY[i].players.sg.name + "</td><td>" + LINEUPSARRAY[i].players.sg.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.sg.cost) + "</td><td>" + LINEUPSARRAY[i].players.sg.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-sg" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-sg" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-1sg" + i + "'><td id='lineup-team-1sg" + i + "'>" + LINEUPSARRAY[i].players.sg1.team + "</td><td>SG</td><td id='inj-1sg" + i + "'>" + LINEUPSARRAY[i].players.sg1.inj + "</td><td id='lineup-name-1sg" + i + "'>" + LINEUPSARRAY[i].players.sg1.name + "</td><td>" + LINEUPSARRAY[i].players.sg1.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.sg1.cost) + "</td><td>" + LINEUPSARRAY[i].players.sg1.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-1sg" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-1sg" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-sf" + i + "'><td id='lineup-team-sf" + i + "'>" + LINEUPSARRAY[i].players.sf.team + "</td><td>SF</td><td id='inj-sf" + i + "'>" + LINEUPSARRAY[i].players.sf.inj + "</td><td id='lineup-name-sf" + i + "'>" + LINEUPSARRAY[i].players.sf.name + "</td><td>" + LINEUPSARRAY[i].players.sf.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.sf.cost) + "</td><td>" + LINEUPSARRAY[i].players.sf.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-sf" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-sf" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-1sf" + i + "'><td id='lineup-team-1sf" + i + "'>" + LINEUPSARRAY[i].players.sf1.team + "</td><td>SF</td><td id='inj-1sf" + i + "'>" + LINEUPSARRAY[i].players.sf1.inj + "</td><td id='lineup-name-1sf" + i + "'>" + LINEUPSARRAY[i].players.sf1.name + "</td><td>" + LINEUPSARRAY[i].players.sf1.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.sf1.cost) + "</td><td>" + LINEUPSARRAY[i].players.sf1.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-1sf" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-1sf" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-pf" + i + "'><td id='lineup-team-pf" + i + "'>" + LINEUPSARRAY[i].players.pf.team + "</td><td>PF</td><td id='inj-pf" + i + "'>" + LINEUPSARRAY[i].players.pf.inj + "</td><td id='lineup-name-pf" + i + "'>" + LINEUPSARRAY[i].players.pf.name + "</td><td>" + LINEUPSARRAY[i].players.pf.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.pf.cost) + "</td><td>" + LINEUPSARRAY[i].players.pf.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-pf" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-pf" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-1pf" + i + "'><td id='lineup-team-1pf" + i + "'>" + LINEUPSARRAY[i].players.pf1.team + "</td><td>PF</td><td id='inj-1pf" + i + "'>" + LINEUPSARRAY[i].players.pf1.inj + "</td><td id='lineup-name-1pf" + i + "'>" + LINEUPSARRAY[i].players.pf1.name + "</td><td>" + LINEUPSARRAY[i].players.pf1.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.pf1.cost) + "</td><td>" + LINEUPSARRAY[i].players.pf1.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-1pf" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-1pf" + i + "'type='checkbox'></td></tr>");     
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-c" + i + "'><td id='lineup-team-c" + i + "'>" + LINEUPSARRAY[i].players.c.team + "</td><td>C</td><td id='inj-c" + i + "'>" + LINEUPSARRAY[i].players.c.inj + "</td><td id='lineup-name-c" + i + "'>" + LINEUPSARRAY[i].players.c.name + "</td><td>" + LINEUPSARRAY[i].players.c.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.c.cost) + "</td><td>" + LINEUPSARRAY[i].players.c.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-c" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-c" + i + "'type='checkbox'></td></tr>");
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.pg.inj == "A") {
        $("#inj-pg" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.pg.inj == "P") {
        $("#inj-pg" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.pg.inj == "Q") {
        $("#inj-pg" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.pg.inj == "D") {
        $("#inj-pg" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.pg.inj == "O") {
        $("#inj-pg" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.pg1.inj == "A") {
        $("#inj-1pg" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.pg1.inj == "P") {
        $("#inj-1pg" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.pg1.inj == "Q") {
        $("#inj-1pg" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.pg1.inj == "D") {
        $("#inj-1pg" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.pg1.inj == "O") {
        $("#inj-1pg" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.sg.inj == "A") {
        $("#inj-sg" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.sg.inj == "P") {
        $("#inj-sg" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.sg.inj == "Q") {
        $("#inj-sg" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.sg.inj == "D") {
        $("#inj-sg" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.sg.inj == "O") {
        $("#inj-sg" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.sg1.inj == "A") {
        $("#inj-1sg" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.sg1.inj == "P") {
        $("#inj-1sg" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.sg1.inj == "Q") {
        $("#inj-1sg" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.sg1.inj == "D") {
        $("#inj-1sg" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.sg1.inj == "O") {
        $("#inj-1sg" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.sf.inj == "A") {
        $("#inj-sf" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.sf.inj == "P") {
        $("#inj-sf" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.sf.inj == "Q") {
        $("#inj-sf" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.sf.inj == "D") {
        $("#inj-sf" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.sf.inj == "O") {
        $("#inj-sf" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.sf1.inj == "A") {
        $("#inj-1sf" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.sf1.inj == "P") {
        $("#inj-1sf" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.sf1.inj == "Q") {
        $("#inj-1sf" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.sf1.inj == "D") {
        $("#inj-1sf" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.sf1.inj == "O") {
        $("#inj-1sf" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.pf.inj == "A") {
        $("#inj-pf" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.pf.inj == "P") {
        $("#inj-pf" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.pf.inj == "Q") {
        $("#inj-pf" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.pf.inj == "D") {
        $("#inj-pf" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.pf.inj == "O") {
        $("#inj-pf" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.pf1.inj == "A") {
        $("#inj-1pf" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.pf1.inj == "P") {
        $("#inj-1pf" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.pf1.inj == "Q") {
        $("#inj-1pf" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.pf1.inj == "D") {
        $("#inj-1pf" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.pf1.inj == "O") {
        $("#inj-1pf" + i).addClass("inj-out");
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
    for (i = 0; i < PGLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-pg'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-pg'+i).text() && PLAYERS[j].team == $('#player-selector-team-pg'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }
    for (i = 0; i < SGLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-sg'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-sg'+i).text() && PLAYERS[j].team == $('#player-selector-team-sg'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }
    for (i = 0; i < SFLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-sf'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-sf'+i).text() && PLAYERS[j].team == $('#player-selector-team-sf'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }
    for (i = 0; i < PFLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-pf'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-pf'+i).text() && PLAYERS[j].team == $('#player-selector-team-pf'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }
    for (i = 0; i < CLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-c'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-c'+i).text() && PLAYERS[j].team == $('#player-selector-team-c'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }

    // IF LINEUPS EXIST SET EXCLUDES FROM LINEUPS TABLES
    if (LINEUPSARRAY.length > 0) {
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-pg'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-pg'+i).text() && PLAYERS[j].team == $('#lineup-team-pg'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-1pg'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1pg'+i).text() && PLAYERS[j].team == $('#lineup-team-1pg'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-sg'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-sg'+i).text() && PLAYERS[j].team == $('#lineup-team-sg'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-1sg'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1sg'+i).text() && PLAYERS[j].team == $('#lineup-team-1sg'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-sf'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-sf'+i).text() && PLAYERS[j].team == $('#lineup-team-sf'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-1sf'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1sf'+i).text() && PLAYERS[j].team == $('#lineup-team-1sf'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-pf'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-pf'+i).text() && PLAYERS[j].team == $('#lineup-team-pf'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-1pf'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1pf'+i).text() && PLAYERS[j].team == $('#lineup-team-1pf'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-c'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-c'+i).text() && PLAYERS[j].team == $('#lineup-team-c'+i).text()) {
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
    for (i = 0; i < PGLIST.length; i++) {
      if (document.getElementById('lock-checkbox-pg'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-pg'+i).text() && PLAYERS[j].team == $('#player-selector-team-pg'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }
    for (i = 0; i < SGLIST.length; i++) {
      if (document.getElementById('lock-checkbox-sg'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-sg'+i).text() && PLAYERS[j].team == $('#player-selector-team-sg'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }
    for (i = 0; i < SFLIST.length; i++) {
      if (document.getElementById('lock-checkbox-sf'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-sf'+i).text() && PLAYERS[j].team == $('#player-selector-team-sf'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }
    for (i = 0; i < PFLIST.length; i++) {
      if (document.getElementById('lock-checkbox-pf'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-pf'+i).text() && PLAYERS[j].team == $('#player-selector-team-pf'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }
    for (i = 0; i < CLIST.length; i++) {
      if (document.getElementById('lock-checkbox-c'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-c'+i).text() && PLAYERS[j].team == $('#player-selector-team-c'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }

    // IF LINEUPS EXIST SET LOCKS FROM LINEUPS TABLES
    if (LINEUPSARRAY.length > 0) {
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-pg'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-pg'+i).text() && PLAYERS[j].team == $('#lineup-team-pg'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-1pg'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1pg'+i).text() && PLAYERS[j].team == $('#lineup-team-1pg'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-sg'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-sg'+i).text() && PLAYERS[j].team == $('#lineup-team-sg'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-1sg'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1sg'+i).text() && PLAYERS[j].team == $('#lineup-team-1sg'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-sf'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-sf'+i).text() && PLAYERS[j].team == $('#lineup-team-sf'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-1sf'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1sf'+i).text() && PLAYERS[j].team == $('#lineup-team-1sf'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-pf'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-pf'+i).text() && PLAYERS[j].team == $('#lineup-team-pf'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-1pf'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1pf'+i).text() && PLAYERS[j].team == $('#lineup-team-1pf'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-c'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-c'+i).text() && PLAYERS[j].team == $('#lineup-team-c'+i).text()) {
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
        for (j = 0; j < PGLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-pg'+j).text() && LOCKS[i].team == $('#player-selector-team-pg'+j).text()) {
            document.getElementById('lock-checkbox-pg'+j).checked = true;
          }
        }
        for (j = 0; j < SGLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-sg'+j).text() && LOCKS[i].team == $('#player-selector-team-sg'+j).text()) {
            document.getElementById('lock-checkbox-sg'+j).checked = true;
          }
        }
        for (j = 0; j < SFLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-sf'+j).text() && LOCKS[i].team == $('#player-selector-team-sf'+j).text()) {
            document.getElementById('lock-checkbox-sf'+j).checked = true;
          }
        }
        for (j = 0; j < PFLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-pf'+j).text() && LOCKS[i].team == $('#player-selector-team-pf'+j).text()) {
            document.getElementById('lock-checkbox-pf'+j).checked = true;
          }
        }
        for (j = 0; j < CLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-c'+j).text() && LOCKS[i].team == $('#player-selector-team-c'+j).text()) {
            document.getElementById('lock-checkbox-c'+j).checked = true;
          }
        }
      }
    }
    if (EXCLUDES.length > 0) {
      for (i = 0; i < EXCLUDES.length; i++) {
        for (j = 0; j < PGLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-pg'+j).text() && EXCLUDES[i].team == $('#player-selector-team-pg'+j).text()) {
            document.getElementById('exclude-checkbox-pg'+j).checked = true;
          }
        }
        for (j = 0; j < SGLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-sg'+j).text() && EXCLUDES[i].team == $('#player-selector-team-sg'+j).text()) {
            document.getElementById('exclude-checkbox-sg'+j).checked = true;
          }
        }
        for (j = 0; j < SFLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-sf'+j).text() && EXCLUDES[i].team == $('#player-selector-team-sf'+j).text()) {
            document.getElementById('exclude-checkbox-sf'+j).checked = true;
          }
        }
        for (j = 0; j < PFLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-pf'+j).text() && EXCLUDES[i].team == $('#player-selector-team-pf'+j).text()) {
            document.getElementById('exclude-checkbox-pf'+j).checked = true;
          }
        }
        for (j = 0; j < CLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-c'+j).text() && EXCLUDES[i].team == $('#player-selector-team-c'+j).text()) {
            document.getElementById('exclude-checkbox-c'+j).checked = true;
          }
        }
      }
    }
  }

  function clearLocks() {
    for (i = 0; i < PGLIST.length; i++) {
      document.getElementById('lock-checkbox-pg'+i).checked = false;
    }
    for (i = 0; i < SGLIST.length; i++) {
      document.getElementById('lock-checkbox-sg'+i).checked = false;
    }
    for (i = 0; i < SFLIST.length; i++) {
      document.getElementById('lock-checkbox-sf'+i).checked = false;
    }
    for (i = 0; i < PFLIST.length; i++) {
      document.getElementById('lock-checkbox-pf'+i).checked = false;
    }
    for (i = 0; i < CLIST.length; i++) {
      document.getElementById('lock-checkbox-c'+i).checked = false;
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-pg'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-1pg'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-sg'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-1sg'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-sf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-1sf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-pf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-1pf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-c'+i).checked = false;
    }
  }

  function clearExcludes() {
    for (i = 0; i < $('#schedule tr').length-1; i++) {
      document.getElementById('away-checkbox'+i).checked = false;
      document.getElementById('home-checkbox'+i).checked = false;
    }

    for (i = 0; i < PGLIST.length; i++) {
      document.getElementById('exclude-checkbox-pg'+i).checked = false;
    }
    for (i = 0; i < SGLIST.length; i++) {
      document.getElementById('exclude-checkbox-sg'+i).checked = false;
    }
    for (i = 0; i < SFLIST.length; i++) {
      document.getElementById('exclude-checkbox-sf'+i).checked = false;
    }
    for (i = 0; i < PFLIST.length; i++) {
      document.getElementById('exclude-checkbox-pf'+i).checked = false;
    }
    for (i = 0; i < CLIST.length; i++) {
      document.getElementById('exclude-checkbox-c'+i).checked = false;
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-pg'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-1pg'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-sg'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-1sg'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-sf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-1sf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-pf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-1pf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-c'+i).checked = false;
    }
  }

  // A FUNCTION TO DETERMINE VALIDITY OF LINEUP AND ADD IT TO "LINEUPSARRAY" IF IT'S A TOP LINEUP
  function checkLineup(lineup) {
    var lineupFP = getLineupFP(lineup);
    if (LINEUPSARRAY.length < MAXLENGTH) {
      var lineupCost = getLineupCost(lineup);
      var lineupID = getLineupID(lineup);
      if(isValidLineup(lineup)){
        LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
        LINEUPSARRAY.sort(sortByFP);
      }
    } else if (lineupFP > LINEUPSARRAY[MAXLENGTH-1].fp) {
      var lineupCost = getLineupCost(lineup);
      var lineupID = getLineupID(lineup);
      if(isValidLineup(lineup)){
        LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
        LINEUPSARRAY.sort(sortByFP);
        LINEUPSARRAY.pop();
      }
    }
  }

  // STANDARDIZE NBA TEAM INITIALS
  function standardizeNBATeamLabel(team) {
    team = team.toUpperCase();
    if (team == "ATL") {
      return "ATL";
    }
    if (team == "BOS") {
      return "BOS";
    }
    if (team == "BKN" || team == "BRK") {
      return "BKN";
    }
    if (team == "CHA") {
      return "CHA";
    }
    if (team == "CHI") {
      return "CHI";
    }
    if (team == "CLE") {
      return "CLE";
    }
    if (team == "DAL") {
      return "DAL";
    }
    if (team == "DEN") {
      return "DEN";
    }
    if (team == "DET") {
      return "DET";
    }
    if (team == "GSW" || team == "GS") {
      return "GSW";
    }
    if (team == "HOU") {
      return "HOU";
    }
    if (team == "IND") {
      return "IND";
    }
    if (team == "LAC") {
      return "LAC";
    }
    if (team == "LAL") {
      return "LAL";
    }
    if (team == "MEM") {
      return "MEM";
    }
    if (team == "MIA") {
      return "MIA";
    }
    if (team == "MIL") {
      return "MIL";
    }
    if (team == "MIN") {
      return "MIN";
    }
    if (team == "NOR" || team == "NO" || team == "NOP") {
      return "NOR";
    }
    if (team == "NYK" || team == "NY") {
      return "NYK";
    }
    if (team == "OKC") {
      return "OKC";
    }
    if (team == "ORL") {
      return "ORL";
    }
    if (team == "PHI") {
      return "PHI";
    }
    if (team == "PHO" || team == "PHX") {
      return "PHO";
    }
    if (team == "POR") {
      return "POR";
    }
    if (team == "SAC") {
      return "SAC";
    }
    if (team == "SAS" || team == "SA" || team == "SAN") {
      return "SAS";
    }
    if (team == "TOR") {
      return "TOR";
    }
    if (team == "UTA") {
      return "UTA";
    }
    if (team == "WAS") {
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
    var nameArray = [lineup.pg.name, lineup.pg1.name, lineup.sg.name, lineup.sg1.name, lineup.sf.name, lineup.sf1.name, lineup.pf.name, lineup.pf1.name, lineup.c.name];
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
    totalCost += lineup.pg.cost + lineup.pg1.cost + lineup.sg.cost + lineup.sg1.cost + lineup.sf.cost + lineup.sf1.cost + lineup.pf.cost + lineup.pf1.cost + lineup.c.cost;
    return totalCost;
  }

  // GET TOTAL PROJECTED FP OF LINEUP
  function getLineupFP(lineup) {
    var totalFP = 0;
    totalFP += lineup.pg.fp + lineup.pg1.fp + lineup.sg.fp + lineup.sg1.fp + lineup.sf.fp + lineup.sf1.fp + lineup.pf.fp + lineup.pf1.fp + lineup.c.fp;
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
    var pgOkay = incrementModeMap(uncheckedLineup.pg.team, teams);
    var pg1Okay = incrementModeMap(uncheckedLineup.pg1.team, teams);
    var sgOkay = incrementModeMap(uncheckedLineup.sg.team, teams);
    var sg1Okay = incrementModeMap(uncheckedLineup.sg1.team, teams);
    var sfOkay = incrementModeMap(uncheckedLineup.sf.team, teams);
    var sf1Okay = incrementModeMap(uncheckedLineup.sf1.team, teams);
    var pfOkay = incrementModeMap(uncheckedLineup.pf.team, teams);
    var pf1Okay = incrementModeMap(uncheckedLineup.pf1.team, teams);
    var cOkay = incrementModeMap(uncheckedLineup.c.team, teams);

    return pgOkay && pg1Okay && sgOkay && sg1Okay && sfOkay && sf1Okay && pfOkay && pf1Okay && cOkay;
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
        if (PLAYERS[i].name == LINEUPSARRAY[j].players.pg.name || PLAYERS[i].name == LINEUPSARRAY[j].players.pg1.name|| PLAYERS[i].name == LINEUPSARRAY[j].players.sg.name || PLAYERS[i].name == LINEUPSARRAY[j].players.sg1.name || PLAYERS[i].name == LINEUPSARRAY[j].players.sf.name || PLAYERS[i].name == LINEUPSARRAY[j].players.sf1.name|| PLAYERS[i].name == LINEUPSARRAY[j].players.pf.name || PLAYERS[i].name == LINEUPSARRAY[j].players.pf1.name || PLAYERS[i].name == LINEUPSARRAY[j].players.c.name) {
          count++;
        }
      }
      PLAYERS[i].percentOwned = 100*count/LINEUPSARRAY.length;
    }
    for (k = 0; k < LINEUPSARRAY.length; k++) {
      for (l = 0; l < PLAYERS.length; l++) {
        if (LINEUPSARRAY[k].players.pg.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.pg.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.pg1.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.pg1.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.sg.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.sg.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.sg1.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.sg1.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.sf.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.sf.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.sf1.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.sf1.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.pf.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.pf.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.pf1.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.pf1.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.c.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.c.percentOwned = PLAYERS[l].percentOwned;
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
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.pg.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.pg1.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.sg.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.sg1.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.sf.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.sf1.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.pf.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.pf1.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.c.team) {
          count++;
        }
      }
      TEAMSOBJECTS[i].percentOwned = 100*count/(LINEUPQUANTITY*9);
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
          pg:player.players.pg.id,
          pg1:player.players.pg1.id,
          sg:player.players.sg.id,
          sg1:player.players.sg1.id,
          sf:player.players.sf.id,
          sf1:player.players.sf1.id,
          pf:player.players.pf.id,
          pf1:player.players.pf1.id,
          c:player.players.c.id
        };
          CSVLINEUPS.push(n);
      });
    } else if ($('#export-names').is(':checked')) {
      LINEUPSARRAY.forEach(function (player) {
        var n = {
          pg:player.players.pg.fdname,
          pg1:player.players.pg1.fdname,
          sg:player.players.sg.fdname,
          sg1:player.players.sg1.fdname,
          sf:player.players.sf.fdname,
          sf1:player.players.sf1.fdname,
          pf:player.players.pf.fdname,
          pf1:player.players.pf1.fdname,
          c:player.players.c.fdname
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

