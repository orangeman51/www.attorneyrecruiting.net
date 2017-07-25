$(function () {

  $(document).ready(function() {
    if(isAPIAvailable()) {
      $('#files').bind('change', handleFileSelect);
      $('#dk-template').bind('change', handleTemplateSelect);
    }
  });

  for (i = 1; i < 2001; i++) {
    $('#lineup-quantity').append("<option value='" + i + "'>" + i + "</option>");
  }

  for (i = 50000; i >= 0; i=i-100) {
    $('#min-salary').append("<option value='" + i + "'>" + "$" + commaSeparateNumber(i) + "</option>");
  }

  getSchedule();

  var LINEUP = {
    pg: {},
    sg: {},
    sf: {},
    pf: {},
    c: {},
    g: {},
    f: {},
    util: {}
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
      alert("Please import DraftKings template");
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
          pos1:player.Pos.substring(player.Pos.indexOf("/")+1),
          pos2:player.Pos.substring(0,player.Pos.indexOf("/")),
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
          name:player[' Name'],
          cost:parseInt(player[' Salary']),
          id:player[' ID'],
          team:standardizeNBATeamLabel(player['TeamAbbrev ']),
          pos1:player['Position'].substring(player['Position'].indexOf("/")+1),
          pos2:player['Position'].substring(0,player['Position'].indexOf("/"))
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

    PGLIST = $.grep(playerList, function(e) {return e.pos1 == "PG" || e.pos2 == "PG"});
    SGLIST = $.grep(playerList, function(e) {return e.pos1 == "SG" || e.pos2 == "SG"});
    SFLIST = $.grep(playerList, function(e) {return e.pos1 == "SF" || e.pos2 == "SF"});
    PFLIST = $.grep(playerList, function(e) {return e.pos1 == "PF" || e.pos2 == "PF"});
    CLIST = $.grep(playerList, function(e) {return e.pos1 == "C" || e.pos2 == "C"});

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
      sg: {},
      sf: {},
      pf: {},
      c: {},
      g: {},
      f: {},
      util: {}
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
      if (EXCLUDES[i].pos1 == "PG" || EXCLUDES[i].pos2 == "PG") {
        for (j = 0; j < pointGuardList.length; j++) {
          if (pointGuardList[j] === EXCLUDES[i]) {
            pointGuardList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].pos1 == "SG" || EXCLUDES[i].pos2 == "SG") {
        for (j = 0; j < shootingGuardList.length; j++) {
          if (shootingGuardList[j] === EXCLUDES[i]) {
            shootingGuardList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].pos1 == "SF" || EXCLUDES[i].pos2 == "SF") {
        for (j = 0; j < smallForwardList.length; j++) {
          if (smallForwardList[j] === EXCLUDES[i]) {
            smallForwardList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].pos1 == "PF" || EXCLUDES[i].pos2 == "PF") {
        for (j = 0; j < powerForwardList.length; j++) {
          if (powerForwardList[j] === EXCLUDES[i]) {
            powerForwardList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].pos1 == "C" || EXCLUDES[i].pos2 == "C") {
        for (j = 0; j < centerList.length; j++) {
          if (centerList[j] === EXCLUDES[i]) {
            centerList.splice(j, 1);
          }
        }
      }
    }
    showExcludeList();

    var guardList = pointGuardList.concat(shootingGuardList);
    var forwardList = powerForwardList.concat(smallForwardList);
    var utilityList = pointGuardList.concat(shootingGuardList, smallForwardList, powerForwardList, centerList);

    pointGuardList.sort(sortByRatio);
    shootingGuardList.sort(sortByRatio);
    smallForwardList.sort(sortByRatio);
    powerForwardList.sort(sortByRatio);
    centerList.sort(sortByRatio);
    guardList.sort(sortByFP);
    forwardList.sort(sortByFP);
    utilityList.sort(sortByFP);

    pointGuardList = pointGuardList.slice(0, 10);
    shootingGuardList = shootingGuardList.slice(0, 10);
    smallForwardList = smallForwardList.slice(0, 10);
    powerForwardList = powerForwardList.slice(0, 10);
    centerList = centerList.slice(0, 10);
    guardList = guardList.slice(0, 20);
    forwardList = forwardList.slice(0, 20);
    utilityList = utilityList.slice(0, 40);

    LOCKS = getLocks();
    for (i = 0; i < LOCKS.length; i++) {
      if (LOCKS[i].pos1 == "PG" || LOCKS[i].pos2 == "PG") {
        if (containsObject(LOCKS[i],pointGuardList) !== true) {
          pointGuardList.push(LOCKS[i]);
        }
        if (containsObject(LOCKS[i],guardList) !== true) {
          guardList.push(LOCKS[i]);
        }
        if (containsObject(LOCKS[i],utilityList) !== true) {
          utilityList.push(LOCKS[i]);
        }
      }
      if (LOCKS[i].pos1 == "SG" || LOCKS[i].pos2 == "SG") {
        if (containsObject(LOCKS[i],shootingGuardList) !== true) {
          shootingGuardList.push(LOCKS[i]);
        }
        if (containsObject(LOCKS[i],guardList) !== true) {
          guardList.push(LOCKS[i]);
        }
        if (containsObject(LOCKS[i],utilityList) !== true) {
          utilityList.push(LOCKS[i]);
        }
      }
      if (LOCKS[i].pos1 == "SF" || LOCKS[i].pos2 == "SF") {
        if (containsObject(LOCKS[i],smallForwardList) !== true) {
          smallForwardList.push(LOCKS[i]);
        }
        if (containsObject(LOCKS[i],forwardList) !== true) {
          forwardList.push(LOCKS[i]);
        }
        if (containsObject(LOCKS[i],utilityList) !== true) {
          utilityList.push(LOCKS[i]);
        }
      }
      if (LOCKS[i].pos1 == "PF" || LOCKS[i].pos2 == "PF") {
        if (containsObject(LOCKS[i],powerForwardList) !== true) {
          powerForwardList.push(LOCKS[i]);
        }
        if (containsObject(LOCKS[i],forwardList) !== true) {
          forwardList.push(LOCKS[i]);
        }
        if (containsObject(LOCKS[i],utilityList) !== true) {
          utilityList.push(LOCKS[i]);
        }
      }
      if (LOCKS[i].pos1 == "C" || LOCKS[i].pos2 == "C") {
        if (containsObject(LOCKS[i],centerList) !== true) {
          centerList.push(LOCKS[i]);
        }
        if (containsObject(LOCKS[i],utilityList) !== true) {
          utilityList.push(LOCKS[i]);
        }
      }
    }
    showLockList();

    pointGuardList.sort(reverseSortByCost);
    shootingGuardList.sort(reverseSortByCost);
    smallForwardList.sort(reverseSortByCost);
    powerForwardList.sort(reverseSortByCost);
    centerList.sort(reverseSortByCost);
    guardList.sort(reverseSortByCost);
    forwardList.sort(reverseSortByCost);
    utilityList.sort(reverseSortByCost);
    
    LINEUP.pg = pointGuardList[0];
    LINEUP.sg = shootingGuardList[0];
    LINEUP.sf = smallForwardList[0];
    LINEUP.pf = powerForwardList[0];
    LINEUP.c = centerList[0];
    LINEUP.g = guardList[0];
    LINEUP.f = forwardList[0];
    LINEUP.util = utilityList[0];

    console.log("starting new loops");
    var checkNewLineupCounter = 0;
    var maxSal = 50000;
    var minSal = $('#min-salary').val();
    if (minSal === "default") {
      minSal = 0;
      if (TEAMCOUNT <= 4) {
        minSal = 35000;
      } else if (TEAMCOUNT <= 6) {
        minSal = 36000;
      } else if (TEAMCOUNT <= 8) {
        minSal = 37000;
      } else if (TEAMCOUNT <= 10) {
        minSal = 38000;
      } else if (TEAMCOUNT <= 12) {
        minSal = 39000;
      } else if (TEAMCOUNT <= 14) {
        minSal = 40000;
      } else if (TEAMCOUNT <= 16) {
        minSal = 41000;
      } else if (TEAMCOUNT <= 18) {
        minSal = 42000;
      } else if (TEAMCOUNT <= 20) {
        minSal = 43000;
      } else if (TEAMCOUNT <= 22) {
        minSal = 44000;
      } else {
        minSal = 45000;
      }
    }
    for (pg = 0, len1 = pointGuardList.length; pg < len1; pg++) {
    	LINEUP.pg = pointGuardList[pg];
    	for (sg = 0, len2 = shootingGuardList.length; sg < len2; sg++) {
	        LINEUP.sg = shootingGuardList[sg];
	        for (g = 0, len3 = guardList.length; g < len3; g++) {
	          	LINEUP.g = guardList[g];
	         	for (sf = 0, len4 = smallForwardList.length; sf < len4; sf++) {
	            	LINEUP.sf = smallForwardList[sf];
	            	for (pf = 0, len5 = powerForwardList.length; pf < len5; pf++) {
	            		LINEUP.pf = powerForwardList[pf];
	            		for (f = 0, len6 = forwardList.length; f < len6; f++) {
	                		LINEUP.f = forwardList[f];
	               			for (c = 0, len7 = centerList.length; c < len7; c++) {
	                  			LINEUP.c = centerList[c];
	                  			for (u = 0, len8 = utilityList.length; u < len8; u++) {
	                    			LINEUP.util = utilityList[u];
	                    			var lPrice = getLineupCost(LINEUP);
	                    			if (lPrice > maxSal) {
	                      			break;
	                    			} else if (lPrice >= minSal) {
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
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-sg" + i + "'><td id='lineup-team-sg" + i + "'>" + LINEUPSARRAY[i].players.sg.team + "</td><td>SG</td><td id='inj-sg" + i + "'>" + LINEUPSARRAY[i].players.sg.inj + "</td><td id='lineup-name-sg" + i + "'>" + LINEUPSARRAY[i].players.sg.name + "</td><td>" + LINEUPSARRAY[i].players.sg.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.sg.cost) + "</td><td>" + LINEUPSARRAY[i].players.sg.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-sg" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-sg" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-sf" + i + "'><td id='lineup-team-sf" + i + "'>" + LINEUPSARRAY[i].players.sf.team + "</td><td>SF</td><td id='inj-sf" + i + "'>" + LINEUPSARRAY[i].players.sf.inj + "</td><td id='lineup-name-sf" + i + "'>" + LINEUPSARRAY[i].players.sf.name + "</td><td>" + LINEUPSARRAY[i].players.sf.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.sf.cost) + "</td><td>" + LINEUPSARRAY[i].players.sf.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-sf" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-sf" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-pf" + i + "'><td id='lineup-team-pf" + i + "'>" + LINEUPSARRAY[i].players.pf.team + "</td><td>PF</td><td id='inj-pf" + i + "'>" + LINEUPSARRAY[i].players.pf.inj + "</td><td id='lineup-name-pf" + i + "'>" + LINEUPSARRAY[i].players.pf.name + "</td><td>" + LINEUPSARRAY[i].players.pf.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.pf.cost) + "</td><td>" + LINEUPSARRAY[i].players.pf.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-pf" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-pf" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-c" + i + "'><td id='lineup-team-c" + i + "'>" + LINEUPSARRAY[i].players.c.team + "</td><td>C</td><td id='inj-c" + i + "'>" + LINEUPSARRAY[i].players.c.inj + "</td><td id='lineup-name-c" + i + "'>" + LINEUPSARRAY[i].players.c.name + "</td><td>" + LINEUPSARRAY[i].players.c.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.c.cost) + "</td><td>" + LINEUPSARRAY[i].players.c.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-c" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-c" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-g" + i + "'><td id='lineup-team-g" + i + "'>" + LINEUPSARRAY[i].players.g.team + "</td><td>G</td><td id='inj-g" + i + "'>" + LINEUPSARRAY[i].players.g.inj + "</td><td id='lineup-name-g" + i + "'>" + LINEUPSARRAY[i].players.g.name + "</td><td>" + LINEUPSARRAY[i].players.g.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.g.cost) + "</td><td>" + LINEUPSARRAY[i].players.g.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-g" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-g" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-f" + i + "'><td id='lineup-team-f" + i + "'>" + LINEUPSARRAY[i].players.f.team + "</td><td>F</td><td id='inj-f" + i + "'>" + LINEUPSARRAY[i].players.f.inj + "</td><td id='lineup-name-f" + i + "'>" + LINEUPSARRAY[i].players.f.name + "</td><td>" + LINEUPSARRAY[i].players.f.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.f.cost) + "</td><td>" + LINEUPSARRAY[i].players.f.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-f" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-f" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-util" + i + "'><td id='lineup-team-util" + i + "'>" + LINEUPSARRAY[i].players.util.team + "</td><td>UTIL</td><td id='inj-util" + i + "'>" + LINEUPSARRAY[i].players.util.inj + "</td><td id='lineup-name-util" + i + "'>" + LINEUPSARRAY[i].players.util.name + "</td><td>" + LINEUPSARRAY[i].players.util.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.util.cost) + "</td><td>" + LINEUPSARRAY[i].players.util.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-util" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-util" + i + "'type='checkbox'></td></tr>");
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
      if (LINEUPSARRAY[i].players.g.inj == "A") {
        $("#inj-g" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.g.inj == "P") {
        $("#inj-g" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.g.inj == "Q") {
        $("#inj-g" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.g.inj == "D") {
        $("#inj-g" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.g.inj == "O") {
        $("#inj-g" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.f.inj == "A") {
        $("#inj-f" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.f.inj == "P") {
        $("#inj-f" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.f.inj == "Q") {
        $("#inj-f" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.f.inj == "D") {
        $("#inj-f" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.f.inj == "O") {
        $("#inj-f" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.util.inj == "A") {
        $("#inj-util" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.util.inj == "P") {
        $("#inj-util" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.util.inj == "Q") {
        $("#inj-util" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.util.inj == "D") {
        $("#inj-util" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.util.inj == "O") {
        $("#inj-util" + i).addClass("inj-out");
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
  function setExcludes(){
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
        if (document.getElementById('lineup-exclude-checkbox-sg'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-sg'+i).text() && PLAYERS[j].team == $('#lineup-team-sg'+i).text()) {
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
        if (document.getElementById('lineup-exclude-checkbox-pf'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-pf'+i).text() && PLAYERS[j].team == $('#lineup-team-pf'+i).text()) {
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
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-g'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-g'+i).text() && PLAYERS[j].team == $('#lineup-team-g'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-f'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-f'+i).text() && PLAYERS[j].team == $('#lineup-team-f'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-util'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-util'+i).text() && PLAYERS[j].team == $('#lineup-team-util'+i).text()) {
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
        if (document.getElementById('lineup-lock-checkbox-sg'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-sg'+i).text() && PLAYERS[j].team == $('#lineup-team-sg'+i).text()) {
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
        if (document.getElementById('lineup-lock-checkbox-pf'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-pf'+i).text() && PLAYERS[j].team == $('#lineup-team-pf'+i).text()) {
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
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-g'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-g'+i).text() && PLAYERS[j].team == $('#lineup-team-g'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-f'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-f'+i).text() && PLAYERS[j].team == $('#lineup-team-f'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-util'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-util'+i).text() && PLAYERS[j].team == $('#lineup-team-util'+i).text()) {
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
      document.getElementById('lineup-lock-checkbox-sg'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-sf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-pf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-c'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-g'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-f'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-util'+i).checked = false;
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
      document.getElementById('lineup-exclude-checkbox-sg'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-sf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-pf'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-c'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-g'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-f'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-util'+i).checked = false;
    }
  }

  // A FUNCTION TO DETERMINE VALIDITY OF LINEUP AND ADD IT TO "LINEUPSARRAY" IF IT'S A TOP LINEUP
  function checkLineup(lineup) {
    if (noPlayerDupes(lineup)) {
      var lineupFP = getLineupFP(lineup);
      if (LINEUPSARRAY.length < MAXLENGTH) {
        if (includesLocks(lineup, LOCKS)) {
          var lineupCost = getLineupCost(lineup);
          var lineupID = getLineupID(lineup);
          if (LineupsArrayContainsID(lineupID) !== true) {
            LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
            LINEUPSARRAY.sort(sortByFP);
          }
        }
      } else if (lineupFP > LINEUPSARRAY[MAXLENGTH-1].fp) {
        if (includesLocks(lineup, LOCKS)) {
          var lineupCost = getLineupCost(lineup);
          var lineupID = getLineupID(lineup);
          if (LineupsArrayContainsID(lineupID) !== true) {
            LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
            LINEUPSARRAY.sort(sortByFP);
            LINEUPSARRAY.pop();
          }
        }
      }
    }
  }

  // CHECK IF LINEUPSARRAY CONTAINS A SPECIFIC LINEUP BY ID
  function LineupsArrayContainsID(lineupID) {
    var list = [];
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      list.push(LINEUPSARRAY[i].id);
    }
    for (k = 0; k < list.length; k++) {
        if (list[k] === lineupID) {
            return true;
        }
    }
    return false;
  }

  // A FUNCTION TO DETERMINE WHETHER THERE ARE NO PLAYER DUPLICATES IN A LINEUP
  function noPlayerDupes(lineup) {
    if (lineup.util.name == lineup.pg.name || lineup.util.name == lineup.sg.name || lineup.util.name == lineup.sf.name || lineup.util.name == lineup.pf.name || lineup.util.name == lineup.c.name || lineup.util.name == lineup.g.name || lineup.util.name == lineup.f.name) {
      return false;
    }
    if (lineup.f.name == lineup.pf.name || lineup.f.name == lineup.sf.name || lineup.f.name == lineup.sg.name || lineup.f.name == lineup.pg.name || lineup.f.name == lineup.c.name || lineup.f.name == lineup.g.name) {
      return false;
    }
    if (lineup.g.name == lineup.pg.name || lineup.g.name == lineup.sg.name || lineup.g.name == lineup.sf.name || lineup.g.name == lineup.pf.name || lineup.g.name == lineup.c.name) {
      return false;
    }
    if (lineup.pg.pos2.length > 0) {
      if (lineup.pg.name == lineup.sg.name || lineup.pg.name == lineup.sf.name || lineup.pg.name == lineup.pf.name || lineup.pg.name == lineup.c.name) {
        return false;
      }
    }
    if (lineup.pf.pos2.length > 0) {
      if (lineup.pf.name == lineup.sg.name || lineup.pf.name == lineup.sf.name || lineup.pf.name == lineup.c.name) {
        return false;
      }
    }
    if (lineup.sg.pos2.length > 0) {
      if (lineup.sg.name == lineup.sf.name || lineup.pf.name == lineup.c.name) {
        return false;
      }
    }
    if (lineup.sf.pos2.length > 0) {
      if (lineup.sf.name == lineup.c.name) {
        return false;
      }
    }
    return true;
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
    var nameArray = [lineup.pg.name, lineup.sg.name, lineup.sf.name, lineup.pf.name, lineup.c.name, lineup.g.name, lineup.f.name, lineup.util.name];
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

  // GET TOTAL COST OF LINEUP
  function getLineupCost(lineup) {
    var totalCost = 0;
    totalCost += lineup.pg.cost + lineup.sg.cost + lineup.sf.cost + lineup.pf.cost + lineup.c.cost + lineup.g.cost + lineup.f.cost + lineup.util.cost;
    return totalCost;
  }

  // GET TOTAL PROJECTED FP OF LINEUP
  function getLineupFP(lineup) {
    var totalFP = 0;
    totalFP += lineup.pg.fp + lineup.sg.fp + lineup.sf.fp + lineup.pf.fp + lineup.c.fp + lineup.g.fp + lineup.f.fp + lineup.util.fp;
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

  // CHECK IF A LINEUP INCLUDES A SPECIFIC SET OF LOCKS
  function includesLocks(lineup, locks) {
    if (locks.length == 0) {
      return true;
    } else {
      var lineupArray = [lineup.pg, lineup.sg, lineup.sf, lineup.pf, lineup.c, lineup.g, lineup.f, lineup.util];
      var count = 0;
      for (i = 0; i < locks.length; i++) {
        if (containsObject(LOCKS[i],lineupArray) == true) {
          count++;
        }
      }
      if (count == locks.length) {
        return true;
      } else {
        return false;
      }
    }
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
        if (PLAYERS[i].name == LINEUPSARRAY[j].players.pg.name || PLAYERS[i].name == LINEUPSARRAY[j].players.sg.name || PLAYERS[i].name == LINEUPSARRAY[j].players.sf.name || PLAYERS[i].name == LINEUPSARRAY[j].players.pf.name || PLAYERS[i].name == LINEUPSARRAY[j].players.c.name || PLAYERS[i].name == LINEUPSARRAY[j].players.g.name || PLAYERS[i].name == LINEUPSARRAY[j].players.f.name || PLAYERS[i].name == LINEUPSARRAY[j].players.util.name) {
          count++;
        }
      }
      PLAYERS[i].percentOwned = 100*count/LINEUPSARRAY.length;
    }
    for (k = 0; k < LINEUPSARRAY.length; k++) {
      for (l = 0; l < PLAYERS.length; l++) {
        if (LINEUPSARRAY[k].players.pg.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.pg.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.sg.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.sg.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.sf.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.sf.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.pf.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.pf.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.c.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.c.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.g.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.g.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.f.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.f.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.util.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.util.percentOwned = PLAYERS[l].percentOwned;
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
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.sg.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.sf.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.pf.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.c.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.g.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.f.team) {
          count++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.util.team) {
          count++;
        }
      }
      TEAMSOBJECTS[i].percentOwned = 100*count/(LINEUPQUANTITY*8);
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

  // ADD IDS FROM DRAFTKINGS TEMPLATE TO IMPORTED PLAYER OBJECTS
  function addTemplateIDs () {
    for (i = 0; i < PLAYERS.length; i++) {
      for (j = 0; j < TEMPLATEPLAYERS.length; j++) {
        if (PLAYERS[i].name.toLowerCase().replace(/[^a-zA-Z ]/g, "") == TEMPLATEPLAYERS[j].name.toLowerCase().replace(/[^a-zA-Z ]/g, "") && PLAYERS[i].team == TEMPLATEPLAYERS[j].team && PLAYERS[i].cost == TEMPLATEPLAYERS[j].cost && ((PLAYERS[i].pos1 == TEMPLATEPLAYERS[j].pos1 && PLAYERS[i].pos2 == TEMPLATEPLAYERS[j].pos2) || (PLAYERS[i].pos1 == TEMPLATEPLAYERS[j].pos2 && PLAYERS[i].pos2 == TEMPLATEPLAYERS[j].pos1))) {
          PLAYERS[i].id = TEMPLATEPLAYERS[j].id;
          PLAYERS[i].dkname = TEMPLATEPLAYERS[j].name;
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
            if (matchResult[0][1] == TEMPLATEPLAYERS[u].name && PLAYERS[t].team == TEMPLATEPLAYERS[u].team && PLAYERS[t].cost == TEMPLATEPLAYERS[u].cost && ((PLAYERS[t].pos1 == TEMPLATEPLAYERS[u].pos1 && PLAYERS[t].pos2 == TEMPLATEPLAYERS[u].pos2) || (PLAYERS[t].pos1 == TEMPLATEPLAYERS[u].pos2 && PLAYERS[t].pos2 == TEMPLATEPLAYERS[u].pos1))) {
              PLAYERS[t].id = TEMPLATEPLAYERS[u].id;
              PLAYERS[t].dkname = TEMPLATEPLAYERS[u].name;
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
          if (PLAYERS[k].team == TEMPLATEPLAYERS[l].team && PLAYERS[k].cost == TEMPLATEPLAYERS[l].cost && ((PLAYERS[k].pos1 == TEMPLATEPLAYERS[l].pos1 && PLAYERS[k].pos2 == TEMPLATEPLAYERS[l].pos2) || (PLAYERS[k].pos1 == TEMPLATEPLAYERS[l].pos2 && PLAYERS[k].pos2 == TEMPLATEPLAYERS[l].pos1))) {
            suggestedMatch = TEMPLATEPLAYERS[l];
            var r = confirm("No match for " + PLAYERS[k].name + ". Suggestion: " + suggestedMatch.name);
            if (r == true) {
              PLAYERS[k].id = suggestedMatch.id;
              PLAYERS[k].dkname = suggestedMatch.name;
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
          PG:player.players.pg.id,
          SG:player.players.sg.id,
          SF:player.players.sf.id,
          PF:player.players.pf.id,
          C:player.players.c.id,
          G:player.players.g.id,
          F:player.players.f.id,
          UTIL:player.players.util.id
        };
          CSVLINEUPS.push(n);
      });
    } else if ($('#export-names').is(':checked')) {
      LINEUPSARRAY.forEach(function (player) {
        var n = {
          PG:player.players.pg.dkname,
          SG:player.players.sg.dkname,
          SF:player.players.sf.dkname,
          PF:player.players.pf.dkname,
          C:player.players.c.dkname,
          G:player.players.g.dkname,
          F:player.players.f.dkname,
          UTIL:player.players.util.dkname
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

        result = '';
        result += keys.join(columnDelimiter);
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

