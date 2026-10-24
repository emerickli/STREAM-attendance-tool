(function () {
  var EVENT_KEY = "STREAM_ACTIVE_EVENT";
  var SIGNED_PREFIX = "STREAM_SIGNED_";
  var LOCAL_EVENTS_KEY = "STREAM_LOCAL_EVENTS";
  var NEW_EVENT = "__new__";
  var RESET_MS = 3000;
  var select = document.getElementById("eventSelect");
  var frame = document.getElementById("cameraFrame");
  var overlay = document.getElementById("overlay");
  var overlayTitle = document.getElementById("overlayTitle");
  var overlayDetail = document.getElementById("overlayDetail");
  var retry = document.getElementById("retry");
  var createPanel = document.getElementById("createPanel");
  var createInput = document.getElementById("createEventName");
  var lastEvent = "";
  var scanner = null;
  var scanning = false;
  var locked = false;
  var resetTimer = null;
  var scriptUrl = (window.APP_CONFIG && window.APP_CONFIG.SCRIPT_URL) || "";

  function scriptReady() {
    return Boolean(scriptUrl);
  }

  function api(body) {
    if (!scriptReady()) {
      return mockApi(body);
    }
    return fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json();
    });
  }

  function localEvents() {
    try {
      var stored = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || "[]");
      if (stored.length) {
        return stored;
      }
    } catch (err) {}
    return ["Test Event"];
  }

  function mockApi(body) {
    if (body.action === "listEvents") {
      return Promise.resolve({ status: "ok", events: localEvents() });
    }
    if (body.action === "createEvent") {
      var name = String(body.name || "").trim();
      var events = localEvents();
      if (name && events.indexOf(name) === -1) {
        events.push(name);
        localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
      }
      return Promise.resolve({ status: "ok", events: events, created: name });
    }
    if (body.action === "checkIn") {
      var key = SIGNED_PREFIX + body.event;
      var signed = [];
      try {
        signed = JSON.parse(localStorage.getItem(key) || "[]");
      } catch (err) {
        signed = [];
      }
      if (signed.indexOf(body.id) !== -1) {
        return Promise.resolve({ status: "duplicate" });
      }
      signed.push(body.id);
      localStorage.setItem(key, JSON.stringify(signed));
      return Promise.resolve({ status: "ok" });
    }
    return Promise.resolve({ status: "error" });
  }

  function fillEvents(events, prefer) {
    var saved = prefer || localStorage.getItem(EVENT_KEY) || "";
    select.innerHTML = "";
    var blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Event";
    select.appendChild(blank);
    events.forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    var createOpt = document.createElement("option");
    createOpt.value = NEW_EVENT;
    createOpt.textContent = "New event";
    select.appendChild(createOpt);
    if (saved && events.indexOf(saved) !== -1) {
      select.value = saved;
    }
    lastEvent = select.value;
    if (select.value) {
      startScanner();
    }
  }

  function loadEvents() {
    api({ action: "listEvents" })
      .then(function (data) {
        fillEvents((data && data.events) || []);
      })
      .catch(function () {
        fillEvents([]);
      });
  }

  function normalize(text) {
    return String(text || "")
      .trim()
      .toUpperCase();
  }

  function memberFor(code) {
    return window.MEMBERS && window.MEMBERS[code];
  }

  function showOverlay(kind, title, lines, autoReset) {
    overlay.hidden = false;
    overlay.className = "overlay is-open is-" + kind;
    overlayTitle.textContent = title;
    overlayDetail.innerHTML = "";
    (lines || []).forEach(function (line) {
      var span = document.createElement("span");
      span.textContent = line;
      overlayDetail.appendChild(span);
    });
    if (autoReset) {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(hideOverlayAndResume, RESET_MS);
    }
  }

  function hideOverlay() {
    overlay.className = "overlay";
    overlay.hidden = true;
    overlayTitle.textContent = "";
    overlayDetail.innerHTML = "";
  }

  function hideOverlayAndResume() {
    hideOverlay();
    locked = false;
    startScanner();
  }

  function stopScanner() {
    if (!scanner || !scanning) {
      scanning = false;
      return Promise.resolve();
    }
    scanning = false;
    return scanner.stop().catch(function () {});
  }

  function startScanner() {
    if (!select.value || locked) {
      return;
    }
    if (!scanner) {
      scanner = new Html5Qrcode("reader", { verbose: false });
    }
    if (scanning) {
      return;
    }
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 8 },
        onScan,
        function () {}
      )
      .then(function () {
        scanning = true;
        frame.classList.add("is-on");
      })
      .catch(function () {
        scanning = false;
        frame.classList.remove("is-on");
      });
  }

  function onScan(text) {
    if (locked) {
      return;
    }
    locked = true;
    stopScanner();
    var code = normalize(text);
    var member = memberFor(code);
    if (!member) {
      showOverlay("red", "Identifier not recognized.", [], false);
      return;
    }
    api({
      action: "checkIn",
      event: select.value,
      id: code,
      name: member.name,
      grade: member.grade,
    })
      .then(function (data) {
        if (data && data.status === "duplicate") {
          showOverlay(
            "navy",
            "Already signed in, " + member.name + ".",
            ["Grade: " + member.grade],
            true
          );
          return;
        }
        if (data && data.status === "ok" || !scriptReady()) {
          showOverlay(
            "navy",
            "Welcome back, " + member.name + ".",
            ["Grade: " + member.grade],
            true
          );
          return;
        }
        showOverlay("red", "Could not save. Try again.", [], false);
      })
      .catch(function () {
        if (!scriptReady()) {
          showOverlay(
            "navy",
            "Welcome back, " + member.name + ".",
            ["Grade: " + member.grade],
            true
          );
          return;
        }
        showOverlay("red", "Could not save. Try again.", [], false);
      });
  }

  function openCreatePanel() {
    select.value = lastEvent;
    createPanel.hidden = false;
    createPanel.classList.add("is-open");
    createInput.value = "";
    createInput.focus();
  }

  function closeCreatePanel() {
    createPanel.classList.remove("is-open");
    createPanel.hidden = true;
  }

  function submitNewEvent() {
    var name = createInput.value.trim();
    if (!name) {
      createInput.focus();
      return;
    }
    api({ action: "createEvent", name: name })
      .then(function (data) {
        closeCreatePanel();
        var events = (data && data.events) || [];
        var created = (data && data.created) || name;
        fillEvents(events, created);
        if (created) {
          select.value = created;
          lastEvent = created;
          localStorage.setItem(EVENT_KEY, created);
          startScanner();
        }
      })
      .catch(function () {
        if (!scriptReady()) {
          closeCreatePanel();
          var events = localEvents();
          fillEvents(events, name);
          return;
        }
        closeCreatePanel();
        showOverlay("red", "Could not create that event.", [], false);
      });
  }

  select.addEventListener("change", function () {
    clearTimeout(resetTimer);
    hideOverlay();
    locked = false;
    if (select.value === NEW_EVENT) {
      openCreatePanel();
      return;
    }
    lastEvent = select.value;
    if (select.value) {
      localStorage.setItem(EVENT_KEY, select.value);
      stopScanner().then(startScanner);
    } else {
      localStorage.removeItem(EVENT_KEY);
      stopScanner();
      frame.classList.remove("is-on");
    }
  });

  document.getElementById("createEventSave").addEventListener("click", submitNewEvent);
  document.getElementById("createEventCancel").addEventListener("click", closeCreatePanel);
  createInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      submitNewEvent();
    }
    if (event.key === "Escape") {
      closeCreatePanel();
    }
  });

  retry.addEventListener("click", function () {
    hideOverlayAndResume();
  });

  document.getElementById("debugOk").addEventListener("click", function () {
    onScan("MEMBER_106902");
  });
  document.getElementById("debugBad").addEventListener("click", function () {
    onScan("MEMBER_000000");
  });

  loadEvents();
})();
