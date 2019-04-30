jQuery(document).ready(function ($) {

    // read TSV file
  $.ajax({
    type: "GET",
    url: "data/job_listings.tsv",
    dataType: "text",
    success: function(data) {
      processData(data);
    }
  });

  // Back to top button
  $(window).scroll(function () {
    if ($(this).scrollTop() > 100) {
      $('.back-to-top').fadeIn('slow');
    } else {
      $('.back-to-top').fadeOut('slow');
    }
  });
  $('.back-to-top').click(function () {
    $('html, body').animate({
      scrollTop: 0
    }, 1500, 'easeInOutExpo');
    return false;
  });

  // Stick the header at top on scroll
  $("#header").sticky({
    topSpacing: 0,
    zIndex: '50'
  });

  // Intro background carousel
  $("#intro-carousel").owlCarousel({
    autoplay: true,
    dots: false,
    loop: true,
    animateOut: 'fadeOut',
    items: 1
  });

  // Initiate the wowjs animation library
  new WOW().init();

  // Initiate superfish on nav menu
  $('.nav-menu').superfish({
    animation: {
      opacity: 'show'
    },
    speed: 400
  });

  // Mobile Navigation
  if ($('#nav-menu-container').length) {
    var $mobile_nav = $('#nav-menu-container').clone().prop({
      id: 'mobile-nav'
    });
    $mobile_nav.find('> ul').attr({
      'class': '',
      'id': ''
    });
    $('body').append($mobile_nav);
    $('body').prepend('<button type="button" id="mobile-nav-toggle"><i class="fa fa-bars"></i></button>');
    $('body').append('<div id="mobile-body-overly"></div>');
    $('#mobile-nav').find('.menu-has-children').prepend('<i class="fa fa-chevron-down"></i>');

    $(document).on('click', '.menu-has-children i', function (e) {
      $(this).next().toggleClass('menu-item-active');
      $(this).nextAll('ul').eq(0).slideToggle();
      $(this).toggleClass("fa-chevron-up fa-chevron-down");
    });

    $(document).on('click', '#mobile-nav-toggle', function (e) {
      $('body').toggleClass('mobile-nav-active');
      $('#mobile-nav-toggle i').toggleClass('fa-times fa-bars');
      $('#mobile-body-overly').toggle();
    });

    $(document).click(function (e) {
      var container = $("#mobile-nav, #mobile-nav-toggle");
      if (!container.is(e.target) && container.has(e.target).length === 0) {
        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('#mobile-nav-toggle i').toggleClass('fa-times fa-bars');
          $('#mobile-body-overly').fadeOut();
        }
      }
    });
  } else if ($("#mobile-nav, #mobile-nav-toggle").length) {
    $("#mobile-nav, #mobile-nav-toggle").hide();
  }

  // Smooth scroll for the menu and links with .scrollto classes
  $('.nav-menu a, #mobile-nav a, .scrollto').on('click', function () {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      if (target.length) {
        var top_space = 0;

        if ($('#header').length) {
          top_space = $('#header').outerHeight();

          if (!$('#header').hasClass('header-fixed')) {
            top_space = top_space - 20;
          }
        }

        $('html, body').animate({
          scrollTop: target.offset().top - top_space
        }, 1500, 'easeInOutExpo');

        if ($(this).parents('.nav-menu').length) {
          $('.nav-menu .menu-active').removeClass('menu-active');
          $(this).closest('li').addClass('menu-active');
        }

        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('#mobile-nav-toggle i').toggleClass('fa-times fa-bars');
          $('#mobile-body-overly').fadeOut();
        }
        return false;
      }
    }
  });


  // Porfolio - uses the magnific popup jQuery plugin
  $('.portfolio-popup').magnificPopup({
    type: 'image',
    removalDelay: 300,
    mainClass: 'mfp-fade',
    gallery: {
      enabled: true
    },
    zoom: {
      enabled: true,
      duration: 300,
      easing: 'ease-in-out',
      opener: function (openerElement) {
        return openerElement.is('img') ? openerElement : openerElement.find('img');
      }
    }
  });

  // Testimonials carousel (uses the Owl Carousel library)
  $(".testimonials-carousel").owlCarousel({
    autoplay: true,
    dots: true,
    loop: true,
    responsive: {
      0: {
        items: 1
      },
      768: {
        items: 2
      },
      900: {
        items: 3
      }
    }
  });

  // Clients carousel (uses the Owl Carousel library)
  $(".clients-carousel").owlCarousel({
    autoplay: true,
    dots: true,
    loop: true,
    responsive: {
      0: {
        items: 2
      },
      768: {
        items: 4
      },
      900: {
        items: 6
      }
    }
  });

  function processData(allText) {
    // remove quotes
    allText = allText.replace(/['"]+/g,'');
    var allTextLines = allText.split(/\r\n|\n/);
    HEADERS = allTextLines[0].split('\t');
    MODALDATA = [];
    for (var i = 1; i < allTextLines.length; i++) {
      var data = allTextLines[i].split('\t');
      if (data.length == HEADERS.length) {
        var lineObj = {};
        for (var j = 0; j < HEADERS.length; j++) {
          lineObj[HEADERS[j]] = data[j];
        }
        MODALDATA.push(lineObj);
      }
    }
    getCategories(MODALDATA);
  }

  function getCategories(arr) {
    var categories = [];
    for (var i = 0; i < arr.length; i++) {
      categories.push(arr[i].Category);
    }
    categories = Array.from(new Set(categories));
    categories.sort();
    populateCategories(categories);
  }

  function populateCategories(categories) {
    for (var i = 0; i < categories.length; i++) {
      $('#listings').append('<div class="col-lg-3 col-md-4" data-toggle="modal" data-target="#listingsModal"><div class="portfolio-item wow fadeInUp"><a><div class="portfolio-overlay"><div class="portfolio-info"><h2 class="wow fadeInUp">' + categories[i] + '</h2></div></div></a></div></div>');
    }
  }

  // Populate modal on click
  $('#listingsModal').on('show.bs.modal', function (event) {
    $('.modal-body thead tr').empty();
    $('.modal-body tbody').empty();
    var buttonText = $(event.relatedTarget)[0].innerText; // Text of button that triggered the modal
    var filteredArr = MODALDATA.filter(arrElement => arrElement.Category == buttonText);
    $(this).find('.modal-title')[0].innerHTML = buttonText + ' Job Listings';
    for (var i = 0; i < HEADERS.length; i++) {
      if (HEADERS[i] !== "Category") {
        $('.modal-body thead tr').append('<th scope="col">' + HEADERS[i] + '</th>');
      }
    }
    for (var i = 0; i < filteredArr.length; i++) {
      $('.modal-body tbody').append('<tr><td><a class="btn btn-success" href="mailto:JWeiss@AttorneyRecruiting.net?subject=JSW Job #' + filteredArr[i]['Job Number'] + '&body=I am interested in learning more about job number ' + filteredArr[i]['Job Number'] + '. Can you send me more information?">Inquire</a></td></tr>');
      for (var key in filteredArr[i]) {
        if (key !== "Category") {
          $('.modal-body tbody tr:last-child td:has(a)').before('<td>' + filteredArr[i][key] + '</td>');
        }
      }
    }
  });

});
