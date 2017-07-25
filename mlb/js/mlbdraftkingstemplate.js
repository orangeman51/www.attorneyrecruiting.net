$(function () {

  $(document).ready(function() {
    if(isAPIAvailable()) {
      $('#files').bind('change', handleFileSelect);
      $('#dk-template').bind('change', handleTemplateSelect);
    }
  });

  for (i = 1; i < 1001; i++) {
    $('#lineup-quantity').append("<option value='" + i + "'>" + i + "</option>");
  }

  for (i = 45000; i <= 50000; i=i+100) {
    $('#min-salary').append("<option value='" + i + "'>" + "$" + commaSeparateNumber(i) + "</option>");
  }

  getSchedule();

  var LINEUP = {
    p1: {},
    p2: {},
    c: {},
    fb: {},
    sb: {},
    tb: {},
    ss: {},
    of1: {},
    of2: {},
    of3: {}
  }

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

  var LOCKS = [];
  var EXCLUDES = [];

  var TEAMS = [];
  var TEAMSOBJECTS = [];
  var TEAMCOUNT = 0;

  var STACKTEAM = [];
  var STACKOPTS = [];

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
          name:player.Name.replace(/\./g,''),
          cost:parseInt(player.Price),
          fp:parseFloat(player.Value || player.FPTS),
          ratio:parseFloat(player.Ratio),
          pos1:standardizePosition(player.Pos.substring(player.Pos.indexOf("/")+1)),
          pos2:standardizePosition(player.Pos.substring(0,player.Pos.indexOf("/"))),
          team:standardizeMLBTeamLabel(player.Team),
          opponent:standardizeMLBTeamLabel(fixMatchupString(player.Matchup)),
          starting:isStarting(player.Matchup), 
          inj:standardizeInj(player.Inj.split(" ")[0]),
          exclude:false,
          lock:false
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
          name:player[' Name'],
          cost:parseInt(player[' Salary']),
          id:player[' ID'],
          team:standardizeMLBTeamLabel(player['TeamAbbrev ']),
          pos1:standardizePosition(player['Position'].substring(player['Position'].indexOf("/")+1)),
          pos2:standardizePosition(player['Position'].substring(0,player['Position'].indexOf("/")))
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
    PLIST = $.grep(playerList, function(e) {return e.pos1 == "P" || e.pos2 == "P"});
    CLIST = $.grep(playerList, function(e) {return e.pos1 == "C" || e.pos2 == "C"});
    FBLIST = $.grep(playerList, function(e) {return e.pos1 == "1B" || e.pos2 == "1B"});
    SBLIST = $.grep(playerList, function(e) {return e.pos1 == "2B" || e.pos2 == "2B"});
    TBLIST = $.grep(playerList, function(e) {return e.pos1 == "3B" || e.pos2 == "3B"});
    SSLIST = $.grep(playerList, function(e) {return e.pos1 == "SS" || e.pos2 == "SS"});
    OFLIST = $.grep(playerList, function(e) {return e.pos1 == "OF" || e.pos2 == "OF"});

    PLIST.sort(sortByName);
    CLIST.sort(sortByName);
    FBLIST.sort(sortByName);
    SBLIST.sort(sortByName);
    TBLIST.sort(sortByName);
    SSLIST.sort(sortByName);
    OFLIST.sort(sortByName);
  }

  // DISPLAY STACK, LOCK/EXCLUDE BUTTONS
  function displayStackLockExclude () {
    $("#stack-selector").append("<tr><td><input type='checkbox' value='any' checked></input></td><td>Any</td></tr><tr><td><input type='checkbox' value='none'></input></td><td>None</td></tr>");
    for (i = 0; i < TEAMS.length; i++) {
      $("#stack-selector").append("<tr><td><input type='checkbox' value='" + TEAMS[i] + "' checked></input></td><td>" + TEAMS[i] + "</td></tr>");
    }
    $("#stack-options").append("<tr><td><input type='checkbox' value='ministack'></input></td><td>Mini Stacks</td></tr><tr><td><input type='checkbox' value='doublestack'></input></td><td>Double Stacks</td></tr>");
    $("#stack-container").removeClass("hide");
    $("#stack-opts-container").removeClass("hide");
    $("#locks-excludes-button-container").removeClass("hide");
    $("#locks-excludes-button-container").css("margin-top", $("#stack-container").height() - 60);
  }

  // STACK CHECKBOX SELECTIONS
  $("#stack-selector").on("change", "input", function () {
    if ($('#stack-selector input:checked').length < 1) {
      $("#stack-selector input[value='none']").prop("checked", true);
      $("#stack-options input").prop("checked", false);
    }
    else if (this.value !== 'none' && this.value !== 'any') {
      $("#stack-selector input[value='none']").prop("checked", false);
      $("#stack-selector input[value='any']").prop("checked", false);
    }
    else if (this.value == 'none' && this.checked) {
      $("#stack-selector input").not(this).prop("checked", false);
      $("#stack-options input").prop("checked", false);
    }
    else if (this.value == 'any' && this.checked) {
      $("#stack-selector input").not(this).prop("checked", true);
      $("#stack-selector input[value='none']").prop("checked", false);
    }

    if ($('#stack-selector input:checked').length < 2) {
      $("#stack-options input[value='doublestack']").prop("checked", false);
    }

    if ($('#stack-selector input:checked').length === $('#stack-selector input').length - 2) {
      $("#stack-selector input[value='any']").prop("checked", true);
    }
  });

  $("#stack-options").on("change", "input", function () {
    if (this.checked && $("#stack-selector input[value='none']").prop("checked")) {
      $("#stack-selector input").not("input[value='none']").prop("checked", true);
      $("#stack-selector input[value='none']").prop("checked", false);
    }
    else if ($('#stack-selector input:checked').length < 2) {
      $("#stack-options input[value='doublestack']").prop("checked", false);
    }
  });

  // CREATE PLAYER SELECTOR TABLES
  function createPlayerSelectors () {
    for (i = 0; i < PLIST.length; i++) {
      $("#p-selector").append("<tr id='player-selector-row-p" + i + "'><td id='player-selector-team-p" + i + "'>" + PLIST[i].team + "</td><td id='player-selector-name-p" + i + "'>" + PLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-p" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-p" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < CLIST.length; i++) {
      $("#c-selector").append("<tr id='player-selector-row-c" + i + "'><td id='player-selector-team-c" + i + "'>" + CLIST[i].team + "</td><td id='player-selector-name-c" + i + "'>" + CLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-c" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-c" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < FBLIST.length; i++) {
      $("#fb-selector").append("<tr id='player-selector-row-fb" + i + "'><td id='player-selector-team-fb" + i + "'>" + FBLIST[i].team + "</td><td id='player-selector-name-fb" + i + "'>" + FBLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-fb" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-fb" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < SBLIST.length; i++) {
      $("#sb-selector").append("<tr id='player-selector-row-sb" + i + "'><td id='player-selector-team-sb" + i + "'>" + SBLIST[i].team + "</td><td id='player-selector-name-sb" + i + "'>" + SBLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-sb" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-sb" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < TBLIST.length; i++) {
      $("#tb-selector").append("<tr id='player-selector-row-tb" + i + "'><td id='player-selector-team-tb" + i + "'>" + TBLIST[i].team + "</td><td id='player-selector-name-tb" + i + "'>" + TBLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-tb" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-tb" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < SSLIST.length; i++) {
      $("#ss-selector").append("<tr id='player-selector-row-ss" + i + "'><td id='player-selector-team-ss" + i + "'>" + SSLIST[i].team + "</td><td id='player-selector-name-ss" + i + "'>" + SSLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-ss" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-ss" + i + "'type='checkbox'></td></tr>");
    }
    for (i = 0; i < OFLIST.length; i++) {
      $("#of-selector").append("<tr id='player-selector-row-of" + i + "'><td id='player-selector-team-of" + i + "'>" + OFLIST[i].team + "</td><td id='player-selector-name-of" + i + "'>" + OFLIST[i].name + "</td><td class='lock-checkbox'><input id='lock-checkbox-of" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='exclude-checkbox-of" + i + "'type='checkbox'></td></tr>");
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
  }

  // GET AN OPTIMIZED LINEUP
  function optimize(){
    $("body").addClass("loading");
    $("#csv-export").addClass("hide");
    $("#export-type-selector").addClass("hide");
    $('#exclude-list').empty();
    $('#lock-list').empty();
    LINEUP = {
      p1: {},
      p2: {},
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
    setExcludes();
    setLocks();
    $('#team-pitcher-percentage-table-container').empty();
    $('#team-hitter-percentage-table-container').empty();
    $('#lineup-container').empty();
    LINEUPSARRAY = [];
    
    // CREATE STACKTEAM ARRAY FROM CHECKED BOXES
    STACKTEAM = [];
    for (var k = 0; k < $('#stack-selector input').length; k++) {
      if ($('#stack-selector input')[k].checked) {
        STACKTEAM.push($('#stack-selector input')[k].value);
      }
    }

    // GET STACK OPTIONS
    STACKOPTS = [];
    for (var l = 0; l < $('#stack-options input').length; l++) {
      if ($('#stack-options input')[l].checked) {
        STACKOPTS.push($('#stack-options input')[l].value);
      }
    }


    var pitcherList = PLIST.slice();
    var catcherList = CLIST.slice();
    var firstBaseList = FBLIST.slice();
    var secondBaseList = SBLIST.slice();
    var thirdBaseList = TBLIST.slice();
    var shortstopList = SSLIST.slice();
    var outfieldList = OFLIST.slice();

    EXCLUDES = getExcludes();
    for (i = 0; i < EXCLUDES.length; i++) {
      if (EXCLUDES[i].pos1 == "P" || EXCLUDES[i].pos2 == "P") {
        for (j = 0; j < pitcherList.length; j++) {
          if (pitcherList[j] === EXCLUDES[i]) {
            pitcherList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].pos1 == "C" || EXCLUDES[i].pos2 == "C") {
        for (j = 0; j < catcherList.length; j++) {
          if (catcherList[j] === EXCLUDES[i]) {
            catcherList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].pos1 == "1B" || EXCLUDES[i].pos2 == "1B") {
        for (j = 0; j < firstBaseList.length; j++) {
          if (firstBaseList[j] === EXCLUDES[i]) {
            firstBaseList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].pos1 == "2B" || EXCLUDES[i].pos2 == "2B") {
        for (j = 0; j < secondBaseList.length; j++) {
          if (secondBaseList[j] === EXCLUDES[i]) {
            secondBaseList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].pos1 == "3B" || EXCLUDES[i].pos2 == "3B") {
        for (j = 0; j < thirdBaseList.length; j++) {
          if (thirdBaseList[j] === EXCLUDES[i]) {
            thirdBaseList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].pos1 == "SS" || EXCLUDES[i].pos2 == "SS") {
        for (j = 0; j < shortstopList.length; j++) {
          if (shortstopList[j] === EXCLUDES[i]) {
            shortstopList.splice(j, 1);
          }
        }
      }
      if (EXCLUDES[i].pos1 == "OF" || EXCLUDES[i].pos2 == "OF") {
        for (j = 0; j < outfieldList.length; j++) {
          if (outfieldList[j] === EXCLUDES[i]) {
            outfieldList.splice(j, 1);
          }
        }
      }
    }
    showExcludeList();

    var cRatioSlice = 5;
    var cFPSlice = 5;
    var fbRatioSlice = 5;
    var fbFPSlice = 5;
    var sbRatioSlice = 5;
    var sbFPSlice = 5;
    var tbRatioSlice = 5;
    var tbFPSlice = 5;
    var ssRatioSlice = 5;
    var ssFPSlice = 5;
    var ofRatioSlice = 20;
    var ofFPSlice = 10;

    if (STACKTEAM[0] !== "none" && STACKTEAM[0] !== "any") {
      cRatioSlice = 5;
      cFPSlice = 4;
      fbRatioSlice = 5;
      fbFPSlice = 4;
      sbRatioSlice = 5;
      sbFPSlice = 4;
      tbRatioSlice = 5;
      tbFPSlice = 4;
      ssRatioSlice = 5;
      ssFPSlice = 4;
      ofRatioSlice = 18;
      ofFPSlice = 9;
    }

    if (STACKTEAM[0] !== "none" && STACKTEAM[0] !== "any" && STACKOPTS.indexOf('doublestack') > -1 && STACKOPTS.indexOf('ministack') === -1) {
      cRatioSlice = 0;
      cFPSlice = 0;
      fbRatioSlice = 0;
      fbFPSlice = 0;
      sbRatioSlice = 0;
      sbFPSlice = 0;
      tbRatioSlice = 0;
      tbFPSlice = 0;
      ssRatioSlice = 0;
      ssFPSlice = 0;
      ofRatioSlice = 0;
      ofFPSlice = 0;
    }

    if (TEAMCOUNT <= 10) {
      pitcherList.sort(sortByFP);
      pitcherList = pitcherList.slice(0, TEAMCOUNT);
    } else {
      pitcherList.sort(sortByRatio);
      var pitcherListByRatio = pitcherList.slice(0, 5);
      pitcherList.sort(sortByFP);
      var pitcherListByFP = pitcherList.slice(0, 5);
      pitcherList = arrayUnique(pitcherListByRatio.concat(pitcherListByFP));
    }

    catcherList.sort(sortByRatio);
    var catcherListByRatio = catcherList.slice(0, cRatioSlice);
    catcherList.sort(sortByFP);
    var catcherListByFP = catcherList.slice(0, cFPSlice);
    catcherList = arrayUnique(catcherListByRatio.concat(catcherListByFP));

    firstBaseList.sort(sortByRatio);
    var firstBaseListByRatio = firstBaseList.slice(0, fbRatioSlice);
    firstBaseList.sort(sortByFP);
    var firstBaseListByFP = firstBaseList.slice(0, fbFPSlice);
    firstBaseList = arrayUnique(firstBaseListByRatio.concat(firstBaseListByFP));

    secondBaseList.sort(sortByRatio);
    var secondBaseListByRatio = secondBaseList.slice(0, sbRatioSlice);
    secondBaseList.sort(sortByFP);
    var secondBaseListByFP = secondBaseList.slice(0, sbFPSlice);
    secondBaseList = arrayUnique(secondBaseListByRatio.concat(secondBaseListByFP));

    thirdBaseList.sort(sortByRatio);
    var thirdBaseListByRatio = thirdBaseList.slice(0, tbRatioSlice);
    thirdBaseList.sort(sortByFP);
    var thirdBaseListByFP = thirdBaseList.slice(0, tbFPSlice);
    thirdBaseList = arrayUnique(thirdBaseListByRatio.concat(thirdBaseListByFP));

    shortstopList.sort(sortByRatio);
    var shortstopListByRatio = shortstopList.slice(0, ssRatioSlice);
    shortstopList.sort(sortByFP);
    var shortstopListByFP = shortstopList.slice(0, ssFPSlice);
    shortstopList = arrayUnique(shortstopListByRatio.concat(shortstopListByFP));

    outfieldList.sort(sortByRatio);
    var outfieldListByRatio = outfieldList.slice(0, ofRatioSlice);
    outfieldList.sort(sortByFP);
    var outfieldListByFP = outfieldList.slice(0, ofFPSlice);
    outfieldList = arrayUnique(outfieldListByRatio.concat(outfieldListByFP));

    if (STACKTEAM[0] !== "none" && STACKTEAM[0] !== "any") {
      var stackPlayers = getTeamStarters(STACKTEAM);
      for (var j = 0; j < stackPlayers.length; j++) {
        for (i = 0; i < stackPlayers[j].length; i++) {
          if ((stackPlayers[j][i].pos1 == "C" || stackPlayers[j][i].pos2 == "C") && stackPlayers[j][i].exclude === false) {
            if (containsObject(stackPlayers[j][i],catcherList) !== true) {
              catcherList.push(stackPlayers[j][i]);
            }
          }
          if ((stackPlayers[j][i].pos1 == "1B" || stackPlayers[j][i].pos2 == "1B") && stackPlayers[j][i].exclude === false) {
            if (containsObject(stackPlayers[j][i],firstBaseList) !== true) {
              firstBaseList.push(stackPlayers[j][i]);
            }
          }
          if ((stackPlayers[j][i].pos1 == "2B" || stackPlayers[j][i].pos2 == "2B") && stackPlayers[j][i].exclude === false) {
            if (containsObject(stackPlayers[j][i],secondBaseList) !== true) {
              secondBaseList.push(stackPlayers[j][i]);
            }
          }
          if ((stackPlayers[j][i].pos1 == "3B" || stackPlayers[j][i].pos2 == "3B") && stackPlayers[j][i].exclude === false) {
            if (containsObject(stackPlayers[j][i],thirdBaseList) !== true) {
              thirdBaseList.push(stackPlayers[j][i]);
            }
          }
          if ((stackPlayers[j][i].pos1 == "SS" || stackPlayers[j][i].pos2 == "SS") && stackPlayers[j][i].exclude === false) {
            if (containsObject(stackPlayers[j][i],shortstopList) !== true) {
              shortstopList.push(stackPlayers[j][i]);
            }
          }
          if ((stackPlayers[j][i].pos1 == "OF" || stackPlayers[j][i].pos2 == "OF") && stackPlayers[j][i].exclude === false) {
            if (containsObject(stackPlayers[j][i],outfieldList) !== true) {
              outfieldList.push(stackPlayers[j][i]);
            }
          }
        }
      } 
      if (STACKOPTS.indexOf('doublestack') > -1 && STACKOPTS.indexOf('ministack') === -1) {
        cRatioSlice = 5;
        cFPSlice = 5;
        fbRatioSlice = 5;
        fbFPSlice = 5;
        sbRatioSlice = 5;
        sbFPSlice = 5;
        tbRatioSlice = 5;
        tbFPSlice = 5;
        ssRatioSlice = 5;
        ssFPSlice = 5;
        ofRatioSlice = 20;
        ofFPSlice = 10;  
        catcherList.sort(sortByRatio);
        var catcherListByRatio = catcherList.slice(0, cRatioSlice);
        catcherList.sort(sortByFP);
        var catcherListByFP = catcherList.slice(0, cFPSlice);
        catcherList = arrayUnique(catcherListByRatio.concat(catcherListByFP));

        firstBaseList.sort(sortByRatio);
        var firstBaseListByRatio = firstBaseList.slice(0, fbRatioSlice);
        firstBaseList.sort(sortByFP);
        var firstBaseListByFP = firstBaseList.slice(0, fbFPSlice);
        firstBaseList = arrayUnique(firstBaseListByRatio.concat(firstBaseListByFP));

        secondBaseList.sort(sortByRatio);
        var secondBaseListByRatio = secondBaseList.slice(0, sbRatioSlice);
        secondBaseList.sort(sortByFP);
        var secondBaseListByFP = secondBaseList.slice(0, sbFPSlice);
        secondBaseList = arrayUnique(secondBaseListByRatio.concat(secondBaseListByFP));

        thirdBaseList.sort(sortByRatio);
        var thirdBaseListByRatio = thirdBaseList.slice(0, tbRatioSlice);
        thirdBaseList.sort(sortByFP);
        var thirdBaseListByFP = thirdBaseList.slice(0, tbFPSlice);
        thirdBaseList = arrayUnique(thirdBaseListByRatio.concat(thirdBaseListByFP));

        shortstopList.sort(sortByRatio);
        var shortstopListByRatio = shortstopList.slice(0, ssRatioSlice);
        shortstopList.sort(sortByFP);
        var shortstopListByFP = shortstopList.slice(0, ssFPSlice);
        shortstopList = arrayUnique(shortstopListByRatio.concat(shortstopListByFP));

        outfieldList.sort(sortByRatio);
        var outfieldListByRatio = outfieldList.slice(0, ofRatioSlice);
        outfieldList.sort(sortByFP);
        var outfieldListByFP = outfieldList.slice(0, ofFPSlice);
        outfieldList = arrayUnique(outfieldListByRatio.concat(outfieldListByFP));
      } 
    }

    LOCKS = getLocks();
    var pitcherLocks = [];
    for (i = 0; i < LOCKS.length; i++) {
      if (LOCKS[i].pos1 == "P" || LOCKS[i].pos2 == "P") {
        pitcherLocks.push(LOCKS[i]);
        if (containsObject(LOCKS[i],pitcherList) !== true) {
          pitcherList.push(LOCKS[i]);
        }
      }
      if (LOCKS[i].pos1 == "C" || LOCKS[i].pos2 == "C") {
        if (dualPositionEligible(LOCKS[i])) {
          if (containsObject(LOCKS[i],catcherList) !== true) {
            catcherList.push(LOCKS[i]);
          }
        } else {
          catcherList = [LOCKS[i]];
        }
      }
      if (LOCKS[i].pos1 == "1B" || LOCKS[i].pos2 == "1B") {
        if (dualPositionEligible(LOCKS[i])) {
          if (containsObject(LOCKS[i],firstBaseList) !== true) {
            firstBaseList.push(LOCKS[i]);
          }
        } else {
          firstBaseList = [LOCKS[i]];
        }
      }
      if (LOCKS[i].pos1 == "2B" || LOCKS[i].pos2 == "2B") {
        if (dualPositionEligible(LOCKS[i])) {
          if (containsObject(LOCKS[i],secondBaseList) !== true) {
            secondBaseList.push(LOCKS[i]);
          }
        } else {
          secondBaseList = [LOCKS[i]];
        }
      }
      if (LOCKS[i].pos1 == "3B" || LOCKS[i].pos2 == "3B") {
        if (dualPositionEligible(LOCKS[i])) {
          if (containsObject(LOCKS[i],thirdBaseList) !== true) {
            thirdBaseList.push(LOCKS[i]);
          }
        } else {
          thirdBaseList = [LOCKS[i]];
        }
      }
      if (LOCKS[i].pos1 == "SS" || LOCKS[i].pos2 == "SS") {
        if (dualPositionEligible(LOCKS[i])) {
          if (containsObject(LOCKS[i],shortstopList) !== true) {
            shortstopList.push(LOCKS[i]);
          }
        } else {
          shortstopList = [LOCKS[i]];
        }
      }
      if (LOCKS[i].pos1 == "OF" || LOCKS[i].pos2 == "OF") {
        if (containsObject(LOCKS[i],outfieldList) !== true) {
          outfieldList.push(LOCKS[i]);
        }
      }
    }
    showLockList();

    pitcherList.sort(reverseSortByCost);
    catcherList.sort(reverseSortByCost);
    firstBaseList.sort(reverseSortByCost);
    secondBaseList.sort(reverseSortByCost);
    thirdBaseList.sort(reverseSortByCost);
    shortstopList.sort(reverseSortByCost);
    outfieldList.sort(reverseSortByCost);
    
    LINEUP.p1 = pitcherList[0];
    LINEUP.c = catcherList[0];
    LINEUP.fb = firstBaseList[0];
    LINEUP.sb = secondBaseList[0];
    LINEUP.tb = thirdBaseList[0];
    LINEUP.ss = shortstopList[0];
    LINEUP.of1 = outfieldList[0];

    console.log("starting new loops");
    var checkNewLineupCounter = 0;
    var maxSal = 50000;
    var minSal = $('#min-salary').val();
    pLength = pitcherList.length;
    cLength = catcherList.length;
    fbLength = firstBaseList.length;
    sbLength = secondBaseList.length;
    tbLength = thirdBaseList.length;
    ssLength = shortstopList.length;
    ofLength = outfieldList.length;

    if (STACKTEAM[0] !== "none") {
      if (pitcherLocks.length == 0) {
        for (p1 = 0; p1 < pLength-1; p1++) {
          LINEUP.p1 = pitcherList[p1];
          for (p2 = p1+1; p2 < pLength; p2++) {
            LINEUP.p2 = pitcherList[p2];
            for (c = 0; c < cLength; c++){
              LINEUP.c = catcherList[c];
              for (fb = 0; fb < fbLength; fb++){
                LINEUP.fb = firstBaseList[fb];
                for (sb = 0; sb < sbLength; sb++){
                  LINEUP.sb = secondBaseList[sb];
                  for (tb = 0; tb < tbLength; tb++){
                    LINEUP.tb = thirdBaseList[tb];
                    for (ss = 0; ss < ssLength; ss++){
                      LINEUP.ss = shortstopList[ss];
                      for (of1 = 0; of1 < ofLength-2; of1++) {
                        LINEUP.of1 = outfieldList[of1];
                        for (of2 = of1+1; of2 < ofLength-1; of2++) {
                          LINEUP.of2 = outfieldList[of2];
                          for (of3 = of2+1; of3 < ofLength; of3++) {
                            LINEUP.of3 = outfieldList[of3];
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
        }
      } else if (pitcherLocks.length == 1) {
        LINEUP.p1 = pitcherLocks[0];
        pitcherList = $.grep(pitcherList, function(e){ 
          return e.name != pitcherLocks[0].name;
        });
        pLength = pitcherList.length;
        for (p2 = 0; p2 < pLength; p2++) {
          LINEUP.p2 = pitcherList[p2];
          for (c = 0; c < cLength; c++){
            LINEUP.c = catcherList[c];
            for (fb = 0; fb < fbLength; fb++){
              LINEUP.fb = firstBaseList[fb];
              for (sb = 0; sb < sbLength; sb++){
                LINEUP.sb = secondBaseList[sb];
                for (tb = 0; tb < tbLength; tb++){
                  LINEUP.tb = thirdBaseList[tb];
                  for (ss = 0; ss < ssLength; ss++){
                    LINEUP.ss = shortstopList[ss];
                    for (of1 = 0; of1 < ofLength-2; of1++) {
                      LINEUP.of1 = outfieldList[of1];
                      for (of2 = of1+1; of2 < ofLength-1; of2++) {
                        LINEUP.of2 = outfieldList[of2];
                        for (of3 = of2+1; of3 < ofLength; of3++) {
                          LINEUP.of3 = outfieldList[of3];
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
      } else if (pitcherLocks.length == 2) {
        LINEUP.p1 = pitcherLocks[0];
        LINEUP.p2 = pitcherLocks[1];
        for (c = 0; c < cLength; c++){
          LINEUP.c = catcherList[c];
          for (fb = 0; fb < fbLength; fb++){
            LINEUP.fb = firstBaseList[fb];
            for (sb = 0; sb < sbLength; sb++){
              LINEUP.sb = secondBaseList[sb];
              for (tb = 0; tb < tbLength; tb++){
                LINEUP.tb = thirdBaseList[tb];
                for (ss = 0; ss < ssLength; ss++){
                  LINEUP.ss = shortstopList[ss];
                  for (of1 = 0; of1 < ofLength-2; of1++) {
                    LINEUP.of1 = outfieldList[of1];
                    for (of2 = of1+1; of2 < ofLength-1; of2++) {
                      LINEUP.of2 = outfieldList[of2];
                      for (of3 = of2+1; of3 < ofLength; of3++) {
                        LINEUP.of3 = outfieldList[of3];
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
      if (pitcherLocks.length == 0) {
        for (p1 = 0; p1 < pLength-1; p1++) {
          LINEUP.p1 = pitcherList[p1];
          for (p2 = p1+1; p2 < pLength; p2++) {
            LINEUP.p2 = pitcherList[p2];
            for (c = 0; c < cLength; c++){
              LINEUP.c = catcherList[c];
              for (fb = 0; fb < fbLength; fb++){
                LINEUP.fb = firstBaseList[fb];
                for (sb = 0; sb < sbLength; sb++){
                  LINEUP.sb = secondBaseList[sb];
                  for (tb = 0; tb < tbLength; tb++){
                    LINEUP.tb = thirdBaseList[tb];
                    for (ss = 0; ss < ssLength; ss++){
                      LINEUP.ss = shortstopList[ss];
                      for (of1 = 0; of1 < ofLength-2; of1++) {
                        LINEUP.of1 = outfieldList[of1];
                        for (of2 = of1+1; of2 < ofLength-1; of2++) {
                          LINEUP.of2 = outfieldList[of2];
                          for (of3 = of2+1; of3 < ofLength; of3++) {
                            LINEUP.of3 = outfieldList[of3];
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
      } else if (pitcherLocks.length == 1) {
        LINEUP.p1 = pitcherLocks[0];
        pitcherList = $.grep(pitcherList, function(e){ 
          return e.name != pitcherLocks[0].name;
        });
        pLength = pitcherList.length;
        for (p2 = 0; p2 < pLength; p2++) {
          LINEUP.p2 = pitcherList[p2];
          for (c = 0; c < cLength; c++){
            LINEUP.c = catcherList[c];
            for (fb = 0; fb < fbLength; fb++){
              LINEUP.fb = firstBaseList[fb];
              for (sb = 0; sb < sbLength; sb++){
                LINEUP.sb = secondBaseList[sb];
                for (tb = 0; tb < tbLength; tb++){
                  LINEUP.tb = thirdBaseList[tb];
                  for (ss = 0; ss < ssLength; ss++){
                    LINEUP.ss = shortstopList[ss];
                    for (of1 = 0; of1 < ofLength-2; of1++) {
                      LINEUP.of1 = outfieldList[of1];
                      for (of2 = of1+1; of2 < ofLength-1; of2++) {
                        LINEUP.of2 = outfieldList[of2];
                        for (of3 = of2+1; of3 < ofLength; of3++) {
                          LINEUP.of3 = outfieldList[of3];
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
      } else if (pitcherLocks.length == 2) {
        LINEUP.p1 = pitcherLocks[0];
        LINEUP.p2 = pitcherLocks[1];
        for (c = 0; c < cLength; c++){
          LINEUP.c = catcherList[c];
          for (fb = 0; fb < fbLength; fb++){
            LINEUP.fb = firstBaseList[fb];
            for (sb = 0; sb < sbLength; sb++){
              LINEUP.sb = secondBaseList[sb];
              for (tb = 0; tb < tbLength; tb++){
                LINEUP.tb = thirdBaseList[tb];
                for (ss = 0; ss < ssLength; ss++){
                  LINEUP.ss = shortstopList[ss];
                  for (of1 = 0; of1 < ofLength-2; of1++) {
                    LINEUP.of1 = outfieldList[of1];
                    for (of2 = of1+1; of2 < ofLength-1; of2++) {
                      LINEUP.of2 = outfieldList[of2];
                      for (of3 = of2+1; of3 < ofLength; of3++) {
                        LINEUP.of3 = outfieldList[of3];
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
    setLineupPercentOwned();
    setTeamPercentOwned();
          
    $("#csv-export").removeClass("hide");
    $("#export-type-selector").removeClass("hide");

    TEAMSOBJECTS.sort(sortByPitcherPercentOwned);
    $('#team-pitcher-percentage-table-container').append("<h3>Pitchers Percent Owned</h3>");
    for (i = 0; i < TEAMCOUNT; i++) {
      if (TEAMSOBJECTS[i].pitcherPercentOwned > 0) {
        $('#team-pitcher-percentage-table-container').append("<div class='team-percentage-table'><table class='table' id='tbl-team-pitcher-percentage" + i + "'></table></div>");
        $('#tbl-team-pitcher-percentage' + i).append("<tr><th>" + TEAMSOBJECTS[i].team + "</th><th>" + TEAMSOBJECTS[i].pitcherPercentOwned.toFixed(2) + "%</th></tr>");
        for (j = 0; j < TEAMSOBJECTS[i].players.length; j++) {
          if (TEAMSOBJECTS[i].players[j].pos1 == "P" || TEAMSOBJECTS[i].players[j].pos2 == "P") {
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
          if (TEAMSOBJECTS[i].players[j].pos1 != "P" && TEAMSOBJECTS[i].players[j].pos2 != "P") {
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
      $('#tbl-optimized' + i).append("<tr><th>Team</th><th>Position</th><th>Inj</th><th>Name</th><th>Projected Points</th><th>Cost</th><th>% Owned</th><th class='lock-checkbox'>Lock</th><th class='exclude-checkbox'>Exclude</th></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-1p" + i + "'><td id='lineup-team-1p" + i + "'>" + LINEUPSARRAY[i].players.p1.team + "</td><td>P</td><td id='inj-1p" + i + "'>" + LINEUPSARRAY[i].players.p1.inj + "</td><td id='lineup-name-1p" + i + "'>" + LINEUPSARRAY[i].players.p1.name + "</td><td>" + LINEUPSARRAY[i].players.p1.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.p1.cost) + "</td><td>" + LINEUPSARRAY[i].players.p1.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-1p" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-1p" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-2p" + i + "'><td id='lineup-team-2p" + i + "'>" + LINEUPSARRAY[i].players.p2.team + "</td><td>P</td><td id='inj-2p" + i + "'>" + LINEUPSARRAY[i].players.p2.inj + "</td><td id='lineup-name-2p" + i + "'>" + LINEUPSARRAY[i].players.p2.name + "</td><td>" + LINEUPSARRAY[i].players.p2.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.p2.cost) + "</td><td>" + LINEUPSARRAY[i].players.p2.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-2p" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-2p" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-c" + i + "'><td id='lineup-team-c" + i + "'>" + LINEUPSARRAY[i].players.c.team + "</td><td>C</td><td id='inj-c" + i + "'>" + LINEUPSARRAY[i].players.c.inj + "</td><td id='lineup-name-c" + i + "'>" + LINEUPSARRAY[i].players.c.name + "</td><td>" + LINEUPSARRAY[i].players.c.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.c.cost) + "</td><td>" + LINEUPSARRAY[i].players.c.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-c" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-c" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-fb" + i + "'><td id='lineup-team-fb" + i + "'>" + LINEUPSARRAY[i].players.fb.team + "</td><td>1B</td><td id='inj-fb" + i + "'>" + LINEUPSARRAY[i].players.fb.inj + "</td><td id='lineup-name-fb" + i + "'>" + LINEUPSARRAY[i].players.fb.name + "</td><td>" + LINEUPSARRAY[i].players.fb.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.fb.cost) + "</td><td>" + LINEUPSARRAY[i].players.fb.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-fb" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-fb" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-sb" + i + "'><td id='lineup-team-sb" + i + "'>" + LINEUPSARRAY[i].players.sb.team + "</td><td>2B</td><td id='inj-sb" + i + "'>" + LINEUPSARRAY[i].players.sb.inj + "</td><td id='lineup-name-sb" + i + "'>" + LINEUPSARRAY[i].players.sb.name + "</td><td>" + LINEUPSARRAY[i].players.sb.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.sb.cost) + "</td><td>" + LINEUPSARRAY[i].players.sb.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-sb" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-sb" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-tb" + i + "'><td id='lineup-team-tb" + i + "'>" + LINEUPSARRAY[i].players.tb.team + "</td><td>3B</td><td id='inj-tb" + i + "'>" + LINEUPSARRAY[i].players.tb.inj + "</td><td id='lineup-name-tb" + i + "'>" + LINEUPSARRAY[i].players.tb.name + "</td><td>" + LINEUPSARRAY[i].players.tb.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.tb.cost) + "</td><td>" + LINEUPSARRAY[i].players.tb.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-tb" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-tb" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-ss" + i + "'><td id='lineup-team-ss" + i + "'>" + LINEUPSARRAY[i].players.ss.team + "</td><td>SS</td><td id='inj-ss" + i + "'>" + LINEUPSARRAY[i].players.ss.inj + "</td><td id='lineup-name-ss" + i + "'>" + LINEUPSARRAY[i].players.ss.name + "</td><td>" + LINEUPSARRAY[i].players.ss.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.ss.cost) + "</td><td>" + LINEUPSARRAY[i].players.ss.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-ss" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-ss" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-1of" + i + "'><td id='lineup-team-1of" + i + "'>" + LINEUPSARRAY[i].players.of1.team + "</td><td>OF</td><td id='inj-1of" + i + "'>" + LINEUPSARRAY[i].players.of1.inj + "</td><td id='lineup-name-1of" + i + "'>" + LINEUPSARRAY[i].players.of1.name + "</td><td>" + LINEUPSARRAY[i].players.of1.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.of1.cost) + "</td><td>" + LINEUPSARRAY[i].players.of1.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-1of" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-1of" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-2of" + i + "'><td id='lineup-team-2of" + i + "'>" + LINEUPSARRAY[i].players.of2.team + "</td><td>OF</td><td id='inj-2of" + i + "'>" + LINEUPSARRAY[i].players.of2.inj + "</td><td id='lineup-name-2of" + i + "'>" + LINEUPSARRAY[i].players.of2.name + "</td><td>" + LINEUPSARRAY[i].players.of2.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.of2.cost) + "</td><td>" + LINEUPSARRAY[i].players.of2.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-2of" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-2of" + i + "'type='checkbox'></td></tr>");
      $('#tbl-optimized' + i).append("<tr id='lineup-table-row-3of" + i + "'><td id='lineup-team-3of" + i + "'>" + LINEUPSARRAY[i].players.of3.team + "</td><td>OF</td><td id='inj-3of" + i + "'>" + LINEUPSARRAY[i].players.of3.inj + "</td><td id='lineup-name-3of" + i + "'>" + LINEUPSARRAY[i].players.of3.name + "</td><td>" + LINEUPSARRAY[i].players.of3.fp.toFixed(2) + "</td><td>$" + commaSeparateNumber(LINEUPSARRAY[i].players.of3.cost) + "</td><td>" + LINEUPSARRAY[i].players.of3.percentOwned.toFixed(2) + "%</td><td class='lock-checkbox'><input id='lineup-lock-checkbox-3of" + i + "'type='checkbox'></td><td class='exclude-checkbox'><input id='lineup-exclude-checkbox-3of" + i + "'type='checkbox'></td></tr>");
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.p1.starting == "Not Starting") {
        $("#lineup-table-row-1p" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.p1.starting == "Starting") {
        $("#lineup-table-row-1p" + i).addClass("success");
      } 
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.p2.starting == "Not Starting") {
        $("#lineup-table-row-2p" + i).addClass("danger");
      } else if (LINEUPSARRAY[i].players.p2.starting == "Starting") {
        $("#lineup-table-row-2p" + i).addClass("success");
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
      if (LINEUPSARRAY[i].players.p1.inj == "A") {
        $("#inj-1p" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.p1.inj == "P") {
        $("#inj-1p" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.p1.inj == "Q") {
        $("#inj-1p" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.p1.inj == "D") {
        $("#inj-1p" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.p1.inj == "O") {
        $("#inj-1p" + i).addClass("inj-out");
      }
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      if (LINEUPSARRAY[i].players.p2.inj == "A") {
        $("#inj-2p" + i).addClass("inj-active");
      } else if (LINEUPSARRAY[i].players.p2.inj == "P") {
        $("#inj-2p" + i).addClass("inj-probable");
      } else if (LINEUPSARRAY[i].players.p2.inj == "Q") {
        $("#inj-2p" + i).addClass("inj-questionable");
      } else if (LINEUPSARRAY[i].players.p2.inj == "D") {
        $("#inj-2p" + i).addClass("inj-doubtful");
      } else if (LINEUPSARRAY[i].players.p2.inj == "O") {
        $("#inj-2p" + i).addClass("inj-out");
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

    applyCheckboxStatus();
    $("body").removeClass("loading");
    if (!$('#team-pitcher-percentage-table-container').is(':empty')) {
      $('html,body').animate({
          scrollTop: $("#team-pitcher-percentage-table-container").offset().top-100},
          'slow');
    }
  }

  // RETURN CONFIRMED & PROJECTED STARTERS FROM A TEAM
  function getTeamStarters(team) {
    var playerList = PLAYERS.slice();
    var starters = [];
    for (var i = 0; i < team.length; i++) {
      starters.push($.grep(playerList, function(e) { return ((e.team == team[i]) && (e.starting == "Starting" || e.starting == "Projected Starting"))}));
    }
    return starters;
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
    for (i = 0; i < PLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-p'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-p'+i).text() && PLAYERS[j].team == $('#player-selector-team-p'+i).text()) {
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
    for (i = 0; i < FBLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-fb'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-fb'+i).text() && PLAYERS[j].team == $('#player-selector-team-fb'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }
    for (i = 0; i < SBLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-sb'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-sb'+i).text() && PLAYERS[j].team == $('#player-selector-team-sb'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }
    for (i = 0; i < TBLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-tb'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-tb'+i).text() && PLAYERS[j].team == $('#player-selector-team-tb'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }
    for (i = 0; i < SSLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-ss'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-ss'+i).text() && PLAYERS[j].team == $('#player-selector-team-ss'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }
    for (i = 0; i < OFLIST.length; i++) {
      if (document.getElementById('exclude-checkbox-of'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-of'+i).text() && PLAYERS[j].team == $('#player-selector-team-of'+i).text()) {
            PLAYERS[j].exclude = true;
          }
        }
      }
    }

    // IF LINEUPS EXIST SET EXCLUDES FROM LINEUPS TABLES
    if (LINEUPSARRAY.length > 0) {
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-1p'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1p'+i).text() && PLAYERS[j].team == $('#lineup-team-1p'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-2p'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-2p'+i).text() && PLAYERS[j].team == $('#lineup-team-2p'+i).text()) {
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
        if (document.getElementById('lineup-exclude-checkbox-fb'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-fb'+i).text() && PLAYERS[j].team == $('#lineup-team-fb'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-sb'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-sb'+i).text() && PLAYERS[j].team == $('#lineup-team-sb'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-tb'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-tb'+i).text() && PLAYERS[j].team == $('#lineup-team-tb'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-ss'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-ss'+i).text() && PLAYERS[j].team == $('#lineup-team-ss'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-1of'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1of'+i).text() && PLAYERS[j].team == $('#lineup-team-1of'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-2of'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-2of'+i).text() && PLAYERS[j].team == $('#lineup-team-2of'+i).text()) {
              PLAYERS[j].exclude = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-exclude-checkbox-3of'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-3of'+i).text() && PLAYERS[j].team == $('#lineup-team-3of'+i).text()) {
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
    for (i = 0; i < PLIST.length; i++) {
      if (document.getElementById('lock-checkbox-p'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-p'+i).text() && PLAYERS[j].team == $('#player-selector-team-p'+i).text()) {
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
    for (i = 0; i < FBLIST.length; i++) {
      if (document.getElementById('lock-checkbox-fb'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-fb'+i).text() && PLAYERS[j].team == $('#player-selector-team-fb'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }
    for (i = 0; i < SBLIST.length; i++) {
      if (document.getElementById('lock-checkbox-sb'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-sb'+i).text() && PLAYERS[j].team == $('#player-selector-team-sb'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }
    for (i = 0; i < TBLIST.length; i++) {
      if (document.getElementById('lock-checkbox-tb'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-tb'+i).text() && PLAYERS[j].team == $('#player-selector-team-tb'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }
    for (i = 0; i < SSLIST.length; i++) {
      if (document.getElementById('lock-checkbox-ss'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-ss'+i).text() && PLAYERS[j].team == $('#player-selector-team-ss'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }
    for (i = 0; i < OFLIST.length; i++) {
      if (document.getElementById('lock-checkbox-of'+i).checked) {
        for (j = PLAYERS.length - 1; j >= 0; j--){
          if (PLAYERS[j].name == $('#player-selector-name-of'+i).text() && PLAYERS[j].team == $('#player-selector-team-of'+i).text()) {
            PLAYERS[j].lock = true;
          }
        }
      }
    }

    // IF LINEUPS EXIST SET LOCKS FROM LINEUPS TABLES
    if (LINEUPSARRAY.length > 0) {
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-1p'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1p'+i).text() && PLAYERS[j].team == $('#lineup-team-1p'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-2p'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-2p'+i).text() && PLAYERS[j].team == $('#lineup-team-2p'+i).text()) {
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
        if (document.getElementById('lineup-lock-checkbox-fb'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-fb'+i).text() && PLAYERS[j].team == $('#lineup-team-fb'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-sb'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-sb'+i).text() && PLAYERS[j].team == $('#lineup-team-sb'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-tb'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-tb'+i).text() && PLAYERS[j].team == $('#lineup-team-tb'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-ss'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-ss'+i).text() && PLAYERS[j].team == $('#lineup-team-ss'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-1of'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-1of'+i).text() && PLAYERS[j].team == $('#lineup-team-1of'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-2of'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-2of'+i).text() && PLAYERS[j].team == $('#lineup-team-2of'+i).text()) {
              PLAYERS[j].lock = true;
            }
          }
        }
      }
      for (i = 0; i < LINEUPSARRAY.length; i++) {
        if (document.getElementById('lineup-lock-checkbox-3of'+i).checked) {
          for (j = PLAYERS.length - 1; j >= 0; j--){
            if (PLAYERS[j].name == $('#lineup-name-3of'+i).text() && PLAYERS[j].team == $('#lineup-team-3of'+i).text()) {
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
        for (j = 0; j < PLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-p'+j).text() && LOCKS[i].team == $('#player-selector-team-p'+j).text()) {
            document.getElementById('lock-checkbox-p'+j).checked = true;
          }
        }
        for (j = 0; j < CLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-c'+j).text() && LOCKS[i].team == $('#player-selector-team-c'+j).text()) {
            document.getElementById('lock-checkbox-c'+j).checked = true;
          }
        }
        for (j = 0; j < FBLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-fb'+j).text() && LOCKS[i].team == $('#player-selector-team-fb'+j).text()) {
            document.getElementById('lock-checkbox-fb'+j).checked = true;
          }
        }
        for (j = 0; j < SBLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-sb'+j).text() && LOCKS[i].team == $('#player-selector-team-sb'+j).text()) {
            document.getElementById('lock-checkbox-sb'+j).checked = true;
          }
        }
        for (j = 0; j < TBLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-tb'+j).text() && LOCKS[i].team == $('#player-selector-team-tb'+j).text()) {
            document.getElementById('lock-checkbox-tb'+j).checked = true;
          }
        }
        for (j = 0; j < SSLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-ss'+j).text() && LOCKS[i].team == $('#player-selector-team-ss'+j).text()) {
            document.getElementById('lock-checkbox-ss'+j).checked = true;
          }
        }
        for (j = 0; j < OFLIST.length; j++) {
          if (LOCKS[i].name == $('#player-selector-name-of'+j).text() && LOCKS[i].team == $('#player-selector-team-of'+j).text()) {
            document.getElementById('lock-checkbox-of'+j).checked = true;
          }
        }
      }
    }
    if (EXCLUDES.length > 0) {
      for (i = 0; i < EXCLUDES.length; i++) {
        for (j = 0; j < PLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-p'+j).text() && EXCLUDES[i].team == $('#player-selector-team-p'+j).text()) {
            document.getElementById('exclude-checkbox-p'+j).checked = true;
          }
        }
        for (j = 0; j < CLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-c'+j).text() && EXCLUDES[i].team == $('#player-selector-team-c'+j).text()) {
            document.getElementById('exclude-checkbox-c'+j).checked = true;
          }
        }
        for (j = 0; j < FBLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-fb'+j).text() && EXCLUDES[i].team == $('#player-selector-team-fb'+j).text()) {
            document.getElementById('exclude-checkbox-fb'+j).checked = true;
          }
        }
        for (j = 0; j < SBLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-sb'+j).text() && EXCLUDES[i].team == $('#player-selector-team-sb'+j).text()) {
            document.getElementById('exclude-checkbox-sb'+j).checked = true;
          }
        }
        for (j = 0; j < TBLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-tb'+j).text() && EXCLUDES[i].team == $('#player-selector-team-tb'+j).text()) {
            document.getElementById('exclude-checkbox-tb'+j).checked = true;
          }
        }
        for (j = 0; j < SSLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-ss'+j).text() && EXCLUDES[i].team == $('#player-selector-team-ss'+j).text()) {
            document.getElementById('exclude-checkbox-ss'+j).checked = true;
          }
        }
        for (j = 0; j < OFLIST.length; j++) {
          if (EXCLUDES[i].name == $('#player-selector-name-of'+j).text() && EXCLUDES[i].team == $('#player-selector-team-of'+j).text()) {
            document.getElementById('exclude-checkbox-of'+j).checked = true;
          }
        }
      }
    }
  }

  function clearLocks() {
    for (i = 0; i < PLIST.length; i++) {
      document.getElementById('lock-checkbox-p'+i).checked = false;
    }
    for (i = 0; i < CLIST.length; i++) {
      document.getElementById('lock-checkbox-c'+i).checked = false;
    }
    for (i = 0; i < FBLIST.length; i++) {
      document.getElementById('lock-checkbox-fb'+i).checked = false;
    }
    for (i = 0; i < SBLIST.length; i++) {
      document.getElementById('lock-checkbox-sb'+i).checked = false;
    }
    for (i = 0; i < TBLIST.length; i++) {
      document.getElementById('lock-checkbox-tb'+i).checked = false;
    }
    for (i = 0; i < SSLIST.length; i++) {
      document.getElementById('lock-checkbox-ss'+i).checked = false;
    }
    for (i = 0; i < OFLIST.length; i++) {
      document.getElementById('lock-checkbox-of'+i).checked = false;
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-1p'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-2p'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-c'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-fb'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-sb'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-tb'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-ss'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-1of'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-2of'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-lock-checkbox-3of'+i).checked = false;
    }
  }

  function clearExcludes() {
    for (i = 0; i < $('#schedule tr').length-1; i++) {
      document.getElementById('away-checkbox'+i).checked = false;
      document.getElementById('home-checkbox'+i).checked = false;
    }

    for (i = 0; i < PLIST.length; i++) {
      document.getElementById('exclude-checkbox-p'+i).checked = false;
    }
    for (i = 0; i < CLIST.length; i++) {
      document.getElementById('exclude-checkbox-c'+i).checked = false;
    }
    for (i = 0; i < FBLIST.length; i++) {
      document.getElementById('exclude-checkbox-fb'+i).checked = false;
    }
    for (i = 0; i < SBLIST.length; i++) {
      document.getElementById('exclude-checkbox-sb'+i).checked = false;
    }
    for (i = 0; i < TBLIST.length; i++) {
      document.getElementById('exclude-checkbox-tb'+i).checked = false;
    }
    for (i = 0; i < SSLIST.length; i++) {
      document.getElementById('exclude-checkbox-ss'+i).checked = false;
    }
    for (i = 0; i < OFLIST.length; i++) {
      document.getElementById('exclude-checkbox-of'+i).checked = false;
    }

    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-1p'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-2p'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-c'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-fb'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-sb'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-tb'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-ss'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-1of'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-2of'+i).checked = false;
    }
    for (i = 0; i < LINEUPSARRAY.length; i++) {
      document.getElementById('lineup-exclude-checkbox-3of'+i).checked = false;
    }
  }

  // A FUNCTION TO DETERMINE VALIDITY & STACK OF LINEUP AND ADD IT TO "LINEUPSARRAY" IF IT'S A TOP LINEUP
  function checkLineupStack(lineup) {
    if (noPlayerDupes(lineup)) {
      var lineupFP = getLineupFP(lineup);
      if (STACKTEAM[0] == "any") {
        if (LINEUPSARRAY.length < MAXLENGTH) {
          if (!isNotStack(lineup) && isValidLineup(lineup) && !pitchersOpposeBatters(lineup) && includesLocks(lineup, LOCKS)) {
            var lineupCost = getLineupCost(lineup);
            var lineupID = getLineupID(lineup);
            LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
            LINEUPSARRAY.sort(sortByFP);
          }
        } else if (lineupFP > LINEUPSARRAY[MAXLENGTH-1].fp) {
          if (!isNotStack(lineup) && isValidLineup(lineup) && !pitchersOpposeBatters(lineup) && includesLocks(lineup, LOCKS)) {
            var lineupCost = getLineupCost(lineup);
            var lineupID = getLineupID(lineup);
            LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
            LINEUPSARRAY.sort(sortByFP);
            LINEUPSARRAY.pop();
          }
        }
      } else {
        if (LINEUPSARRAY.length < MAXLENGTH) {
          if (isSelectedStack(lineup, STACKTEAM) && isValidLineup(lineup) && !pitchersOpposeBatters(lineup) && includesLocks(lineup, LOCKS)) {
            var lineupCost = getLineupCost(lineup);
            var lineupID = getLineupID(lineup);
            LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
            LINEUPSARRAY.sort(sortByFP);
          }
        } else if (lineupFP > LINEUPSARRAY[MAXLENGTH-1].fp) {
          if (isSelectedStack(lineup, STACKTEAM) && isValidLineup(lineup) && !pitchersOpposeBatters(lineup) && includesLocks(lineup, LOCKS)) {
            var lineupCost = getLineupCost(lineup);
            var lineupID = getLineupID(lineup);
            LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
            LINEUPSARRAY.sort(sortByFP);
            LINEUPSARRAY.pop();
          }
        }
      }
    }
  }

  // A FUNCTION TO DETERMINE VALIDITY OF LINEUP AND ADD IT TO "LINEUPSARRAY" IF IT'S A TOP LINEUP
  function checkLineup(lineup) {
    if (noPlayerDupes(lineup)) {
      var lineupFP = getLineupFP(lineup);
      if (LINEUPSARRAY.length < MAXLENGTH) {
        if (isValidLineup(lineup) && !pitchersOpposeBatters(lineup) && includesLocks(lineup, LOCKS)) {
          var lineupCost = getLineupCost(lineup);
          var lineupID = getLineupID(lineup);
          LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
          LINEUPSARRAY.sort(sortByFP);
        }
      } else if (lineupFP > LINEUPSARRAY[MAXLENGTH-1].fp) {
        if (isValidLineup(lineup) && !pitchersOpposeBatters(lineup) && includesLocks(lineup, LOCKS)) {
          var lineupCost = getLineupCost(lineup);
          var lineupID = getLineupID(lineup);
          LINEUPSARRAY.push($.extend(true, {fp:lineupFP, cost:lineupCost, id:lineupID}, {players:lineup}));
          LINEUPSARRAY.sort(sortByFP);
          LINEUPSARRAY.pop();
        }
      }
    }
  }

  // A FUNCTION TO DETERMINE WHETHER THERE ARE NO PLAYER DUPLICATES IN A LINEUP
  function noPlayerDupes(lineup) {
    if (lineup.c.pos2.length > 0) {
      if (lineup.c.name == lineup.fb.name || lineup.c.name == lineup.sb.name || lineup.c.name == lineup.tb.name || lineup.c.name == lineup.ss.name || lineup.c.name == lineup.of1.name || lineup.c.name == lineup.of2.name || lineup.c.name == lineup.of3.name) {
        return false;
      }
    }
    if (lineup.fb.pos2.length > 0) {
      if (lineup.fb.name == lineup.sb.name || lineup.fb.name == lineup.tb.name || lineup.fb.name == lineup.ss.name || lineup.fb.name == lineup.of1.name || lineup.fb.name == lineup.of2.name || lineup.fb.name == lineup.of3.name) {
        return false;
      }
    }
    if (lineup.sb.pos2.length > 0) {
      if (lineup.sb.name == lineup.tb.name || lineup.sb.name == lineup.ss.name || lineup.sb.name == lineup.of1.name || lineup.sb.name == lineup.of2.name || lineup.sb.name == lineup.of3.name) {
        return false;
      }
    }
    if (lineup.tb.pos2.length > 0) {
      if (lineup.tb.name == lineup.ss.name || lineup.tb.name == lineup.of1.name || lineup.tb.name == lineup.of2.name || lineup.tb.name == lineup.of3.name) {
        return false;
      }
    }
    if (lineup.ss.pos2.length > 0) {
      if (lineup.ss.name == lineup.of1.name || lineup.ss.name == lineup.of2.name || lineup.ss.name == lineup.of3.name) {
        return false;
      }
    }
    return true;
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

  // STANDARDIZE POSITIONS ("SP" OR "RP" BECOME "P"; ALL OTHERS STAY THE SAME)
  function standardizePosition (pos) {
    if (pos == "SP" || pos == "RP") {
      return "P";
    } else {
      return pos;
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

  // CHECK IF A PLAYER IS ELEGIBLE FOR 2 POSITIONS AND IF SO RETURN TRUE, ELSE FALSE
  function dualPositionEligible(player) {
    if (player.pos2 === "" || player.pos1 === "") {
      return false;
    } else {
      return true;
    }
  }

  // GENERATE A LINEUP ID BASED ON STRINGING NAMES TOGETHER
  function getLineupID(lineup) {
    var id = "";
    var nameArray = [lineup.p1.name, lineup.p2.name, lineup.c.name, lineup.fb.name, lineup.sb.name, lineup.tb.name, lineup.ss.name, lineup.of1.name, lineup.of2.name, lineup.of3.name];
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
    totalCost += lineup.p1.cost + lineup.p2.cost + lineup.c.cost + lineup.fb.cost + lineup.sb.cost + lineup.tb.cost + lineup.ss.cost + lineup.of1.cost + lineup.of2.cost + lineup.of3.cost;
    return totalCost;
  }

  // GET TOTAL PROJECTED FP OF LINEUP
  function getLineupFP(lineup) {
    var totalFP = 0;
    totalFP += lineup.p1.fp + lineup.p2.fp + lineup.c.fp + lineup.fb.fp + lineup.sb.fp + lineup.tb.fp + lineup.ss.fp + lineup.of1.fp + lineup.of2.fp + lineup.of3.fp;
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
    if(updatedCount > 5) {
      return false;
    }
    return true;
  }

  // CHECK IF LINEUP HAS MORE THAN THE MAX AMOUNT OF HITTERS ALLOWED FROM A SINGLE TEAM AND RETURN TRUE OR FALSE
  function isValidLineup(uncheckedLineup) {
    var teams = {};
    var cOkay = incrementModeMap(uncheckedLineup.c.team, teams);
    var fbOkay = incrementModeMap(uncheckedLineup.fb.team, teams);
    var sbOkay = incrementModeMap(uncheckedLineup.sb.team, teams);
    var tbOkay = incrementModeMap(uncheckedLineup.tb.team, teams);
    var ssOkay = incrementModeMap(uncheckedLineup.ss.team, teams);
    var of1Okay = incrementModeMap(uncheckedLineup.of1.team, teams);
    var of2Okay = incrementModeMap(uncheckedLineup.of2.team, teams);
    var of3Okay = incrementModeMap(uncheckedLineup.of3.team, teams);

    return cOkay && fbOkay && sbOkay && tbOkay && ssOkay && of1Okay && of2Okay && of3Okay;
  }

  //INCREMENT STACK MODE MAP FOR TEAM
  function incrementStackModeMap(team, modeMap) {  
    var updatedCount = 1;
    var fiveTeamCount = 0;
    var fourTeamCount = 0;
    var threeTeamCount = 0;
    var atLeastThreeCount = 0;
    if(modeMap[team]){
      updatedCount = modeMap[team]+1;
    }
    modeMap[team] = updatedCount;
    for (var k in modeMap) {
      if (modeMap[k] === 5) {
        fiveTeamCount++;
      }
      else if (modeMap[k] === 4) {
        fourTeamCount++;
      }
      else if (modeMap[k] === 3) {
        threeTeamCount++;
      }

      if (modeMap[k] > 2) {
        atLeastThreeCount++;
      }
    }
    if(STACKOPTS.indexOf('doublestack') === -1) {  
      if(updatedCount > 4 || (updatedCount > 2 && STACKOPTS.indexOf('ministack') > -1)) {
        return false;
      }
    }
    else {
      if((fiveTeamCount > 0 && threeTeamCount > 0) || fourTeamCount > 1 || (atLeastThreeCount > 1 && STACKOPTS.indexOf('ministack') > -1)) {
        return false;
      }      
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
    var countArr = [];
    var fiveTeamCount = 0;
    var fourTeamCount = 0;
    var threeTeamCount = 0;
    var atLeastThreeCount = 0;
    for (var i = 0; i < team.length; i++) {
      var count = 0;
      if (lineup.c.team == team[i]) {
        count++;
      }
      if (lineup.fb.team == team[i]) {
        count++;
      }
      if (lineup.sb.team == team[i]) {
        count++;
      }
      if (lineup.tb.team == team[i]) {
        count++;
      }
      if (lineup.ss.team == team[i]) {
        count++;
      }
      if (lineup.of1.team == team[i]) {
        count++;
      }
      if (lineup.of2.team == team[i]) {
        count++;
      }
      if (lineup.of3.team == team[i]) {
        count++;
      }
      countArr.push(count);
    }
    for (var k = 0; k < countArr.length; k++) {
      if (countArr[k] === 5) {
        fiveTeamCount++;
      }
      else if (countArr[k] === 4) {
        fourTeamCount++;
      }
      else if (countArr[k] === 3) {
        threeTeamCount++;
      }

      if (countArr[k] > 2) {
        atLeastThreeCount++;
      }
    }
    if(STACKOPTS.indexOf('doublestack') === -1) {
      if (countArr.indexOf(5) > -1 || ((countArr.indexOf(4) > -1 || countArr.indexOf(3) > -1) && STACKOPTS.indexOf('ministack') > -1)) {
        return true;
      }
    }  
    else {
      if ((fiveTeamCount > 0 && threeTeamCount > 0) || fourTeamCount > 1 || (atLeastThreeCount > 1 && STACKOPTS.indexOf('ministack') > -1)) {
        return true;
      }
    }
    return false;
  }

  // RETURN TRUE IF THE PITCHER IS OPPOSING ANY HITTERS IN A GIVEN LINEUP, OTHERWISE RETURN FALSE
  function pitchersOpposeBatters(lineup) {
    if (lineup.p1.opponent == lineup.c.team || lineup.p1.opponent == lineup.fb.team || lineup.p1.opponent == lineup.sb.team || lineup.p1.opponent == lineup.tb.team || lineup.p1.opponent == lineup.ss.team || lineup.p1.opponent == lineup.of1.team || lineup.p1.opponent == lineup.of2.team || lineup.p1.opponent == lineup.of3.team || lineup.p2.opponent == lineup.c.team || lineup.p2.opponent == lineup.fb.team || lineup.p2.opponent == lineup.sb.team || lineup.p2.opponent == lineup.tb.team || lineup.p2.opponent == lineup.ss.team || lineup.p2.opponent == lineup.of1.team || lineup.p2.opponent == lineup.of2.team || lineup.p2.opponent == lineup.of3.team) {
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

  // CHECK IF A LINEUP INCLUDES A SPECIFIC SET OF LOCKS
  function includesLocks(lineup, locks) {
    if (locks.length == 0) {
      return true;
    } else {
      var lineupArray = [lineup.p1, lineup.p2, lineup.c, lineup.fb, lineup.sb, lineup.tb, lineup.ss, lineup.of1, lineup.of2, lineup.of3];
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
        if (PLAYERS[i].name == LINEUPSARRAY[j].players.p1.name || PLAYERS[i].name == LINEUPSARRAY[j].players.p2.name || PLAYERS[i].name == LINEUPSARRAY[j].players.c.name || PLAYERS[i].name == LINEUPSARRAY[j].players.fb.name || PLAYERS[i].name == LINEUPSARRAY[j].players.sb.name || PLAYERS[i].name == LINEUPSARRAY[j].players.tb.name || PLAYERS[i].name == LINEUPSARRAY[j].players.ss.name || PLAYERS[i].name == LINEUPSARRAY[j].players.of1.name || PLAYERS[i].name == LINEUPSARRAY[j].players.of2.name || PLAYERS[i].name == LINEUPSARRAY[j].players.of3.name) {
          count++;
        }
      }
      PLAYERS[i].percentOwned = 100*count/LINEUPSARRAY.length;
    }
    for (k = 0; k < LINEUPSARRAY.length; k++) {
      for (l = 0; l < PLAYERS.length; l++) {
        if (LINEUPSARRAY[k].players.p1.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.p1.percentOwned = PLAYERS[l].percentOwned;
        } else if (LINEUPSARRAY[k].players.p2.name == PLAYERS[l].name) {
          LINEUPSARRAY[k].players.p2.percentOwned = PLAYERS[l].percentOwned;
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

  // DETERMINE % TOTAL PLAYERS FROM EACH TEAM
  function setTeamPercentOwned () {
    for (i = 0; i < TEAMCOUNT; i++) {
      TEAMSOBJECTS[i].players = [];
    }
    for (i = 0; i < TEAMCOUNT; i++) {
      var pitcherCount = 0;
      var hitterCount = 0;
      for (j = 0; j < LINEUPSARRAY.length; j++) {
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.p1.team) {
          pitcherCount++;
        }
        if (TEAMSOBJECTS[i].team == LINEUPSARRAY[j].players.p2.team) {
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
      TEAMSOBJECTS[i].pitcherPercentOwned = 100*pitcherCount/(LINEUPQUANTITY*2);
      TEAMSOBJECTS[i].hitterPercentOwned = 100*hitterCount/(LINEUPQUANTITY*8);
      for (k = 0; k < PLAYERS.length; k++) {
        if (TEAMSOBJECTS[i].team == PLAYERS[k].team && PLAYERS[k].percentOwned > 0) {
          TEAMSOBJECTS[i].players.push({name:PLAYERS[k].name, pos1:PLAYERS[k].pos1, pos2:PLAYERS[k].pos2, percentOwned:PLAYERS[k].percentOwned});
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

  // WILL REMOVE ALL FALSY VALUES: UNDEFINED, NULL, 0, FALSE, NaN AND "" (EMPTY STRING)
  function cleanArray(actual) {
    var newArray = new Array();
    for (var i = 0; i < actual.length; i++) {
      if (actual[i]) {
        newArray.push(actual[i]);
      }
    }
    return newArray;
  }

  // PREPARE CSV
  function prepareCSV () {
    CSVLINEUPS = [];
    if ($('#export-ids').is(':checked')) {
      LINEUPSARRAY.forEach(function (player) {
        var n = {
          p1:player.players.p1.id,
          p2:player.players.p2.id,
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
          p1:player.players.p1.dkname,
          p2:player.players.p2.dkname,
          c:player.players.c.dkname,
          fb:player.players.fb.dkname,
          sb:player.players.sb.dkname,
          tb:player.players.tb.dkname,
          ss:player.players.ss.dkname,
          of1:player.players.of1.dkname,
          of2:player.players.of2.dkname,
          of3:player.players.of3.dkname
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

