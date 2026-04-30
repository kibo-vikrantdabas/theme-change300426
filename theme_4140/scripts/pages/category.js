define(['modules/jquery-mozu', "modules/views-collections", "vendor/slick-carousel/slick/slick", "underscore", "hyprlive", 'hyprlivecontext',
'modules/editable-view','modules/analytics/checkout-gtm', 'modules/analytics/carouselEvent'], 
    function ($, CollectionViewFactory , slick, _, Hypr,HyprLiveContext, EditableView,CheckoutGTM, carouselEvent) {
    
    var setBannersPos = function() {
        var bannersEl = Array.of($("#mz-bannersPLPContainer").children());
        if(!_.isEmpty(bannersEl)) {
            bannersEl.forEach(function(item) {$(item).appendTo(".mz-productlist-list.mz-plpBanners");});
        }
    };

    var scrollGTMEvent = function() {
        $(".afg-ms-category-masterhead .foundit button").on("click", function(){
            var side = $(this).hasClass('slick-prev') ? 'scroll:left' : 'scroll:right';
            carouselEvent.carouselArrowEvent('modules', 'scroll', side);
        });
    };

    var LThreeCategoryEvent = function() {
        var pageContext = require.mozuData("pagecontext"),
            eventData = {
            'event':'eventTracker',
            'custom_event':	'navigation',
            'event_params':	{
                'event_act': '',
                'event_lbl':''	
            }
        };
        $(".porduct-listing-page .afg-ms-category-top-container .foundit .foundit__item .foundit__link").on("click", function(){
            eventData.event_params.event_act = pageContext.title.toLowerCase().concat(":",  $(this).text().toLowerCase());
            eventData.event_params.event_lbl = $(this).text().toLowerCase();
            window.globalEventBus.emit('dataLayerEvent', eventData);
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
        var section = 1;
        $(".featured-image-container, #mz-drop-zone-explore-image .mz-cms-image").closest(".mz-cms-row").each(function(index, item){
          $(this).addClass('parent');
            $(this).attr("data-section", section);
            section++;
          $('[class*=mz-cms-col]').addClass('child');
        });
      
        $("#page-content .category-main-img").closest(".afg-ms-category-masterhead").each(function(index, item){
          $(this).addClass('parent');
            $(this).attr("data-section", section);
            //alert($(this).find('img').attr('alt'));
            section++;
          $('[class*=category-main]').addClass('child');
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
          $("#page-content .featured-image-container, #page-content #mz-drop-zone-explore-image .mz-cms-image, #page-content .category-main-img").each(function(index,item){// if target element exists in DOM
      
              $(item).on("click", function(){
                eventDataClick.ecommerce.promotion_name = $(item).find('.featured-text > p').text().toLowerCase() || $(item).find('.mz-content-widget-inner-wrap > h2').text().toLowerCase() || $(item).find('img').attr('alt') || '';
                eventDataClick.ecommerce.creative_slot = pageContext_title.concat("s",$(this).closest(".parent").attr("data-section") + "_po" + $(this).closest(".child").index());
                eventDataClick.ecommerce.promotion_id = '';
                eventDataClick.ecommerce.creative_name = (($(item).find('.featured-text.at-top > .home-buttons > .feature-image-link').text().toLowerCase() || $(item).find('.featured-text.at-bottom > .feature-image-link').text().toLowerCase() || $(item).find('.mz-content-widget-inner-wrap  a > button.btn-shop-now').text().toLowerCase() || pageContext.title.toLowerCase() || '') + "_" + ($(item).find('.featured-text > p').text().toLowerCase() || ($(item).find('.mz-content-widget-inner-wrap > h2').text().toLowerCase()) || $(item).find('img').attr('alt') ||  pageContext.title.toLowerCase() || ''));

                window.globalEventBus.emit('dataLayerEvent', eventDataClick);
              });
              if (checkVisible($(item))) {
                  
                  eventDataView = {
                  'event':'view_promotion',
                //   'custom_event':	'view_promotion',
                  'ecommerce':	{
                      'promotion_name': '',
                      'creative_slot':'',
                      'promotion_id':'',
                      'creative_name':''
                  }
                  };
      
                  eventDataClick = {
                      'event':'click_promotion',
                    //   'custom_event':	'click_promotion',
                      'ecommerce':	{
                          'promotion_name': '',
                          'creative_slot':'',
                          'promotion_id':'',
                          'creative_name':''
                      }
                      };
      
                  $(this).addClass("onscren"); // add class   
                  eventDataView.ecommerce.promotion_name = $(item).find('.featured-text > p').text().toLowerCase() || $(item).find('.mz-content-widget-inner-wrap > h2').text().toLowerCase() || $(item).find('img').attr('alt') || '';
                  eventDataView.ecommerce.creative_slot = pageContext_title.concat("s",$(this).closest(".parent").attr("data-section") + "_po" + $(this).closest(".child").index());
                  eventDataView.ecommerce.promotion_id = '';
                  eventDataView.ecommerce.creative_name = (($(item).find('.featured-text.at-top > .home-buttons > .feature-image-link').text().toLowerCase() || $(item).find('.featured-text.at-bottom > .feature-image-link').text().toLowerCase() || $(item).find('.mz-content-widget-inner-wrap  a > button.btn-shop-now').text().toLowerCase() || pageContext.title.toLowerCase() || '') + "_" + ($(item).find('.featured-text > p').text().toLowerCase() || ($(item).find('.mz-content-widget-inner-wrap > h2').text().toLowerCase()) || $(item).find('img').attr('alt') ||  pageContext.title.toLowerCase() || ''));
      
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
          $("#page-content .featured-image-container, #page-content #mz-drop-zone-explore-image .mz-cms-image, #page-content .category-main-img").each(function(index,item){// if target element exists in DOM
              if (checkVisible($(item))) {
                  $(item).addClass("onscren"); // add class
                  if (!$(item).hasClass("visited1")) {
                      promotionBannerObject();
                      $(item).addClass("visited1"); 
                      return true; 
                  }
              }
          });
        });
        setBannersPos();

        window.facetingViews = CollectionViewFactory.createFacetedCollectionViews({
            $body: $('[data-mz-category]'),
            template: "category-interior",
            Hypr:Hypr
        });
        // CLP - "JUMPER OF JOY" Widget
        function jumperLayout(){
            if($(".clp-jumper-container .mz-cms-row > div:first-child").length === 0){
                $(".clp-jumper-container").hide();
            }
            if($(".clp-product-carousel .mz-cms-row > div:first-child").length === 0){
                $(".clp-product-carousel").hide();
            }
            if($(".lunar-buttons-section .mz-cms-row > div:first-child").length === 0){
                $(".lunar-buttons-section").hide();
            }
            
            if (!$('.clp-jumper-container .mz-cms-row').hasClass("mz-editing")) {
                $(".clp-jumper-container .mz-cms-row > div:first-child").each(function() {
                    $(this).find('.mz-cms-block').slice(0, 2).wrapAll("<div class='jumper-left'></div>");
                    $(this).find('.mz-cms-block').slice(2, 4).wrapAll("<div class='jumper-right'></div>");
                    if($('.clp-jumper-container .mz-layout-widget-header').length){
                        $('.clp-jumper-container .mz-layout-widget-header').remove();
                    }
                });
             }
        }
        var l3catList = $('.foundit__banner');
        function getInitialSlide() {
           // var initalSlide = 0;
           var totalItem = $(".foundit__banner").find(".foundit__item").length;

           var arr=[];
            $('.foundit__item').each(function(index, element) {
                arr.push($(element));
            });
 
           if(totalItem % 2 !== 0){// odd
                //  initalSlide--;
                var lItem =Math.floor(arr.length/2);
                var rItem =Math.ceil(arr.length/2);
                var fArray=arr.slice(0,lItem); 
                var sArray=arr.slice(lItem, arr.length);
                    var fPart=calWidth(fArray);
                    var sPart=calWidth(sArray);
                    
                if(fPart>sPart){
                    midEle= lItem-1; 
                }else{  
                     midEle= lItem;
                }
                return midEle

           }else{
            //even
            var mid=arr.length/2;
                    var fArray=arr.slice(0,mid);
                var fPart =calWidth(fArray);
                    var sArray=arr.slice(mid,arr.length);
                var sPart = calWidth(sArray);
                mid=arr.length/2;
                if(fPart>sPart){

                    midEle= mid-1 
                }else{  

                     midEle= mid //first elemnet in last half
                }
                return midEle;
           }
       }
       function calWidth(arr){
        var width=0;
       
        for(var i=0;i<arr.length;i++){
            width=width+arr[i].outerWidth(true);
        }
        return width;
       }


       function checkSlickStatus(){
        var l3catListWidth = 0;
        $('.foundit__item').each(function() {
            l3catListWidth += $(this).outerWidth( true );
        });
        var sliderWidth = $('.foundit__banner').innerWidth();
            return (l3catListWidth > sliderWidth ? true : false)
       }


       var catListLength = $('.foundit__item').length;
        var currentSlide = getInitialSlide();
        var init = {
            dots: false,
            arrows:checkSlickStatus(),
            // infinite:  $(".foundit__banner").find(".foundit__item").length > 5 ? true : false,
            infinite: false,
            speed: 300,
            slidesToShow: checkSlickStatus()?catListLength -1 : 5,
            slidesToScroll: 4,
            variableWidth: true,
            mobileFirst: true,
            centerMode: true,
            initialSlide:currentSlide
        };
   
        
        function createCatagoriesSlick() {
            var slider = $(".foundit__banner");
            if($(window).width() > 990) {
                if(checkSlickStatus())
                slider.not('.slick-initialized').slick(init);
            }
        }
        $(window).on('resize orientationchange', function() {
            if($(window).width() > 990) {
                if(checkSlickStatus())
                l3catList.not(".slick-initialized").slick(init);
            } else {
                if(l3catList.hasClass('slick-initialized'))
                l3catList.slick("unslick");
            }
        });
        // PLP L3 Description
        if($('.category-desc').length > 0){
            var temp = $('.category-desc').text();
        }
        function plpDesc(){
            if($(window).width() < 768){
                var catdesc = $('.category-desc').text();
                var descLength = catdesc.length;
                if(descLength > 0){
                    $('.category-desc').hide();
                    $('.showmore').show();
                }
                $('.showmore').on('click', function(){
                    $(this).hide();
                    $('.showless').show();
                    $('.category-desc').show();
                });
                $('.showless').on('click', function(){
                    $(this).hide();
                    $('.showmore').show();
                    $('.category-desc').hide();
                });
            } else {
                $('.showless').hide();
                $('.showmore').hide();
                $('.category-desc').show();
            }
        }
        function clp(){
            if($(".mainCategories").children().length > 10) {
                if($(window).width() > 900 && $(window).width() < 1024) {
                    $(".mainCategories").slick({
                    dots: false,
                    infinite: false,
                    slidesToShow: 8,
                    slidesToScroll: 8,
                    arrows: false,
                    });
                }
            }
            if($(".mainCategories").children().length <= 5) {
                $(".mainCategories").addClass("maincatWrapper");
            }  else if($(".mainCategories").children().length > 5 && $(".mainCategories").children().length <= 7) {
                $(".mainCategories").addClass("maincatPotrait");
            } else if($(".mainCategories").children().length > 7 && $(".mainCategories").children().length <= 8) {
                $(".mainCategories").addClass("maincatpromode");
            } else if($(".mainCategories").children().length > 8 && $(".mainCategories").children().length <= 9) {
                $(".mainCategories").addClass("maincatlandscape");
            }
              // adding offer carousal
    if (!$("#mz-drop-zone-home-offers > .mz-cms-row").hasClass("mz-editing")) {
        if($(window).width() > 992 ){
            var nextArrow = '<button class="slide-arrow next-arrow"></button>';
            var prevArrow = '<button class="slide-arrow prev-arrow"></button>';
            var isArabicLanguageSite = false;
            if(Hypr.getThemeSetting('isArabicLanguageSite')) {
                isArabicLanguageSite = true;
                nextArrow = '<button class="slide-arrow prev-arrow"></button>';
                prevArrow = '<button class="slide-arrow next-arrow"></button>';
            }
            $("#mz-drop-zone-home-offers > .mz-cms-row").slick({
          dots: false,
          speed: 300,
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
    }
      }
  
      // end offer carousel
            //carousel in womens page
           function partnerSlider(){
            if($(window).width() > 992 ){
                var nextArrow = '<button class="slide-arrow next-arrow"></button>';
                var prevArrow = '<button class="slide-arrow prev-arrow"></button>';
                var isArabicLanguageSite = false;
                if(Hypr.getThemeSetting('isArabicLanguageSite')) {
                    isArabicLanguageSite = true;
                    nextArrow = '<button class="slide-arrow prev-arrow"></button>';
                    prevArrow = '<button class="slide-arrow next-arrow"></button>';
                }
            $('.partners-carousel').slick({
                dots: true,
                rtl:isArabicLanguageSite,
              speed: 300,
              infinite:false,
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
                    arrows:false,
                    prevArrow:null,
                    nextArrow:null
                  }
                },
                {
                  breakpoint: 768,
                  settings: {
                    slidesToShow: 2.3,
                    slidesToScroll: 2,
                    dots: false,
                    arrows:false,
                    prevArrow:null,
                    nextArrow:null
                  }
                },
                {
                  breakpoint: 480,
                  settings: {
                    slidesToShow: 2.3,
                    slidesToScroll: 2,
                    dots: false,
                    arrows:false,
                    prevArrow:null,
                    nextArrow:null
                  }
                }
                // You can unslick at a given breakpoint now by adding:
                // settings: "unslick"
                // instead of a settings object
              ]
              });
           }
           $(".partners-carousel").removeClass("parent-slideslick");
        }
          var car = setTimeout(partnerSlider, 2000);
            //carousel in mens page
            $(".clp-product-carousel .mz-productlist-list").slick({
                dots: true,
                infinite: false,
                slidesToShow: 4,
                slidesToScroll: 4,
                arrows: true,
                responsive: [
                    {
                        breakpoint: 1024,
                        settings: {
                            slidesToShow: 4,
                            slidesToScroll: 1
                        }
                    },
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 3.2,
                            slidesToScroll: 1,
                            arrows: false,
                            dots: false
                        }
                    },
                    {
                        breakpoint: 480,
                        settings: {
                            slidesToShow: 2.2,
                            slidesToScroll: 1,
                            arrows: false,
                            dots: false
                        }
                    }
              ]
            });
        }
        jumperLayout();
        createCatagoriesSlick();
        clp();
        plpDesc();
        // $(window).resize(function() {
        //     plpDesc();
        // });

       $('.mz-four-column svg g').attr('stroke', '#000000');
        $('.mz-three-column').on('click', function(){
            if(_.isNull(localStorage.getItem('column-active'))){
                localStorage.setItem('column-active', 'three-column');
            }
            else{
                localStorage.removeItem('column-active');
                localStorage.setItem('column-active', 'three-column');
            }
            if ($(".mz-productlist-list").hasClass("four-column")) $(".mz-productlist-list").removeClass("four-column");
            $(".mz-productlist-list").addClass("three-column");
           $('.mz-three-column svg g').attr('stroke', '#000000');
           $('.mz-four-column svg g').attr('stroke', '#999999');
            if($('.mz-three-column').hasClass("active")){
                $('.mz-three-column').addClass("active");
                $('.mz-four-column').removeClass("active");
            }else{
                $('.mz-three-column').addClass("active");
                $('.mz-four-column').removeClass("active");
            }
        });
        $('.mz-four-column').on('click', function(){
            if(_.isNull(localStorage.getItem('column-active'))){
                localStorage.setItem('column-active', 'four-column');
            }
            else{
                localStorage.removeItem('column-active');
                localStorage.setItem('column-active', 'four-column');
            }
            if ($(".mz-productlist-list").hasClass("three-column")) $(".mz-productlist-list").removeClass("three-column");
            $(".mz-productlist-list").addClass("four-column");
           $('.mz-four-column svg g').attr('stroke', '#000000');
           $('.mz-three-column svg g').attr('stroke', '#999999');
            if($('.mz-four-column').hasClass("active")){
                $('.mz-four-column').addClass("active");
                $('.mz-three-column').removeClass("active");
            }else{
                $('.mz-four-column').addClass("active");
                $('.mz-three-column').removeClass("active");
            }
        });

        //code for more+ click
        $('.shop-by-brand-para a').on('click', function(e){  
            window.globalEventBus.emit('dataLayerEvent',{'eventCategory':'category navigation','eventLabel': $(this).text()});
        });

        // Functions for loading more Items on clicking on Load More Button
        $('.templink').on('click', function(e){  
            var finalURL;
            var pageSize = $(e.currentTarget).attr('data-mz-value');
            var tempURL = window.location.href;
            if(tempURL.indexOf("?") > 0){
                finalURL = tempURL.split("?")[0]  + '?pageSize='+ parseInt(pageSize);
            }else{
                finalURL = tempURL + '?pageSize='+ parseInt(pageSize);
            }
            $(e.currentTarget).attr("href", finalURL);   
        });
      
        // var totalImageWidgets = document.getElementsByClassName(
        //     "featured-link-wrapper"
        //   );
        //   $(".featured-link-wrapper").on("click", function (e) {
        //     for (var property in totalImageWidgets) {
        //       if (totalImageWidgets[property] && totalImageWidgets[property].nextElementSibling && (totalImageWidgets[property].nextElementSibling.children[0].innerText === this.nextElementSibling.children[0].innerText)) {
        //         CheckoutGTM.promotionImpressionAndClick(this,"category","1",'internal promotion clicks',property);
        //       }
        //     }
        //   });
        //   try {
        //     if (totalImageWidgets.length > 0 && totalImageWidgets[0].nextElementSibling) {
        //       CheckoutGTM.promotionImpressionAndClick(totalImageWidgets,"category","0");
        //     }
        //   } catch (error) {
        //     console.log("Error occured in fetching widgets");
        //   }

            $(document).on('click','.show-extra-text',function(){
                $('.extra-text').css('display','inline');
                $('.extra-text-dots').css('display','inline');
                $('.remove-extra-text').css('display','block');
                $(this).css('display','none');
            });
            $(document).on('click','.remove-extra-text',function(){
                $('.extra-text').css('display','none');
                $('.extra-text-dots').css('display','none');
                $('.show-extra-text').css('display','block');
                $(this).css('display','none');
            });

        function setDefaultFirstLink(){
            var finalURL;
            var pageSize = $('.templink').attr('data-mz-value');
            var tempURL = window.location.href;
            if(tempURL.indexOf("?") > 0){
                finalURL = tempURL.split("?")[0]  + '?pageSize='+ parseInt(pageSize);
            }else{
                finalURL = tempURL + '?pageSize='+ parseInt(pageSize);
            }
            $('.templink').attr("href", finalURL);
        }
        setDefaultFirstLink();

        $(".mz-category-men .explore-image.widget-spacer").insertBefore(".mz-category-men .explore-heading");
        
        scrollGTMEvent();
        LThreeCategoryEvent();
        promotionBannerObject();
    });
});