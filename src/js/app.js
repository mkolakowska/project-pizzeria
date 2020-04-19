import Product from './components/Product.js';
import Cart from './components/Cart.js';
import { select, settings, classNames } from './settings.js';
import Booking from './components/Booking.js';

const app = {
  initPages: function () {
    const thisApp = this;
    thisApp.pages = Array.from(
      document.querySelector(select.containerOf.pages).children
    );
    console.log(thisApp.pages);
    thisApp.navLinks = Array.from(document.querySelectorAll(select.nav.links));
    thisApp.imageBoxes = Array.from(document.querySelectorAll('.navi a'));

    let pagesMatchingHash = [];
    if (window.location.hash.length > 2) {
      const idFromHash = window.location.hash.replace('#/', '');

      pagesMatchingHash = thisApp.pages.filter(function (page) {
        return page.id == idFromHash;
      });
    }

    thisApp.activatePage(
      pagesMatchingHash.length ? pagesMatchingHash[0].id : thisApp.pages[0].id
    );

    for (let link of thisApp.navLinks) {
      link.addEventListener('click', function (event) {
        const clickedElement = this;
        event.preventDefault();

        /* TODO: get page id from href*/
        const pageId = clickedElement.getAttribute('href');
        const href = pageId.replace('#', '');
        /* TODO activate page*/
        thisApp.activatePage(href);
      });
    }

    for (let box of thisApp.imageBoxes) {
      box.addEventListener('click', function (event) {
        const clickedElement = this;
        event.preventDefault();
        const id = clickedElement.getAttribute('href').replace('#', '');
        thisApp.activatePage(id);
      });
    }
  },

  activatePage: function (pageId) {
    const thisApp = this;

    for (let link of thisApp.navLinks) {
      link.classList.toggle(
        classNames.nav.active,
        link.getAttribute('href') == '#' + pageId
      );
    }
    for (let page of thisApp.pages) {
      page.classList.toggle(
        classNames.nav.active,
        page.getAttribute('id') == pageId
      );
    }
    window.location.hash = '#/' + pageId;
    document.body.classList = pageId;
  },

  initBooking: function () {
    const thisApp = this;

    thisApp.bookingContainer = document.querySelector(
      select.containerOf.booking
    );

    thisApp.booking = new Booking(thisApp.bookingContainer);
  },

  initMenu: function () {
    const thisApp = this;

    for (let productData in thisApp.data.products) {
      new Product(
        thisApp.data.products[productData].id,
        thisApp.data.products[productData]
      );
    }
  },

  initData: function () {
    const thisApp = this;

    thisApp.data = {};

    const url = settings.db.url + '/' + settings.db.product;

    fetch(url)
      .then(function (rawResponse) {
        return rawResponse.json();
      })
      .then(function (parsedResponse) {
        /* save parsedResponse as thisApp.data.products */
        thisApp.data.products = parsedResponse;
        /* execute initMenu method */
        thisApp.initMenu();
      });
  },

  initCart: function () {
    const thisApp = this;

    const cartElem = document.querySelector(select.containerOf.cart);
    thisApp.cart = new Cart(cartElem);

    thisApp.productList = document.querySelector(select.containerOf.menu);

    thisApp.productList.addEventListener('add-to-cart', function (event) {
      app.cart.add(event.detail.product);
    });
  },

  initCarousel: function () {
    /* global Flickity */
    const thisApp = this;
    thisApp.initCarousel = new Flickity('.main-carousel', {
      // options
      //cellAlign: 'right',
      contain: true,
      autoPlay: true,
      prevNextButtons: false,
    });
  },
  /*
  initCarousel: function () {
    const thisApp = this;
    let slideIndex = 0;
    const carouselSlide = document.querySelectorAll(
      '.home-carousel-wrapper .slide'
    );
    console.log(carouselSlide);
    let i;

    for (i = 0; i < carouselSlide.length; i++) {
      carouselSlide[i].style.display = 'none';
      console.log(carouselSlide[i]);
    }
    slideIndex++;
    if (slideIndex > carouselSlide.length) {
      slideIndex = 1;
      console.log(slideIndex);
    }
    carouselSlide[slideIndex - 1].style.display = 'block';
    setTimeout(thisApp.initCarousel, 3000);
    console.log(thisApp.initCarousel);
  },
*/
  init: function () {
    const thisApp = this;
    //// console.log('*** App starting ***');
    //// console.log('thisApp:', thisApp);
    //// console.log('classNames:', classNames);
    //// console.log('settings:', settings);
    //// console.log('templates:', templates);
    thisApp.initPages();
    thisApp.initCart();
    thisApp.initData();
    thisApp.initBooking();
    thisApp.initCarousel();
  },
};
app.init();
