import { select, templates, settings, classNames } from '../settings.js';
import { utils } from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.updateTable();
  }

  getData() {
    const thisBooking = this;

    const startEndDates = {};
    startEndDates[settings.db.dateStartParamKey] = utils.dateToStr(
      thisBooking.datePicker.minDate
    );
    startEndDates[settings.db.dateEndParamKey] = utils.dateToStr(
      thisBooking.datePicker.maxDate
    );

    const endDate = {};
    endDate[settings.db.dateEndParamKey] =
      startEndDates[settings.db.dateEndParamKey];

    const params = {
      booking: utils.queryParams(startEndDates),
      eventsCurrent:
        settings.db.notRepeatParam + '&' + utils.queryParams(startEndDates),
      eventsRepeat: settings.db.repeatParam + '&' + utils.queryParams(endDate),
    };

    //('getData params', params);

    const urls = {
      booking:
        settings.db.url + '/' + settings.db.booking + '?' + params.booking,
      eventsCurrent:
        settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent,
      eventsRepeat:
        settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat,
    };

    //('getData urls', urls);

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function ([
        bookingsResponse,
        eventsCurrentResponse,
        eventsRepeatResponse,
      ]) {
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function ([bookings, eventsCurrent, eventsRepeat]) {
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;

    thisBooking.booked = {};
    //('eventsCurrent', eventsCurrent);

    for (let event of eventsCurrent) {
      //('event from eventsCurrent', event);
      thisBooking.makeBooked(
        event.date,
        event.hour,
        event.duration,
        event.table
      );
    }

    for (let event of bookings) {
      //('event from bookings', event);
      thisBooking.makeBooked(
        event.date,
        event.hour,
        event.duration,
        event.table
      );
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for (let event of eventsRepeat) {
      //('event from eventsRepeat', event);
      if (event.repeat == 'daily') {
        for (
          let eventDate = minDate;
          eventDate <= maxDate;
          eventDate = utils.addDays(eventDate, 1)
        ) {
          thisBooking.makeBooked(
            utils.dateToStr(eventDate),
            event.hour,
            event.duration,
            event.table
          );
        }
      }
    }
    //('thisBooking.booked', thisBooking.booked);
    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;
    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }
    //(thisBooking.booked[date]);

    const bookedHour = utils.hourToNumber(hour);

    for (
      let hourBlock = bookedHour;
      hourBlock < bookedHour + duration;
      hourBlock += 0.5
    ) {
      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
        // //('thisBooking.booked[date][hourBlock]: ', thisBooking.booked[date][hourBlock]);
      }
      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvailable = false;

    if (
      typeof thisBooking.booked[thisBooking.date] == 'undefined' ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] ==
        'undefined'
    ) {
      allAvailable = true;
    }

    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (
        !allAvailable &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ) {
        thisBooking.bookedTable = null;
        table.classList.remove(classNames.booking.tablePicked);
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
        //('table', table);
      }
      thisBooking.rangeSliderColour();
    }
  }

  updateTable() {
    const thisBooking = this;

    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
        console.log(tableId);
      }

      table.addEventListener('click', function () {
        let bookedTable = table.classList.contains(
          classNames.booking.tableBooked
        );
        console.log(bookedTable);
        if (!bookedTable) {
          const activeTable = thisBooking.dom.wrapper.querySelector(
            select.booking.tables + '.picked'
          );
          console.log(activeTable);
          if (activeTable)
            activeTable.classList.remove(classNames.booking.tablePicked);
          table.classList.add(classNames.booking.tablePicked);
          thisBooking.bookedTable = tableId;
        }
      });
    }
  }

  sendBooking() {
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;

    thisBooking.hour = utils.numberToHour(thisBooking.hour);

    const payload = {
      date: thisBooking.date,
      hour: thisBooking.hour,
      table: thisBooking.bookedTable,
      duration: thisBooking.hoursAmount.value,
      ppl: thisBooking.peopleAmount.value,
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
      starters: [],
    };
    /* loop for starters */
    for (let starter of thisBooking.dom.starters) {
      if (starter.checked == true) {
        payload.starters.push(starter.value);
      }
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function (response) {
        return response.json();
      })
      .then(function (parsedResponse) {
        console.log('parsedResponse', parsedResponse);
        thisBooking.makeBooked(
          payload.date,
          payload.hour,
          payload.table,
          payload.duration
        );
      });
  }

  rangeSliderColour() {
    const thisBooking = this;

    const bookedHours = thisBooking.booked[thisBooking.date];
    //(bookedHours);
    const sliderColours = [];
    //(sliderColours);

    thisBooking.dom.rangeSlider = thisBooking.dom.wrapper.querySelector(
      '.rangeSlider'
    );
    //(thisBooking.dom.rangeSlider);
    const slider = thisBooking.dom.rangeSlider;

    for (let bookedHour in bookedHours) {
      const hourInterval = ((bookedHour - 12) * 100) / 12;
      //(hourInterval);
      const minInterval = ((bookedHour - 12 + 0.5) * 100) / 12;
      //(minInterval);
      if (bookedHour < 24) {
        if (bookedHours[bookedHour].length <= 1) {
          sliderColours.push(
            `/*${bookedHour}*/green ${hourInterval}%, green ${minInterval}%`
          );
        } else if (bookedHours[bookedHour].length === 2) {
          sliderColours.push(
            `/*${bookedHour}*/orange ${hourInterval}%, orange ${minInterval}%`
          );
        } else if (bookedHours[bookedHour].length === 3) {
          sliderColours.push(
            `/*${bookedHour}*/red ${hourInterval}%, red ${minInterval}%`
          );
        }
      }
    }
    sliderColours.sort();
    const liveColours = sliderColours.join();
    slider.style.background = `linear-gradient(to right, ${liveColours} )`;
  }

  render(wrapper) {
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper = wrapper;
    thisBooking.generatedDOM = utils.createDOMFromHTML(generatedHTML);
    thisBooking.dom.peopleAmount = thisBooking.generatedDOM.querySelector(
      select.booking.peopleAmount
    );
    thisBooking.dom.hoursAmount = thisBooking.generatedDOM.querySelector(
      select.booking.hoursAmount
    );
    thisBooking.dom.datePicker = thisBooking.generatedDOM.querySelector(
      select.widgets.datePicker.wrapper
    );
    thisBooking.dom.hourPicker = thisBooking.generatedDOM.querySelector(
      select.widgets.hourPicker.wrapper
    );
    thisBooking.dom.tables = thisBooking.generatedDOM.querySelectorAll(
      select.booking.tables
    );
    thisBooking.dom.address = thisBooking.generatedDOM.querySelector(
      select.booking.address
    );
    thisBooking.dom.phone = thisBooking.generatedDOM.querySelector(
      select.booking.phone
    );
    thisBooking.dom.starters = thisBooking.generatedDOM.querySelectorAll(
      select.booking.starter
    );
    thisBooking.dom.wrapper.appendChild(thisBooking.generatedDOM);
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function () {
      thisBooking.updateDOM();
    });
    thisBooking.dom.wrapper.addEventListener('submit', function () {
      event.preventDefault();
      thisBooking.sendBooking();
      thisBooking.getData();
    });
  }
}

export default Booking;
