require([
  "modules/jquery-mozu",
  "vendor/slick-carousel/slick/slick",
  "modules/analytics/checkout-gtm",
  "hyprlive",
  'modules/analytics/carouselEvent'
], function ($, slick, CheckoutGTM, Hypr, carouselEvent) {

  var scrollGTMEvent = function() {
    $(".afg-ms-homeCarousel button.slide-arrow").on("click", function(){
        var act = $(".slick-list .slick-slide.slick-current.slick-active .featured-text.at-top > p").text(),
        label = $(this).hasClass('prev-arrow') ? 'scroll:left' : 'scroll:right';
        carouselEvent.carouselArrowEvent('carousel banner', act, label);
    });
  };

  var carouselDotEvent = function() {
    var minimalValue = 1, label = '' ;
    $(".afg-ms-homeCarousel .slick-dots button").on('click', function(){
        var currentValue = Number($(this).text()),
        act = $(".slick-list .slick-slide .featured-text.at-top > p").eq(currentValue).text();
            if(currentValue > minimalValue) {
                 minimalValue = currentValue;
                 label = 'right';
            }
            if(currentValue < minimalValue) {
                minimalValue = currentValue;
                label = 'left';
            }
            if((currentValue ==  minimalValue) && (currentValue == 1 )) {
                minimalValue = currentValue;
                label = 'left';
            }
            carouselEvent.carouselArrowEvent('carousel banner', act, label);
    });
  };

  $(document).ready(function () {
    function checkVisible( elm, mode ) {
      mode = mode || "object visible";
      var viewportHeight = $(window).height(), // Viewport Height
          scrolltop = $(window).scrollTop(), // Scroll Top
          y = $(elm).offset().top,
          elementHeight = $(elm).height();   
      
      if (mode == "object visible") return ((y < (viewportHeight + scrolltop)) && (y > (scrolltop - elementHeight)));
      if (mode == "above") return ((y < (viewportHeight + scrolltop)));
  }
  
    function updateImagePathoNLoad() {
      try{
      var finImageMainToSplit = $(".intro-jaeger-img").find(".mz-cms-image-cover").css("background-image").split("?")[0];
      $(".intro-jaeger-img").find(".mz-cms-image-cover").css("background-image",'url("'+finImageMainToSplit.split('url("')[1]+'")');
      }
      catch(e){
        console.log(e);
      }
    }
    updateImagePathoNLoad(); // Remove pixalted image
   
  var section = 1;
  $(".featured-image-container, .mz-cms-image-maintain").closest(".mz-cms-row").each(function(index, item){
    $(this).addClass('parent');
      $(this).attr("data-section", section);
      section++;
    $('[class*=mz-cms-col]').addClass('child');
  });
  var promotionBannerObject = function() {
     // var pageContext = require.mozuData("pagecontext");
    // var pageTitle = pageContext.title ? pageContext.title.toLowerCase() : '';
    // var pageContext_title = pageTitle;
    var pageContext = require.mozuData("pagecontext");
    var pageTitle = pageContext.title ? pageContext.title.toLowerCase() : '';
    var pageContext_title = pageTitle;
    if (pageContext_title === '') {
      pageContext_title = pageTitle;
    } else {
      pageContext_title = pageTitle + "_";
    }
    $("#page-content .featured-image-container,#page-content .intro-jaeger-wrapper").each(function(index,item){// if target element exists in DOM
      $(item).on("click", function(){
        eventDataClick.event_params.promotion_name = $(item).find('.featured-text > p').text().toLowerCase() || $(item).find('.mz-content-widget-inner-wrap > h2').text().toLowerCase() || $(item).find('img').attr('alt') || '';
        // eventDataClick.event_params.creative_slot = pageContext_title.concat("_s",$(this).closest(".parent").attr("data-section") + "_po" + $(this).closest(".child").index());
        if ($(this).parents().closest('div.slick-slide.slick-active').length !== 0 ) {
          eventDataClick.ecommerce.creative_slot = pageContext_title.concat("s",$(this).closest(".parent").attr("data-section") + "_po" +  $(this).parents().closest('div.slick-slide').attr("data-slick-index"));
        } else {
          eventDataClick.ecommerce.creative_slot = pageContext_title.concat("s",$(this).closest(".parent").attr("data-section") + "_po" +  $(this).closest(".child").index());
        }
        eventDataClick.ecommerce.promotion_id = '';
        eventDataClick.ecommerce.creative_name = (($(item).find('.featured-text.at-top > .home-buttons > .feature-image-link').text().toLowerCase() || $(item).find('.featured-text.at-bottom > .feature-image-link').text().toLowerCase() || $(item).find('.mz-content-widget-inner-wrap  a > button.btn-shop-now').text().toLowerCase() || pageContext.title.toLowerCase() || '') + "_" + ($(item).find('.featured-text > p').text().toLowerCase() || ($(item).find('.mz-content-widget-inner-wrap > h2').text().toLowerCase()) || $(item).find('img').attr('alt') ||  pageContext.title.toLowerCase() || ''));
        window.globalEventBus.emit('dataLayerEvent', eventDataClick);
    });
      if (checkVisible($(item))) {
            eventDataView = {
              'event':'view_promotion',
              // 'custom_event':	'view_promotion',
              'ecommerce':	{
                'promotion_name': '',
                'creative_slot':'',
                'promotion_id':'',
                'creative_name':''
            }
            };
            eventDataClick = {
              'event':'click_promotion',
              // 'custom_event':	'click_promotion',
              'ecommerce':	{
                  'promotion_name': '',
                  'creative_slot':'',
                  'promotion_id':'',
                  'creative_name':''
              }
              };
            $(this).addClass("onscren"); // add class   
            
            eventDataView.ecommerce.promotion_name = $(item).find('.featured-text > p').text().toLowerCase() || $(item).find('.mz-content-widget-inner-wrap > h2').text().toLowerCase();
             // eventDataView.event_params.creative_slot = pageContext_title.concat("_s",$(this).closest(".parent").attr("data-section") + "_po" + $(this).closest(".child").index());
             if ($(this).parents().closest('div.slick-slide').length !== 0 ) {
              eventDataView.ecommerce.creative_slot = pageContext_title.concat("s",$(this).closest(".parent").attr("data-section") + "_po" +  $(this).parents().closest('div.slick-slide').attr("data-slick-index"));
            } else {
              eventDataView.ecommerce.creative_slot = pageContext_title.concat("s",$(this).closest(".parent").attr("data-section") + "_po" +  $(this).closest(".child").index());
            }
            eventDataView.ecommerce.promotion_id = '';
            eventDataView.ecommerce.creative_name = (($(item).find('.featured-text.at-top > .home-buttons > .feature-image-link').text().toLowerCase() || $(item).find('.featured-text.at-bottom > .feature-image-link').text().toLowerCase() || $(item).find('.mz-content-widget-inner-wrap  a > button.btn-shop-now').text().toLowerCase()) + "_" + ($(item).find('.featured-text > p').text().toLowerCase() || ($(item).find('.mz-content-widget-inner-wrap > h2').text().toLowerCase()) ));
            
            if (!$(item).hasClass("visited1")) {
                window.globalEventBus.emit('dataLayerEvent', eventDataView);
                $(item).addClass("visited1"); // add class  
                return true;  
            }
        } else {
            $(item).removeClass("onscren"); // remove class
            return true;
        }
    });
  };
  $(window).scroll(function () {
    $("#page-content .featured-image-container,#page-content .intro-jaeger-wrapper").each(function(index,item){// if target element exists in DOM
        if (checkVisible($(item))) {
          $(item).addClass("onscren_scroll_function"); // add class
            if (!$(item).hasClass("visited1")) {
                promotionBannerObject();
                $(item).addClass("visited1"); 
                return true; 
            }
        } 
    });
  });

    
    var time = 10;
    var resizeTimer;
    var initialSize = $(window).width();
    var $bar, $slick, isPause, tick, percentTime;
    var isArabicLanguageSite = Hypr.getThemeSetting('isArabicLanguageSite')?true:false;
    $slick = $(".homeCarousel .mz-cms-row > div:first-child");
    var nextArrow, prevArrow;
    if($(window).width() > 992 ){
       nextArrow = '<button class="slide-arrow next-arrow"></button>';
       prevArrow = '<button class="slide-arrow prev-arrow"></button>';
      isArabicLanguageSite = false;
      if(Hypr.getThemeSetting('isArabicLanguageSite')) {
          isArabicLanguageSite = true;
          nextArrow = '<button class="slide-arrow prev-arrow"></button>';
          prevArrow = '<button class="slide-arrow next-arrow"></button>';
      }
    $(".partners-carousel").slick({
      dots: true,
      rtl:isArabicLanguageSite,
      speed: 300,
      infinite: false,
      nextArrow: nextArrow,
      prevArrow: prevArrow,
      slidesToShow: 6,
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 3,
            infinite: false,
            dots: false,
            arrows: false,
            prevArrow: null,
            nextArrow: null,
          },
        },
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 2.1,
            infinite: false,
            slidesToScroll: 2,
            dots: false,
            arrows: false,
            prevArrow: null,
            nextArrow: null,
          },
        },
        {
          breakpoint: 480,
          settings: {
            slidesToShow: 2.1,
            infinite: false,
            slidesToScroll: 2,
            dots: false,
            arrows: false,
            prevArrow: null,
            nextArrow: null,
          },
        },
        // You can unslick at a given breakpoint now by adding:
        // settings: "unslick"
        // instead of a settings object
      ],
    });
    $(".partners-carousel").removeClass("parent-slideslick");
  }
    // adding offer carousal
    if (!$("#mz-drop-zone-home-offers > .mz-cms-row").hasClass("mz-editing")) {
      if($(window).width() > 992 ){
        nextArrow = '<button class="slide-arrow next-arrow"></button>';
        prevArrow = '<button class="slide-arrow prev-arrow"></button>';
        isArabicLanguageSite = false;
        if(Hypr.getThemeSetting('isArabicLanguageSite')) {
            isArabicLanguageSite = true;
            nextArrow = '<button class="slide-arrow prev-arrow"></button>';
            prevArrow = '<button class="slide-arrow next-arrow"></button>';
        }
      $("#mz-drop-zone-home-offers > .mz-cms-row").slick({
        dots: false,
        speed: 500,
        infinite: false,
        rtl: isArabicLanguageSite,
        nextArrow: nextArrow,
        prevArrow: prevArrow,
        slidesToShow: 5,
        responsive: [
          {
            breakpoint: 1024,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3,
              infinite: false,
              dots: false,
              arrows: false,
              prevArrow: null,
              nextArrow: null,
            },
          },
          {
            breakpoint: 768,
            settings: {
              slidesToShow: 2.1,
              slidesToScroll: 3,
              arrows: false,
              prevArrow: null,
              nextArrow: null,
            },
          },
          {
            breakpoint: 480,
            settings: {
              slidesToShow: 2.1,
              slidesToScroll: 3,
              infinite: false,
              dots: false,
              arrows: false,
              prevArrow: null,
              nextArrow: null,
            },
          },
          // You can unslick at a given breakpoint now by adding:
          // settings: "unslick"
          // instead of a settings object
        ],
      });
    }
  }

    // end offer carousel
    $(".autumn-container .feature-image-link").wrapInner(
      "<span class='autumn-text'></span>"
    );
    function topPicks() {
      if ($(window).width() > 992) {
        $(".top-picks-wrapper .mz-cms-row > div:first-child").each(function () {
          $(this)
            .find(".mz-cms-block")
            .slice(0, 1)
            .wrapAll("<div class='top-picks-first'></div>");
          $(this)
            .find(".mz-cms-block")
            .slice(1, 4)
            .wrapAll("<div class='top-picks-second'></div>");
          $(this)
            .find(".mz-cms-block")
            .slice(4, 8)
            .wrapAll("<div class='top-picks-third'></div>");
        });
        $(".top-picks-second, .top-picks-third").wrapAll(
          '<div class="right-col"></div>'
        );
      }
    }
    if (!$(".top-picks-wrapper .mz-cms-row").hasClass("mz-editing")) {
      topPicks();
    }
    $(window).resize(function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var delayedSize = $(window).width();
        // if we resize the page but we don't cross the 650 threshold, do nothing
        if (
          (initialSize > 769 && delayedSize > 769) ||
          (initialSize < 769 && delayedSize < 769)
        ) {
          return;
        }
        // else if we resize the page and cross the 650 threshold, do something
        else {
          if (delayedSize <= 769) {
            $(".top-picks-second, .top-picks-third").unwrap(".right-col");
            $(".top-picks-wrapper .mz-cms-row > div:first-child").each(
              function () {
                $(this)
                  .find(".mz-cms-block")
                  .slice(0, 1)
                  .unwrap(".top-picks-first");
                $(this)
                  .find(".mz-cms-block")
                  .slice(1, 4)
                  .unwrap(".top-picks-second");
                $(this)
                  .find(".mz-cms-block")
                  .slice(4, 8)
                  .unwrap(".top-picks-third");
              }
            );
          } else if (delayedSize > 769) {
            $(".top-picks-wrapper .mz-cms-row > div:first-child").each(
              function () {
                $(this)
                  .find(".mz-cms-block")
                  .slice(0, 1)
                  .wrapAll("<div class='top-picks-first'></div>");
                $(this)
                  .find(".mz-cms-block")
                  .slice(1, 4)
                  .wrapAll("<div class='top-picks-second'></div>");
                $(this)
                  .find(".mz-cms-block")
                  .slice(4, 8)
                  .wrapAll("<div class='top-picks-third'></div>");
              }
            );

            $(".top-picks-second, .top-picks-third").wrapAll(
              '<div class="right-col"></div>'
            );
          }
        }

        initialSize = delayedSize;
      }, 250);
    });

    //home carousel

    var currentIndex = -1;
    var ePanes = $(".homeCarousel .mz-cms-row .mz-cms-block"),
      timer = 6000,
      bar = $(".progress_bar");

    function showPane(index) {
      // hide current pane
      ePanes.eq(currentIndex).stop(true, true).fadeOut();
      // set current index : check in panes collection length
      currentIndex = index;
      if (currentIndex < 0) currentIndex = ePanes.length - 1;
      else if (currentIndex >= ePanes.length) currentIndex = 0;
      // display pane
      ePanes.eq(currentIndex).stop(true, true).fadeIn();
      // menu selection
      $(".dots li").removeClass("active").eq(currentIndex).addClass("active");
    }
    // bind ul links
    // bind previous & next links
    $(".previous").click(function () {
      var eventAction = $(this)
        .parents(".featured-image")
        .find(".featured-text p")
        .text();
      gtmForCarousel("left", eventAction);
      showPane(currentIndex - 1);
      bar.hide();
      bar.stop();
    });
    $(".next").click(function () {
      showPane(currentIndex + 1);
      bar.hide();
      bar.stop();
    });
    var xDown = null;
    var yDown = null;
    $(".featured-image-container").on("touchstart", function (evt) {
      var getTouches = evt.touches || evt.originalEvent.touches;
      const firstTouch = getTouches[0];
      xDown = firstTouch.clientX;
      yDown = firstTouch.clientY;
    });
    $(".featured-image-container").on("touchmove", function (evt) {
      if (!xDown || !yDown) {
        return;
      }
      var getTouches = evt.touches || evt.originalEvent.touches;
      var xUp = getTouches[0].clientX;
      var yUp = getTouches[0].clientY;

      var xDiff = xDown - xUp;
      var yDiff = yDown - yUp;

      if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 0) {
          showPane(currentIndex + 1);
          bar.hide();
          bar.stop();
        } else {
          var eventAction = $(this)
            .find(".featured-image")
            .find(".featured-text p")
            .text();
          gtmForCarousel("left", eventAction);
          showPane(currentIndex - 1);
          bar.hide();
          bar.stop();
        }
      }
    });
    // $('.gtmNext').click(function(){
    //   var eventAction = $(this).parents(".featured-image").find(".featured-text p").text();
    //   gtmForCarousel("right", eventAction);
    // });
    $(".prev-arrow").click(function () {
      var eventCategory = "modules";
      var eventAction = $(this)
        .parents(".mz-content-widget-inner-wrap")
        .find("h2")
        .text();
      gtmForCarousel("left", eventAction, eventCategory);
    });
    $(".next-arrow").click(function () {
      var eventCategory = "modules";
      var eventAction = $(this)
        .parents(".mz-content-widget-inner-wrap")
        .find("h2")
        .text();
      gtmForCarousel("right", eventAction, eventCategory);
    });
    
    function gtmForCarousel(side, eventAction, eventCategory) {
      var carouselData = {
        custom_event: eventCategory ? eventCategory.toLowerCase() : "carousel banner",
        event_params:{
          event_act: eventAction ? eventAction.toLowerCase() : "logo click",
          event_lbl: "scroll : " + side,
        }
       
      };
      if (window.globalEventBus) {
        window.globalEventBus.emit("dataLayerEvent", carouselData);
      }
    }

    function run() {
      bar.width(0);
      showPane(currentIndex + 1);
      var windowwidth = $(".homeCarousel").width();
      bar.animate({ width: "+=" + windowwidth }, timer, run);
    }
    $(".dots").html(
      $("<ul/>", { class: "selection" }).html(
        $.map(Array(ePanes.length), function (o, i) {
          i++; // because array indices run from 0
          return $("<li/>").text(i);
        }) // map
      ) // <select/>
    );
    $(".dots ul li:first-child").addClass("active");

    // $(document).find('.dots li').click(function(ev){    showPane($(this).index());});
    run();

    $(document)
      .find(".dots li")
      .click(function (ev) {
        var bannerIndex = "index " + ev.currentTarget.outerText;
        var bannerName = $(".homeCarousel .mz-cms-block").css(
          "display",
          "block"
        )[ev.currentTarget.outerText - 1].innerText;
        if (window.globalEventBus) {
          // carousel banner’,
          gtmForCarousel(bannerIndex, bannerName);
        }
        showPane($(this).index());
        bar.hide();
        bar.stop();
      });

    if ($(".mainCategories").children().length <= 5) {
      $(".mainCategories").addClass("maincatWrapper");
    } else if (
      $(".mainCategories").children().length > 5 &&
      $(".mainCategories").children().length <= 7
    ) {
      $(".mainCategories").addClass("maincatPotrait");
    } else if (
      $(".mainCategories").children().length > 7 &&
      $(".mainCategories").children().length <= 9
    ) {
      $(".mainCategories").addClass("maincatlandscape");
    }

    // Adding Quick Link bar bottom border dynamically to fix issue MSM-1356
    function addQuickLinkBottomBorder() {
      var data = $("#mz-drop-zone-quickLinksCheck").children().length;
      if (data > 0) {
        $(".mz-promo-bar").css({ borderBottom: "1px solid #ccc" });
      }
    }
    addQuickLinkBottomBorder();

    // var totalImageWidgets = document.getElementsByClassName(
    //   "featured-link-wrapper"
    // );
    // $(".featured-link-wrapper").on("click", function (e) {
    //   for (var property in totalImageWidgets) {
    //     if (
    //       totalImageWidgets[property] &&
    //       totalImageWidgets[property].nextElementSibling &&
    //       totalImageWidgets[property].nextElementSibling.children[0]
    //         .innerText === this.nextElementSibling.children[0].innerText
    //     ) {
    //       CheckoutGTM.promotionImpressionAndClick(
    //         this,
    //         "home",
    //         "1",
    //         "internal promotion clicks",
    //         property
    //       );
    //     }
    //   }
    // });
    // try {
    //   if (
    //     totalImageWidgets.length > 0 &&
    //     totalImageWidgets[0].nextElementSibling
    //   ) {
    //     CheckoutGTM.promotionImpressionAndClick(totalImageWidgets, "home", "0");
    //   }
    // } catch (error) {
    //   console.log("Error occured in fetching widgets");
    // }

    $(".slick-dots").click(function () {
      var indexValue = "index " + $(this).find(".slick-active").text();
      var module = $(this)
        .parents(".mz-content-widget-inner-wrap")
        .find("h2")
        .text()
        .toLowerCase();
      var logoEventData = {
        eventCategory: "modules",
        eventAction: module,
        eventLabel: "scroll : " + indexValue,
      };
      if (window.globalEventBus) {
        window.globalEventBus.emit("dataLayerEvent", logoEventData);
      }
    });

   //New Design Homepage Banner
   $('.afg-ms-masterhead-home').css({ display: "block" });
   $('.afg-ms-masterhead-home #mz-drop-zone-masterhead-homeCarousel .mz-cms-row .mz-cms-col-12-12').not('.mz-editing').slick({
        dots: true,
        arrows: true,
        infinite: true,
        slidesToShow: 1,
        autoplay: true,
        autoplaySpeed: 5000,
        prevArrow: '<button class="slide-arrow prev-arrow"></button>',
        nextArrow: '<button class="slide-arrow next-arrow"></button>',
        responsive: [
          {
            breakpoint: 992,
            settings: {
              arrows: false
            }
          }
        ]
      });

      scrollGTMEvent();
      carouselDotEvent();
      promotionBannerObject();
      
  });
});
