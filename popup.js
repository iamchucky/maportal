function showContent() {
  document.getElementsByTagName('body')[0].style.height = '600px';
  document.getElementById('content').style.display = 'block';
}

window.addEventListener('DOMContentLoaded', function() {
  var content = document.getElementById('content');
  var calSelect = document.getElementById('calendarSelect');
  var actionBtn = document.getElementById('actionBtn');
  var sheetId = '1Xhqec9C6w0vIJfe7w8fWVPrTz-fJrebCPsRTVqG1zgc';
  var dataToFill = [];
  var selectedCalId = '';
  var agencyMap = {};
  var selectedItem = null;

  calSelect.onchange = function(e) {
    var calId = calSelect.selectedOptions[0].value;
    if (!calId) return;
    console.log(calId);
	  selectedCalId = calId;
    getEvents();
  };

  actionBtn.onclick = function() {
    if (!selectedItem) return;
    console.log(selectedItem);
    var agency = selectedItem.description.split('\n')[0].split(' ').join('');
    var explanation = selectedItem.description.split('\n')[1];
    var calId = calSelect.selectedOptions[0].value;

    var data = {
      idno: (calId === 'yangcc88@gmail.com') ? 'A100299035':'F201657574',
      start: selectedItem.start.dateTime,
      end: selectedItem.end.dateTime,
      agency: agencyMap[agency],
      explanation: explanation
    };
    chrome.runtime.sendMessage({ from: 'popup', action: 'fillData', data: data }, function() {
    });
  };

  // addition formatting tokens we want recognized
  var tokenOverrides = {
    t: function(date) { // "a" or "p"
      return moment(date).format('a').charAt(0);
    },
    T: function(date) { // "A" or "P"
      return moment(date).format('A').charAt(0);
    }
  };

  var formatDateWithChunk = function(date, chunk) {
    var token;
    var maybeStr;

    if (typeof chunk === 'string') { // a literal string
      return chunk;
    }
    else if ((token = chunk.token)) { // a token, like "YYYY"
      if (tokenOverrides[token]) {
        return tokenOverrides[token](date); // use our custom token
      }
      return moment(date).format(token);
    }
    else if (chunk.maybe) { // a grouping of other chunks that must be non-zero
      maybeStr = formatDateWithChunks(date, chunk.maybe);
      if (maybeStr.match(/[1-9]/)) {
        return maybeStr;
      }
    }

    return '';
  }

  var formatDateWithChunks = function(date, chunks) {
    var s = '';
    var i;

    for (i=0; i<chunks.length; i++) {
      s += formatDateWithChunk(date, chunks[i]);
    }

    return s;
  }

  // Break the formatting string into an array of chunks
  var chunkFormatString = function(formatStr) {
    var chunks = [];
    var chunker = /\[([^\]]*)\]|\(([^\)]*)\)|(LTS|LT|(\w)\4*o?)|([^\w\[\(]+)/g; // TODO: more descrimination
    var match;

    while ((match = chunker.exec(formatStr))) {
      if (match[1]) { // a literal string inside [ ... ]
        chunks.push(match[1]);
      }
      else if (match[2]) { // non-zero formatting inside ( ... )
        chunks.push({ maybe: chunkFormatString(match[2]) });
      }
      else if (match[3]) { // a formatting token
        chunks.push({ token: match[3] });
      }
      else if (match[5]) { // an unenclosed literal string
        chunks.push(match[5]);
      }
    }

    return chunks;
  }

  var similarUnitMap = {
    Y: 'year',
    M: 'month',
    D: 'day', // day of month
    d: 'day', // day of week
    // prevents a separator between anything time-related...
    A: 'second', // AM/PM
    a: 'second', // am/pm
    T: 'second', // A/P
    t: 'second', // a/p
    H: 'second', // hour (24)
    h: 'second', // hour (12)
    m: 'second', // minute
    s: 'second' // second
  };

  // Given a formatting chunk, and given that both dates are similar in the regard the
  // formatting chunk is concerned, format date1 against `chunk`. Otherwise, return `false`.
  var formatSimilarChunk = function(date1, date2, chunk) {
    var token;
    var unit;

    if (typeof chunk === 'string') { // a literal string
      return chunk;
    }
    else if ((token = chunk.token)) {
      unit = similarUnitMap[token.charAt(0)];
      // are the dates the same for this unit of measurement?
      if (unit && date1.isSame(date2, unit)) {
        return moment(date1).format(token); // would be the same if we used `date2`
        // BTW, don't support custom tokens
      }
    }

    return false; // the chunk is NOT the same for the two dates
    // BTW, don't support splitting on non-zero areas
  ;}

  var formatRangeWithChunks = function(date1, date2, chunks, separator) {
    var chunkStr; // the rendering of the chunk
    var leftI;
    var leftStr = '';
    var rightI;
    var rightStr = '';
    var middleI;
    var middleStr1 = '';
    var middleStr2 = '';
    var middleStr = '';

    // Start at the leftmost side of the formatting string and continue until you hit a token
    // that is not the same between dates.
    for (leftI=0; leftI<chunks.length; leftI++) {
      chunkStr = formatSimilarChunk(date1, date2, chunks[leftI]);
      if (chunkStr === false) {
        break;
      }
      leftStr += chunkStr;
    }

    // Similarly, start at the rightmost side of the formatting string and move left
    for (rightI=chunks.length-1; rightI>leftI; rightI--) {
      chunkStr = formatSimilarChunk(date1, date2, chunks[rightI]);
      if (chunkStr === false) {
        break;
      }
      rightStr = chunkStr + rightStr;
    }

    // The area in the middle is different for both of the dates.
    // Collect them distinctly so we can jam them together later.
    for (middleI=leftI; middleI<=rightI; middleI++) {
      middleStr1 += formatDateWithChunk(date1, chunks[middleI]);
      middleStr2 += formatDateWithChunk(date2, chunks[middleI]);
    }

    if (middleStr1 || middleStr2) {
      middleStr = middleStr1 + separator + middleStr2;
    }

    return leftStr + middleStr + rightStr;
  };

  var formatRange = function(date1, date2, formatStr, separator) {
    var localeData;
    
    date1 = moment(date1);
    date2 = moment(date2);

    localeData = (date1.localeData || date1.lang).call(date1);

    // Expand localized format strings, like "LL" -> "MMMM D YYYY"
    formatStr = localeData.longDateFormat(formatStr) || formatStr;
    separator = separator || ' - ';
    return formatRangeWithChunks(date1, date2, chunkFormatString(formatStr), separator);
  };

  var xhrWithAuth = function(method, url, callback, jsonData) {
    var access_token;
    var retry = true;


    var getToken = function() {
      chrome.runtime.sendMessage({ from: 'popup', action: 'getToken' }, function(token) {
        access_token = token;
        requestStart();
      });
    };
    getToken();

    var requestStart = function() {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url);
	  if (method == 'PUT' || method == 'POST') {
		xhr.setRequestHeader('Content-type', 'application/json');
	  }
      xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
      xhr.onload = requestComplete;
      if (method == 'PUT' || method == 'POST') {
		xhr.send(JSON.stringify(jsonData));
	  } else {
        xhr.send();
	  }
    };

    var requestComplete = function() {
      if (this.status == 401 && retry) {
        retry = false;
        chrome.runtime.sendMessage({ from: 'popup', action: 'removeCachedAuthToken', token: access_token }, function() {
          getToken();
        });
      } else {
        callback(null, this.status, this.response);
      }
    };
  };

  var getEvents = function() {
    var now = new Date();
    var yesterday = new Date(now - 24*3600000);
    xhrWithAuth('GET',
        'https://www.googleapis.com/calendar/v3/calendars/'+selectedCalId+'/events?singleEvents=true&timeMin='+encodeURIComponent(yesterday.toJSON()),
        onEventFetched);
  };
  
  var changeEventName = function(event, name, callback) {
	event.summary = name;
    xhrWithAuth('PUT',
		'https://www.googleapis.com/calendar/v3/calendars/'+selectedCalId+'/events/'+event.id,
		callback, event);
  };

  var onEventFetched = function(err, status, response) {
    if (!err && status == 200) {
      var res = JSON.parse(response);
      console.log('events loaded', res);
      dataToFill = res.items.sort((a, b) => {
        return +(new Date(a.start.dateTime)) - (+(new Date(b.start.dateTime)));
      });
      selectedItem = null;
      populateContent(res.items);
      showContent();
    } else {
      console.log(err);
      console.log(status);
    }
  };

  var populateContent = function(events) {
    var htmlStr = '';
    for (var i = 0; i < events.length; ++i) {
      var r = events[i];
      var range = formatRange(r.start.dateTime, r.end.dateTime, 'YYYY/M/D h(:mm) A');
      var agency = '';
      var explanation = '';
      if (r.description) {
        agency = r.description.split('\n')[0].split(' ').join('');
        explanation = r.description.split('\n')[1];
      }
      var errStr = '';
      if (!explanation || !agency) {
        errStr = '<div>格式錯誤</div>';
      }
      if (!agencyMap[agency]) {
        errStr += '<div>找不到指定的支援機關</div>';
      }
      const title = r.summary || '';
      const alreadyDone = title.indexOf('！') == 0;
      const alreadyDoneBtnClass = alreadyDone ? 'success' : 'secondary';
      const alreadyDoneBtnText = alreadyDone ? '已送審' : '未送審';
      htmlStr += `
        <div class="card">
          <div class="card-block">
            <div class="d-flex w-100 justify-content-between">
              <div class="radio">
                <label>
                  <input type="radio" name="radOptions" value="${i}">
                  ${r.summary}
                </label>
              </div>
              <button type="button" data-ind="${i}"
                      class="alreadyDoneLabel btn btn-sm btn-${alreadyDoneBtnClass}">
                ${alreadyDoneBtnText}
              </button>
            </div>
            <div class="err">${errStr}</div>
          </div>
          <div class="card-footer">
            <small>${range}</small>
          </div>
        </div>`;
    }
    if (htmlStr) {
      content.innerHTML = `
        <form name="radForm">
          ${htmlStr}
        </form>`;
	    var elems = document.querySelectorAll('.alreadyDoneLabel');
      for (var i = 0; i < elems.length; ++i) {
        var elem = elems[i];
        elem.addEventListener('click', function(e) {
          if (e.target && e.target.dataset && e.target.dataset.ind) {
          var ind = parseInt(e.target.dataset.ind);
          var r = dataToFill[ind];
          var alreadyDone = (r.summary.indexOf('！') == 0);
          var newSummary = r.summary;
          if (alreadyDone) {
            newSummary = newSummary.substr(1);
          } else {
            newSummary = '！'+newSummary;
          }
          changeEventName(r, newSummary, function(err, status, response) {
            setTimeout(getEvents, 500);
          });
          }
        });
      }
    } else {
      content.innerHTML = '';
    }
  };

  var populateCalSelect = function(cals) {
    console.log('calendars loaded', cals);
    var htmlStr = '<option value="" disabled>請選擇行事曆</option>';
    for (var i = 0; i < cals.length; ++i) {
      var r = cals[i];
      htmlStr += '<option value="'+r.id+'">'+r.summary+'</option>';
    }
    calSelect.innerHTML = htmlStr;
    calSelect.selectedIndex = 0;
  };

  var onCalendarFetched = function(err, status, response) {
    if (!err && status == 200) {
      var res = JSON.parse(response);
      populateCalSelect(res.items);
    } else {
      console.log(err);
      console.log(status);
    }
  };

  var getCalendars = function() {
    xhrWithAuth('GET',
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=owner',
        onCalendarFetched);
  };
  
  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyBTmtRrJ6sHRZ-UGYq8YME43e32w0edPIo",
    authDomain: "glassy-life-94012.firebaseapp.com",
    databaseURL: "https://glassy-life-94012.firebaseio.com",
    projectId: "glassy-life-94012",
    storageBucket: "glassy-life-94012.appspot.com",
    messagingSenderId: "704710532239"
  };
  firebase.initializeApp(config);
  firebase.auth().signInAnonymously()
    .then(() => {
       var db = firebase.database();
      var rootRef = db.ref();
      rootRef.once('value').then(snapshot => {
        agencyMap = snapshot.val();
        console.log('agencyMap loaded', agencyMap);
        getCalendars();
      });
    })
    .catch(error => {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // ...
    });
 
  document.addEventListener('change', function() {
    if (document.radForm) {
      var ind = parseInt(document.radForm.radOptions.value);
      selectedItem = dataToFill[ind];
    }

  }, false);

});
