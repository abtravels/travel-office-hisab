/* ==========================================================================
   sastaticket.pk clone — demo interactions
   Pure vanilla JS, no network calls, no booking side effects.
   ========================================================================== */

(function () {
  "use strict";

  var CITIES = [
    { code: "KHI", city: "Karachi", airport: "Jinnah International", country: "Pakistan" },
    { code: "LHE", city: "Lahore", airport: "Allama Iqbal International", country: "Pakistan" },
    { code: "ISB", city: "Islamabad", airport: "Islamabad International", country: "Pakistan" },
    { code: "PEW", city: "Peshawar", airport: "Bacha Khan International", country: "Pakistan" },
    { code: "MUX", city: "Multan", airport: "Multan International", country: "Pakistan" },
    { code: "SKT", city: "Sialkot", airport: "Sialkot International", country: "Pakistan" },
    { code: "FAI", city: "Faisalabad", airport: "Faisalabad International", country: "Pakistan" },
    { code: "QCT", city: "Quetta", airport: "Quetta International", country: "Pakistan" },
    { code: "DXB", city: "Dubai", airport: "Dubai International", country: "UAE" },
    { code: "SHJ", city: "Sharjah", airport: "Sharjah International", country: "UAE" },
    { code: "AUH", city: "Abu Dhabi", airport: "Zayed International", country: "UAE" },
    { code: "DOH", city: "Doha", airport: "Hamad International", country: "Qatar" },
    { code: "JED", city: "Jeddah", airport: "King Abdulaziz International", country: "Saudi Arabia" },
    { code: "MED", city: "Madinah", airport: "Prince Mohammad bin Abdulaziz", country: "Saudi Arabia" },
    { code: "RUH", city: "Riyadh", airport: "King Khalid International", country: "Saudi Arabia" },
    { code: "MCT", city: "Muscat", airport: "Muscat International", country: "Oman" },
    { code: "IST", city: "Istanbul", airport: "Istanbul Airport", country: "Türkiye" },
    { code: "KUL", city: "Kuala Lumpur", airport: "Kuala Lumpur International", country: "Malaysia" },
    { code: "BKK", city: "Bangkok", airport: "Suvarnabhumi", country: "Thailand" },
    { code: "LHR", city: "London", airport: "Heathrow", country: "United Kingdom" },
    { code: "MAN", city: "Manchester", airport: "Manchester", country: "United Kingdom" },
    { code: "JFK", city: "New York", airport: "John F. Kennedy", country: "United States" },
    { code: "YYZ", city: "Toronto", airport: "Pearson International", country: "Canada" },
    { code: "PEK", city: "Beijing", airport: "Capital International", country: "China" },
  ];

  var state = {
    trip: "oneway",
    from: null,
    to: null,
    dep: null,
    ret: null,
    busDate: null,
    pax: { adults: 1, children: 0, infants: 0 },
    cabin: "Economy",
    nonstop: false,
    calTarget: "dep",
    calMonth: startOfMonth(new Date()),
    activeCity: null,
    cityIndex: -1,
  };

  var $ = function (id) { return document.getElementById(id); };
  var PAD = function (n) { return n < 10 ? "0" + n : String(n); };

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function iso(date) {
    return date.getFullYear() + "-" + PAD(date.getMonth() + 1) + "-" + PAD(date.getDate());
  }

  function fromIso(value) {
    var p = value.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function midnight(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function prettyDate(value) {
    if (!value) return "";
    return fromIso(value).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function cityByCode(code) {
    for (var i = 0; i < CITIES.length; i += 1) {
      if (CITIES[i].code === code) return CITIES[i];
    }
    return null;
  }

  function cityLabel(city) {
    return city ? city.city + " (" + city.code + ")" : "";
  }

  /* ---------------------------------------------------------------- Popovers */

  var openPopover = null;

  function closePopover() {
    if (!openPopover) return;
    openPopover.el.hidden = true;
    if (openPopover.trigger) openPopover.trigger.setAttribute("aria-expanded", "false");
    if (openPopover.input) openPopover.input.setAttribute("aria-expanded", "false");
    openPopover = null;
  }

  function showPopover(el, trigger, opts) {
    opts = opts || {};
    if (openPopover && openPopover.el === el) {
      closePopover();
      return;
    }
    closePopover();
    el.hidden = false;
    if (opts.fixed) {
      el.style.position = "fixed";
    }
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    openPopover = { el: el, trigger: opts.trigger || trigger, input: opts.input || null };
  }

  document.addEventListener("click", function (event) {
    if (!openPopover) return;
    if (openPopover.el.contains(event.target)) return;
    if (openPopover.trigger && openPopover.trigger.contains(event.target)) return;
    if (openPopover.input && openPopover.input === event.target) return;
    closePopover();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && openPopover) {
      var restore = openPopover.trigger || openPopover.input;
      closePopover();
      if (restore) restore.focus();
    }
  });

  window.addEventListener("resize", function () {
    if (openPopover && openPopover.el === calPop && calAnchor) positionCalendar(calAnchor);
  });
  window.addEventListener(
    "scroll",
    function () {
      if (openPopover && openPopover.el === calPop && calAnchor) positionCalendar(calAnchor);
    },
    true
  );

  /* ------------------------------------------------------------ Trip switch */

  var tripButtons = document.querySelectorAll(".trip-switch [data-trip]");

  Array.prototype.forEach.call(tripButtons, function (btn) {
    btn.addEventListener("click", function () {
      var trip = btn.getAttribute("data-trip");
      state.trip = trip;
      Array.prototype.forEach.call(tripButtons, function (other) {
        other.setAttribute("aria-pressed", String(other === btn));
      });
      var isReturn = trip === "return";
      var retBtn = $("retBtn");
      retBtn.disabled = !isReturn;
      if (!isReturn) {
        state.ret = null;
        $("retValue").textContent = "Add date";
        $("retValue").setAttribute("data-empty", "true");
      }
      if (trip === "multi") {
        flashNotice(
          "Multi-city demo mein single route tak mehdood he. Return ya one-way se search karein."
        );
      } else {
        hideNotice();
      }
    });
  });

  /* ------------------------------------------------------- Travellers / cabin */

  var paxPop = $("paxPop");
  var paxBtn = $("paxBtn");
  var cabinBtn = $("cabinBtn");

  function openPax() {
    closePopover();
    paxPop.hidden = false;
    paxBtn.setAttribute("aria-expanded", "true");
    cabinBtn.setAttribute("aria-expanded", "true");
    openPopover = { el: paxPop, trigger: paxBtn };
  }

  function togglePax(trigger) {
    if (!paxPop.hidden) {
      closePopover();
      return;
    }
    openPax();
    if (trigger) trigger.setAttribute("aria-expanded", "true");
  }

  paxBtn.addEventListener("click", function () { togglePax(paxBtn); });
  cabinBtn.addEventListener("click", function () { togglePax(cabinBtn); });

  function totalPax() {
    return state.pax.adults + state.pax.children + state.pax.infants;
  }

  function paintPax() {
    var total = totalPax();
    $("paxText").textContent = total + (total === 1 ? " Traveller" : " Travellers");
    $("cabinText").textContent = state.cabin;
    $("outAdults").textContent = state.pax.adults;
    $("outChildren").textContent = state.pax.children;
    $("outInfants").textContent = state.pax.infants;

    var steps = document.querySelectorAll(".stepper [data-step]");
    Array.prototype.forEach.call(steps, function (btn) {
      var key = btn.getAttribute("data-step");
      var dir = Number(btn.getAttribute("data-dir"));
      var value = state.pax[key];
      var blocked =
        (dir < 0 && value <= (key === "adults" ? 1 : 0)) ||
        (dir > 0 && (key === "infants" ? value >= state.pax.adults : value >= 9));
      btn.disabled = blocked;
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".stepper [data-step]"), function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-step");
      var dir = Number(btn.getAttribute("data-dir"));
      var next = state.pax[key] + dir;
      if (key === "adults") {
        next = Math.min(9, Math.max(1, next));
        if (state.pax.infants > next) state.pax.infants = next;
      } else if (key === "infants") {
        next = Math.min(state.pax.adults, Math.max(0, next));
      } else {
        next = Math.min(9, Math.max(0, next));
      }
      state.pax[key] = next;
      paintPax();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".cabin-list [data-cabin]"), function (btn) {
    btn.addEventListener("click", function () {
      state.cabin = btn.getAttribute("data-cabin");
      Array.prototype.forEach.call(document.querySelectorAll(".cabin-list [data-cabin]"), function (other) {
        other.setAttribute("aria-checked", String(other === btn));
      });
      paintPax();
    });
  });

  /* -------------------------------------------------------------- City picker */

  var cityPop = $("cityPop");
  var fromInput = $("fromInput");
  var toInput = $("toInput");
  var fromField = $("fromField");
  var toField = $("toField");

  function matches(city, query) {
    if (!query) return true;
    var q = query.toLowerCase();
    return (
      city.city.toLowerCase().indexOf(q) >= 0 ||
      city.code.toLowerCase().indexOf(q) === 0 ||
      city.airport.toLowerCase().indexOf(q) >= 0 ||
      city.country.toLowerCase().indexOf(q) >= 0
    );
  }

  function renderCities(query) {
    var list = CITIES.filter(function (city) { return matches(city, query); }).slice(0, 8);
    state.cityIndex = list.length ? 0 : -1;

    if (!list.length) {
      cityPop.innerHTML = '<p class="city-empty">Koi city nahi mili. Doosra naam ya code try karein.</p>';
      return;
    }

    cityPop.innerHTML = list
      .map(function (city, index) {
        return (
          '<button type="button" class="city-option' +
          (index === 0 ? " is-active" : "") +
          '" role="option" aria-selected="false" data-code="' +
          city.code +
          '"><span class="code">' +
          city.code +
          "</span><span><strong>" +
          city.city +
          "</strong><small>" +
          city.airport +
          ", " +
          city.country +
          "</small></span></button>"
        );
      })
      .join("");
  }

  function openCities(which, query) {
    state.activeCity = which;
    renderCities(query || "");
    fromField.classList.toggle("is-open", which === "from");
    toField.classList.toggle("is-open", which === "to");
    cityPop.hidden = false;
    var input = which === "from" ? fromInput : toInput;
    input.setAttribute("aria-expanded", "true");
    openPopover = { el: cityPop, trigger: which === "from" ? fromField : toField, input: input };
  }

  function closeCities() {
    cityPop.hidden = true;
    fromField.classList.remove("is-open");
    toField.classList.remove("is-open");
    fromInput.setAttribute("aria-expanded", "false");
    toInput.setAttribute("aria-expanded", "false");
    state.activeCity = null;
  }

  function chooseCity(city) {
    if (!city) return;
    if (state.activeCity === "from") {
      state.from = city.code;
      fromInput.value = cityLabel(city);
    } else {
      state.to = city.code;
      toInput.value = cityLabel(city);
    }
    closeCities();
    closePopover();
    hideNotice();
  }

  function handleCityInput(which, input) {
    input.addEventListener("focus", function () { openCities(which, ""); });
    input.addEventListener("click", function () {
      if (cityPop.hidden || state.activeCity !== which) openCities(which, "");
    });
    input.addEventListener("input", function () {
      if (state.activeCity !== which) openCities(which, input.value);
      else renderCities(input.value);
      input.setAttribute("aria-expanded", "true");
    });
    input.addEventListener("keydown", function (event) {
      var options = cityPop.querySelectorAll(".city-option");
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (cityPop.hidden) openCities(which, input.value);
        options = cityPop.querySelectorAll(".city-option");
        if (!options.length) return;
        state.cityIndex =
          event.key === "ArrowDown"
            ? (state.cityIndex + 1) % options.length
            : (state.cityIndex - 1 + options.length) % options.length;
        Array.prototype.forEach.call(options, function (opt, i) {
          opt.classList.toggle("is-active", i === state.cityIndex);
          opt.setAttribute("aria-selected", String(i === state.cityIndex));
        });
        options[state.cityIndex].scrollIntoView({ block: "nearest" });
      } else if (event.key === "Enter") {
        if (!cityPop.hidden) {
          event.preventDefault();
          var active = cityPop.querySelector(".city-option.is-active") || cityPop.querySelector(".city-option");
          if (active) chooseCity(cityByCode(active.getAttribute("data-code")));
        }
      } else if (event.key === "Escape") {
        closeCities();
      }
    });
  }

  handleCityInput("from", fromInput);
  handleCityInput("to", toInput);

  cityPop.addEventListener("mousedown", function (event) {
    var option = event.target.closest ? event.target.closest(".city-option") : null;
    if (!option) return;
    event.preventDefault();
    chooseCity(cityByCode(option.getAttribute("data-code")));
  });

  cityPop.addEventListener("mousemove", function (event) {
    var option = event.target.closest ? event.target.closest(".city-option") : null;
    if (!option) return;
    cityPop.querySelectorAll(".city-option").forEach(function (opt) {
      opt.classList.toggle("is-active", opt === option);
    });
  });

  $("swapBtn").addEventListener("click", function () {
    var fromCode = state.from;
    var toCode = state.to;
    var fromText = fromInput.value;
    state.from = toCode;
    state.to = fromCode;
    fromInput.value = toInput.value;
    toInput.value = fromText;
    var btn = $("swapBtn");
    btn.classList.toggle("is-swapped");
    hideNotice();
  });

  /* -------------------------------------------------------------- Calendar */

  var calPop = $("calPop");
  var calAnchor = null;

  function minDateFor(target) {
    var today = midnight(new Date());
    if (target === "ret" && state.dep) {
      var dep = fromIso(state.dep);
      return dep > today ? dep : today;
    }
    return today;
  }

  function renderCalendar() {
    var month = state.calMonth;
    var target = state.calTarget;
    var min = minDateFor(target);
    var selected = target === "ret" ? state.ret : target === "bus" ? state.busDate : state.dep;

    var firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    var daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var lead = firstDay.getDay();
    var todayIso = iso(midnight(new Date()));

    var title = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    var html =
      '<div class="cal-head"><strong>' +
      title +
      '</strong><div class="cal-nav">' +
      '<button type="button" data-cal="prev" aria-label="Previous month"><svg width="16" height="16" aria-hidden="true"><use href="#i-chevron-left"/></svg></button>' +
      '<button type="button" data-cal="next" aria-label="Next month"><svg width="16" height="16" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>' +
      "</div></div>";

    var grid = ['<div class="cal-grid" role="grid">'];
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(function (day) {
      grid.push('<span class="dow" aria-hidden="true">' + day + "</span>");
    });
    for (var i = 0; i < lead; i += 1) {
      grid.push('<span class="blank"></span>');
    }
    for (var day = 1; day <= daysInMonth; day += 1) {
      var date = new Date(month.getFullYear(), month.getMonth(), day);
      var value = iso(date);
      var disabled = date < min;
      var classes = ["day"];
      if (value === todayIso) classes.push("is-today");
      if (value === selected) classes.push("is-selected");
      grid.push(
        '<button type="button" class="' +
          classes.join(" ") +
          '" data-day="' +
          value +
          '"' +
          (disabled ? " disabled" : "") +
          ">" +
          day +
          "</button>"
      );
    }
    grid.push("</div>");
    calPop.innerHTML = html + grid.join("");
  }

  function positionCalendar(trigger) {
    var rect = trigger.getBoundingClientRect();
    var margin = 12;
    var width = Math.min(320, window.innerWidth - margin * 2);
    var height = Math.min(346, window.innerHeight - margin * 2);
    var left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
    var top = rect.bottom + 8;
    if (top + height > window.innerHeight - margin) {
      var above = rect.top - height - 8;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin);
    }
    calPop.style.width = width + "px";
    calPop.style.left = left + "px";
    calPop.style.top = top + "px";
  }

  function openCalendar(target, trigger) {
    state.calTarget = target;
    var base = target === "ret" && state.dep ? fromIso(state.dep) : target === "bus" && state.busDate ? fromIso(state.busDate) : new Date();
    var selected = target === "ret" ? state.ret : target === "bus" ? state.busDate : state.dep;
    state.calMonth = startOfMonth(selected ? fromIso(selected) : base);
    renderCalendar();
    calPop.style.position = "fixed";
    calPop.hidden = false;
    calAnchor = trigger;
    positionCalendar(trigger);
    openPopover = { el: calPop, trigger: trigger };
  }

  calPop.addEventListener("click", function (event) {
    var nav = event.target.closest("[data-cal]");
    if (nav) {
      var dir = nav.getAttribute("data-cal") === "next" ? 1 : -1;
      state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() + dir, 1);
      renderCalendar();
      return;
    }
    var day = event.target.closest("[data-day]");
    if (!day || day.disabled) return;
    var value = day.getAttribute("data-day");
    if (state.calTarget === "ret") {
      state.ret = value;
      $("retValue").textContent = prettyDate(value);
      $("retValue").removeAttribute("data-empty");
    } else if (state.calTarget === "bus") {
      state.busDate = value;
      $("busDateValue").textContent = prettyDate(value);
      $("busDateValue").removeAttribute("data-empty");
    } else {
      state.dep = value;
      $("depValue").textContent = prettyDate(value);
      $("depValue").removeAttribute("data-empty");
      if (state.ret && fromIso(state.ret) < fromIso(value)) {
        state.ret = null;
        $("retValue").textContent = "Add date";
        $("retValue").setAttribute("data-empty", "true");
      }
    }
    hideNotice();
    closePopover();
  });

  $("depBtn").addEventListener("click", function () { openCalendar("dep", $("depBtn")); });
  $("retBtn").addEventListener("click", function () {
    if ($("retBtn").disabled) return;
    if (!state.dep) {
      flashNotice("Pehle departure date chunein, phir return date.");
      return;
    }
    openCalendar("ret", $("retBtn"));
  });
  $("busDateBtn").addEventListener("click", function () { openCalendar("bus", $("busDateBtn")); });

  /* ------------------------------------------------------------------ Notice */

  var notice = $("notice");
  var busNotice = $("busNotice");

  function flashNotice(html, target) {
    var box = target === "bus" ? busNotice : notice;
    box.innerHTML = html;
    box.hidden = false;
  }

  function hideNotice() {
    notice.hidden = true;
    notice.innerHTML = "";
    busNotice.hidden = true;
    busNotice.innerHTML = "";
  }

  /* ------------------------------------------------------------------ Search */

  $("nonstop").addEventListener("change", function () {
    state.nonstop = this.checked;
  });

  $("searchBtn").addEventListener("click", function () {
    if (!state.from) {
      flashNotice("Origin select karein — city ka naam ya airport code likhein.");
      fromInput.focus();
      return;
    }
    if (!state.to) {
      flashNotice("Destination select karein.");
      toInput.focus();
      return;
    }
    if (state.from === state.to) {
      flashNotice("Origin aur destination alag hone chahiye.");
      toInput.focus();
      return;
    }
    if (!state.dep) {
      flashNotice("Departure date chunein.");
      $("depBtn").focus();
      return;
    }
    if (state.trip === "return" && !state.ret) {
      flashNotice("Return date chunein ya one-way select karein.");
      $("retBtn").focus();
      return;
    }

    var from = cityByCode(state.from);
    var to = cityByCode(state.to);
    var ret = state.trip === "return" && state.ret ? ", return " + prettyDate(state.ret) : "";
    flashNotice(
      "<svg width='16' height='16' aria-hidden='true' style='flex:0 0 auto;margin-top:1px'><use href='#i-check'/></svg>" +
        "<span><strong>Demo search:</strong> " +
        from.city +
        " → " +
        to.city +
        ", " +
        prettyDate(state.dep) +
        ret +
        " · " +
        totalPax() +
        " traveller" +
        (totalPax() === 1 ? "" : "s") +
        " · " +
        state.cabin +
        (state.nonstop ? " · direct only" : "") +
        ".<br />Yahan se booking nahi hoti. Live PKR fares <a href='../../index.html'>AB Travels app</a> mein dekhein, ya " +
        "<a href='https://www.sastaticket.pk/' target='_blank' rel='noopener'>sastaticket.pk</a> par asli search karein.</span>"
    );
  });

  $("busSearchBtn").addEventListener("click", function () {
    var from = $("busFrom").value.trim();
    var to = $("busTo").value.trim();
    if (!from || !to) {
      flashNotice("Bus departure aur arrival city likhein.", "bus");
      return;
    }
    if (!state.busDate) {
      flashNotice("Travel date chunein.", "bus");
      return;
    }
    flashNotice(
      "<strong>Demo search:</strong> " +
        from +
        " → " +
        to +
        ", " +
        prettyDate(state.busDate) +
        ".<br />Bus booking is clone mein nahi he — asli tickets <a href='https://www.sastaticket.pk/bus-tickets' target='_blank' rel='noopener'>sastaticket.pk/bus-tickets</a> par milte hain.",
      "bus"
    );
  });

  /* ------------------------------------------------------------ Product tabs */

  var panes = { flights: $("pane-flights"), buses: $("pane-buses"), other: $("pane-other") };
  var otherCopy = {
    umrah: {
      title: "Umrah packages",
      body: "Is demo clone mein sirf flights aur buses ka search widget bana he. Umrah packages ka asli page sastaticket.pk par he.",
      href: "https://www.sastaticket.pk/pages/umrah-packages",
    },
    visas: {
      title: "Visa services",
      body: "Visa processing ka clone is demo mein shamil nahi. Asli visa page sastaticket.pk par dekhein.",
      href: "https://www.sastaticket.pk/pages/visa",
    },
    packages: {
      title: "Holiday packages",
      body: "Holiday packages ka clone is demo mein shamil nahi. Asli packages sastaticket.pk par dekhein.",
      href: "https://www.sastaticket.pk/pages/holiday-packages",
    },
  };

  function selectTab(name) {
    var tabs = document.querySelectorAll(".product-tab");
    Array.prototype.forEach.call(tabs, function (tab) {
      var selected = tab.getAttribute("data-pane") === name;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    panes.flights.hidden = name !== "flights";
    panes.buses.hidden = name !== "buses";
    panes.other.hidden = !otherCopy[name];

    if (otherCopy[name]) {
      $("otherTitle").textContent = otherCopy[name].title;
      $("otherBody").textContent = otherCopy[name].body;
      $("otherLink").href = otherCopy[name].href;
      panes.other.setAttribute("aria-labelledby", "tab-" + name);
    }
    closePopover();
    closeCities();
    hideNotice();
  }

  Array.prototype.forEach.call(document.querySelectorAll(".product-tab"), function (tab) {
    tab.addEventListener("click", function () { selectTab(tab.getAttribute("data-pane")); });
    tab.addEventListener("keydown", function (event) {
      var tabs = Array.prototype.slice.call(document.querySelectorAll(".product-tab"));
      var index = tabs.indexOf(tab);
      var next = null;
      if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
      if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (next) {
        event.preventDefault();
        next.focus();
        selectTab(next.getAttribute("data-pane"));
      }
    });
  });

  /* --------------------------------------------------------------- Newsletter */

  $("nlForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var email = $("nlEmail").value.trim();
    var msg = $("nlMsg");
    var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    msg.hidden = false;
    msg.classList.toggle("is-error", !valid);
    if (!valid) {
      msg.textContent = "Sahi email address likhein.";
      $("nlEmail").focus();
      return;
    }
    msg.textContent = "Shukriya! Ye demo he — asli deals ke liye sastaticket.pk par subscribe karein.";
    $("nlForm").reset();
  });

  /* -------------------------------------------------------------- Mobile nav */

  var navToggle = $("navToggle");
  var headerNav = $("headerNav");

  navToggle.addEventListener("click", function () {
    var open = headerNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navToggle.innerHTML = open
      ? '<svg width="22" height="22" aria-hidden="true"><use href="#i-close"/></svg>'
      : '<svg width="22" height="22" aria-hidden="true"><use href="#i-menu"/></svg>';
  });

  headerNav.addEventListener("click", function (event) {
    if (event.target.closest("a") && window.innerWidth <= 900) {
      headerNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ------------------------------------------------------------------- Init */

  paintPax();
  $("depValue").setAttribute("data-empty", "true");
  $("retValue").setAttribute("data-empty", "true");
  closePopover();
})();
