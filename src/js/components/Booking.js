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
  }

  getData() {
    const thisBooking = this;

    const startDateParam =
      settings.db.dateStartParamKey +
      '=' +
      utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam =
      settings.db.dateEndParamKey +
      '=' +
      utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [startDateParam, endDateParam],
      eventsCurrent: [settings.db.notRepeatParam, startDateParam, endDateParam],
      eventsRepeat: [settings.db.repeatParam, endDateParam],
    };

    // console.log('getData params', params);

    const urls = {
      booking:
        settings.db.url +
        '/' +
        settings.db.booking +
        '?' +
        params.booking.join('&'),
      eventsCurrent:
        settings.db.url +
        '/' +
        settings.db.event +
        '?' +
        params.eventsCurrent.join('&'),
      eventsRepeat:
        settings.db.url +
        '/' +
        settings.db.event +
        '?' +
        params.eventsRepeat.join('&'),
    };

    // console.log('getData urls', urls);

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function (allResponses) {
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function ([bookings, eventsCurrent, eventsRepeat]) {
        // console.log(bookings);
        // console.log(eventsCurrent);
        // console.log(eventsRepeat);
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of bookings) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for (let item of eventsCurrent) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for (let item of eventsRepeat) {
      if (item.repeat == 'daily') {
        for (
          let loopDate = minDate;
          loopDate <= maxDate;
          loopDate = utils.addDays(loopDate, 1)
        ) {
          thisBooking.makeBooked(
            utils.dateToStr(loopDate),
            item.hour,
            item.duration,
            item.table
          );
        }
      }
    }
    // console.log('thisBooking.booked', thisBooking.booked);
    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for (
      let hourBlock = startHour;
      hourBlock < startHour + duration;
      hourBlock += 0.5
    ) {
      // console.log('loop', hourBlock);
      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
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
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
        console.log('table', table);
      }

      table.addEventListener('click', function () {
        console.log('click', table);
        let bookedTable = table.classList.contains(
          classNames.booking.tableBooked
        );
        console.log(bookedTable);
        if (!bookedTable) {
          table.classList.add(classNames.booking.tableBooked);
          thisBooking.bookedTable = tableId;
        }
      });
      thisBooking.rangeSliderColour();
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
      });
  }

  rangeSliderColour() {
    const thisBooking = this;

    const bookedHours = thisBooking.booked[thisBooking.date];
    console.log(bookedHours);
    const sliderColours = [];
    console.log(sliderColours);

    thisBooking.dom.rangeSlider = thisBooking.dom.wrapper.querySelector(
      '.rangeSlider'
    );
    console.log(thisBooking.dom.rangeSlider);
    const slider = thisBooking.dom.rangeSlider;

    for (let bookedHour in bookedHours) {
      const firstOfInterval = ((bookedHour - 12) * 100) / 12;
      console.log(firstOfInterval);
      const secondOfInterval = ((bookedHour - 12 + 0.5) * 100) / 12;
      if (bookedHour < 24) {
        if (bookedHours[bookedHour].length <= 1) {
          sliderColours.push(
            `/*${bookedHour}*/green ${firstOfInterval}%, green ${secondOfInterval}%`
          );
        } else if (bookedHours[bookedHour].length === 2) {
          sliderColours.push(
            `/*${bookedHour}*/orange ${firstOfInterval}%, orange ${secondOfInterval}%`
          );
        } else if (bookedHours[bookedHour].length === 3) {
          sliderColours.push(
            `/*${bookedHour}*/red ${firstOfInterval}%, red ${secondOfInterval}%`
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
    });
  }
}

export default Booking;
