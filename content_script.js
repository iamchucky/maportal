// The background page is asking us to get the URL on the page.
var padZero = function(val) {
	return val < 10 ? '0'+val:val;
};

if (window == top) {
  function selectFamilyPhysicianDept() {
    var deptSelect = document.getElementById('ctl00_ContentPlaceHolder1_ddlEVENT_SUPPORT_DEPT');
    if (deptSelect) {
      deptSelect.value = 'A0100';
    } else {
      setTimeout(selectFamilyPhysicianDept, 300);
    }
  }
  
  chrome.runtime.onMessage.addListener(function(msg, sender, response) {
    console.log(msg);
    if (msg.action == 'fillData') {
      document.getElementById('ctl00_ContentPlaceHolder1_txtDOC_ID_NO').value = msg.data.idno;
      document.getElementById('ctl00_ContentPlaceHolder1_txtBAS_AGENCY_ID').value = msg.data.agency;

      document.getElementById('ctl00_ContentPlaceHolder1_btnAddDoc').click();
	  
      function clickSelect() {
        var aElem = document.querySelectorAll('#ctl00_ContentPlaceHolder1_gvDoc a')[1];
        if (aElem) { 
          aElem.click();
          chrome.runtime.sendMessage({ from: 'content', action: 'fillTime', data: msg.data });
        } else {
          window.setTimeout(clickSelect, 1000);
        }
      }

      clickSelect();
    } else if (msg.action == 'fillTime') {
      var timeRad = document.getElementById('ctl00_ContentPlaceHolder1_rdEVENT_TYPE1');
      if (!timeRad) {
        return;
      }
      
      chrome.runtime.sendMessage({ from: 'content', action: 'clearInt', data: msg.data });
      timeRad.checked = true;
	  
      var start = new Date(msg.data.start);
      var timeStartBox = document.getElementById('ctl00_ContentPlaceHolder1_txtEVENT_START1');
      var m = start.getMonth()+1;
      var d = start.getDate();
      var startVal = ''+(start.getFullYear()-1911)+padZero(m)+padZero(d);
      timeStartBox.value = startVal;

      document.getElementById('ctl00_ContentPlaceHolder1_ddlEVENT_START1_H').value = padZero(start.getHours());
      document.getElementById('ctl00_ContentPlaceHolder1_ddlEVENT_START1_M').value = padZero(start.getMinutes());

      var end = new Date(msg.data.end);
      var timeEndBox = document.getElementById('ctl00_ContentPlaceHolder1_txtEVENT_END1');
      var em = end.getMonth()+1;
      var ed = end.getDate();
      var endVal = ''+(end.getFullYear()-1911)+(em < 10?'0'+em:em)+(ed < 10?'0'+ed:ed);
      timeEndBox.value = endVal;

      document.getElementById('ctl00_ContentPlaceHolder1_ddlEVENT_END1_H').value = padZero(end.getHours());
      document.getElementById('ctl00_ContentPlaceHolder1_ddlEVENT_END1_M').value = padZero(end.getMinutes());

      document.getElementById('ctl00_ContentPlaceHolder1_txtITEM_NOTATION').value = msg.data.explanation;
      
      if (msg.data.explanation.indexOf('子宮頸抹片') < 0) {
        selectFamilyPhysicianDept();
      }
      
      // click the add time
      document.getElementById('ctl00_ContentPlaceHolder1_btnADD').click();	  
	  
    } else if (msg.action === 'fillDept') {
      var timeCheckbox = document.getElementById('ctl00_ContentPlaceHolder1_gvPRD_ctl02_chkSelect');
      if (!timeCheckbox) {
        return;
      }
      
      chrome.runtime.sendMessage({ from: 'content', action: 'clearDeptInt', data: 'ok' });
      selectFamilyPhysicianDept();
      
      // click the okay and last page
      // document.getElementById('ctl00_ContentPlaceHolder1_btnConfirm').click();
    }
  });
}
