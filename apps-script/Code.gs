function doPost(e) {
  var result;
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
    var action = data.action;
    if (action === "listEvents") {
      result = listEvents();
    } else if (action === "checkIn") {
      result = checkIn(data);
    } else if (action === "createEvent") {
      result = createEvent(data);
    } else {
      result = { status: "error", message: "Unknown action" };
    }
  } catch (err) {
    result = { status: "error", message: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function listEvents() {
  var ss = SpreadsheetApp.getActive();
  var events = [];
  ss.getSheets().forEach(function (sheet) {
    var name = sheet.getName();
    if (name === "Roster" || name.charAt(0) === "_") {
      return;
    }
    events.push(name);
  });
  return { status: "ok", events: events };
}

function createEvent(data) {
  var name = cleanEventName(data.name);
  if (!name) {
    return { status: "error", message: "Name required" };
  }
  if (name === "Roster" || name.charAt(0) === "_") {
    return { status: "error", message: "Reserved name" };
  }
  var ss = SpreadsheetApp.getActive();
  var existing = ss.getSheetByName(name);
  if (!existing) {
    var sheet = ss.insertSheet(name);
    ensureHeaders(sheet);
  }
  var listed = listEvents();
  return { status: "ok", events: listed.events, created: name };
}

function cleanEventName(raw) {
  var name = String(raw || "").trim();
  name = name.replace(/[:\\/?*\[\]]/g, "");
  if (name.length > 80) {
    name = name.substring(0, 80);
  }
  return name;
}

function checkIn(data) {
  var eventName = data.event;
  var id = String(data.id || "").trim();
  var name = data.name;
  var grade = data.grade;
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(eventName);
  if (!sheet) {
    return { status: "error", message: "Unknown event" };
  }
  ensureHeaders(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === id) {
        return { status: "duplicate" };
      }
    }
  }
  sheet.appendRow([new Date(), name, grade, id]);
  return { status: "ok" };
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "Name", "Grade", "ID"]);
    return;
  }
  var first = sheet.getRange(1, 1, 1, 4).getValues()[0];
  if (!first[0] && !first[1] && !first[2] && !first[3]) {
    sheet.getRange(1, 1, 1, 4).setValues([["Timestamp", "Name", "Grade", "ID"]]);
  }
}
