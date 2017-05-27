var authToken = '';
var getAuthToken = function() {
  chrome.identity.getAuthToken({
    interactive: true
  }, function(token) {
    if (chrome.runtime.lastError) {
      alert(chrome.runtime.lastError.message);
      return;
    }
    console.log(token);
    authToken = token;
  });
};

getAuthToken();

var i18n = function(name) {
  return chrome.i18n.getMessage(name);
};

var fillPageWithData = function(data) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { from: 'background', action: 'fillData', data: data });
    }
  });
};

var fillPageWithTime = function(data) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { from: 'background', action: 'fillTime', data: data });
    }
  });
};

var fillPageWithDept = function() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { from: 'background', action: 'fillDept', data: "A0100" });
    }
  });
}

chrome.webNavigation.onCompleted.addListener(function(details) {
  chrome.pageAction.show(details.tabId);
}, { url: [ { urlPrefix: 'https://ma.mohw.gov.tw/online' } ] });

var interval = null;
var deptInt = null;

function clearInt() {
  if (interval) {
    window.clearInterval(interval);
    interval = null;
    console.log("interval cleared");
  }
}

function clearDeptInt() {
  if (deptInt) {
    window.clearInterval(deptInt);
    deptInt = null;
  }
}

chrome.runtime.onMessage.addListener(function(msg, sender, response) {
  if (msg.from === 'content') {
    console.log(msg);
    if (msg.action === 'fillTime') {
      clearInt();
      interval = window.setInterval(function() {
        console.log("now send time");
        fillPageWithTime(msg.data);
      }, 1000);
    } else if (msg.action === 'clearInt') {
      clearInt();
      if (msg.data.explanation.indexOf('子宮頸抹片') < 0) {
        clearDeptInt();
        deptInt = window.setInterval(function() {
          fillPageWithDept();
        }, 500);
      }
    } else if (msg.action === 'clearDeptInt') {
      clearDeptInt();
    }
  } else if (msg.from === 'popup') {
    if (msg.action === 'getToken') {
      response(authToken);
    } else if (msg.action === 'fillData') {
      fillPageWithData(msg.data);      
      response('ok');
    }
  }
});
