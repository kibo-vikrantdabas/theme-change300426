/**
 * Unidirectional dispatch-driven collection views, for your pleasure.
 */
define([
    'backbone',
    'underscore',
    "modules/api",
    'modules/url-dispatcher',
    'modules/intent-emitter',
    'modules/get-partial-view',
    'modules/jquery-mozu'
], function (Backbone, _, api, UrlDispatcher, IntentEmitter, getPartialView, $) {

    function factory(conf) {
        var _$body = conf.$body;
        var _dispatcher = UrlDispatcher;
        var ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND';
        var initialSize = $(window).width();
        var prefix = "facetValueFilter=";
        var displayMobileFilter = false;
        var stopScrollTopEvent = false;
        var finalUrl;
        var urlArray = [];
        var catUrl = $('.mz-facetingform-clearall').attr('data-mz-url');
        var pageContext = require.mozuData('pagecontext') ? require.mozuData('pagecontext') : '';
        var scrollevent;
        var _nextStartIndex = 0;
        var _totalCount = 0;
        var _pageSize = 12;
        var _isLoadingMore = false;
        var Hypr = conf.Hypr;
        function setBannersPos() {
            var bannersEl = Array.of($("#mz-bannersPLPContainer").children());
            if(!_.isEmpty(bannersEl)) {
                bannersEl.forEach(function(item) {$(item).appendTo(".mz-productlist-list.mz-plpBanners");});
            }
        }

        function productImpression() {
            if (scrollevent){
                window.addEventListener('scroll', function() {
                    if(pageContext.pageType == 'category' || pageContext.pageType == 'search'){
                        var plpItems = window.plpProductData ? window.plpProductData : [];
                        var pageTitle = pageContext.cmsContext.template.path ? pageContext.cmsContext.template.path.toLowerCase() : '';
                        var category = getCategory();
                        var itemCategory1 = category.item_category1;
                        var itemCategory2 = category.item_category2;
                        var position = 0;
                        if(pageContext.pageType == 'search'){
                            itemCategory1 = itemCategory2 = 'search';
                        }
                    
                        var impressionsModel = {
                            event: 'view_item_list',
                            ecommerce: {
                                items: []
                            },
                        };
    
                        const options = {
                            root: null,
                            threshold: 0.2
                        };
                        var observer = new IntersectionObserver(function(entries, observer) { 
                            entries.forEach(function(entry) {
                                if(entry.isIntersecting){
                                    $(entry.target).addClass('active');
                                    position = position+1;
                                    var productId = entry.target.getAttribute("data-mz-product");
                                    var productName,
                                    productPrice;
                                    if(plpItems && plpItems.length > 0){
                                        var currentProductObject = plpItems.find(function(value, index) {
                                            position = index+1;
                                            return value.productCode == productId;
                                        });
                                        
                                        productName = currentProductObject.productName;
                                        productPrice = currentProductObject.price;
                                    } else {
                                        productName = entry.target.childNodes[0].getAttribute("data-mz-productname");
                                        productPrice = entry.target.childNodes[0].getAttribute("data-mz-price");              
                                    }
                                    var element = document.querySelector('[data-mz-product="'+ productId +'"]');
                                    if(!element.hasAttribute('data-visited')) {
                                        element.setAttribute('data-visited', true);
                                        var itemData = {
                                            'id': productId,
                                            'item_name': productName.toLowerCase(),
                                            'affiliation': "online store",
                                            'coupon': "",
                                            'currency': getCurrencyCode(),
                                            'discount': "",
                                            'index': position,
                                            'item_category': itemCategory1 ? itemCategory1.toLowerCase() : "",
                                            'item_category2': itemCategory2 ? itemCategory2.toLowerCase() : "",
                                            'item_list_id': pageTitle ? pageTitle.toLowerCase() : "",
                                            'item_list_name': pageTitle ? pageTitle.toLowerCase() : "",
                                            'price': productPrice,
                                            'item_variant': "",
                                            'quantity': 1
                                        };
                                        if(itemData.item_category2 == "") {
                                            itemData.item_category2 = itemData.item_category;
                                        }
                                        impressionsModel.ecommerce.items.push(itemData);
                                    }
                                            
                                    observer.unobserve(entry.target);
                                }
                            }); 
    
                            if(impressionsModel.ecommerce.items && impressionsModel.ecommerce.items.length){
                                try {
                                    getEnglishProducts(impressionsModel);
                                    //fetchAndPushToWindowGTM(impressionsModel);
                                } 
                                catch (error) {
                                    console.log("Exception occure in data push in GTM for dataLayerEvent", error);
                                }
                            }       
                        },options);
    
                        var elements = document.querySelectorAll('.mz-productlist-item');
                        _.forEach(elements, function (product) {
                            observer.observe(product);
                        });
                    } 
                });
            }
        }

        function getCurrencyCode(){
            return require.mozuData('apicontext').headers['x-vol-currency'] ? require.mozuData('apicontext').headers['x-vol-currency'] : 'AED';
        }

        function getCategory() {
            var category =  document.getElementsByClassName('mz-breadcrumbs')[0] ? document.getElementsByClassName('mz-breadcrumbs')[0].innerText.replaceAll("/",">").toLowerCase() : '';
            return {
                item_category1: category  ? ( category.split(">")[1] ?  category.split(">")[1].trim() : '' ) : '',
                item_category2: category  ? ( category.split(">")[2] ?  category.split(">")[2].trim() : '' ) : '', 
                item_category3: category  ? ( category.split(">")[3] ?  category.split(">")[3].trim() : '' ) : '', 
            };
        }

        function fetchAndPushToWindowGTM(localData) {
            try {
                var data = [];
                var gtmLocalStoreData = JSON.parse(sessionStorage.getItem('gtmevents'));
                if (gtmLocalStoreData && gtmLocalStoreData.length > 0 && gtmLocalStoreData !== undefined && !_.isEmpty(gtmLocalStoreData)) {
                    data = gtmLocalStoreData;
                }
                data.push(localData);
                sessionStorage.setItem('gtmevents', JSON.stringify(data));
                // window.dataLayer = data;
                window.dataLayer.push(localData);
    
            } catch (error) {
                console.error("Exception occured in stroing data in window.");
            }
        }


        function updateUi(response) {
            var url = response.canonicalUrl;
            _$body.html(response.body);            
            if (_$body.html(response.body)) {
                setBannersPos();                
                searchFilter();
                showHideFilter();
                showFilterList(false);
                mobileFilter();
                GridLayoutSwitching();
                if(displayMobileFilter) {
                    displayMobileFilter = false;
                    $('.filter-facets-container').addClass('show d-block');
                    $('body').addClass('overflow-hidden');
                    $('html').addClass('overflow-hidden');
                    $('.mz-future-date-header').addClass('hidden');
                    $(".afg-ms-filter-sidebar .mobile-filter-loader-section").hide();
                }
                if ($(window).width() > 500) {
                    if(stopScrollTopEvent) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
                
            }
            if (url) _dispatcher.replace(url);

            if (window.myStoreView) {
                window.myStoreView.init();
            }
            _$body.removeClass('mz-loading');
            initInfiniteScroll();
        }
        (function ensureCanonicalOnLoad() {
          try {
             var u = new URL(window.location.href);
             u.search = ''; u.hash = '';
             var link = document.querySelector('link[rel="canonical"]');
           if (!link) {
              link = document.createElement('link');
              link.setAttribute('rel', 'canonical');
              document.head.appendChild(link);
              }
             link.setAttribute('href', u.href);
            } catch (_) {}
        })();
        
        function showHideFilter() {
            $('.accordion-content').hide();
            $(".accordion-toggle").off('click');
            $('.accordion-toggle').on('click', function (e) {
                $('.accordion-toggle').each(function(){
                  $(this).removeClass("opened");
              });
              // State change visuals
              $(this).toggleClass('opened');
              //Expand or collapse this panel
              $(this).next().slideToggle('fast');
              //Hide the other panels
              $(".accordion-content").not($(this).next()).slideUp('fast');
            });
          
            if ($(".mz-productlist-list").hasClass("four-column")) 
            {
               if(localStorage.getItem('column-active') == 'three-column' )
                {
                    $(".mz-productlist-list").addClass("three-column").removeClass("four-column");
                    $('.mz-three-column svg g').attr('stroke', '#000000');
                    $('.mz-four-column svg g').attr('stroke', '#999999');
                }
                else
                {
                    $(".mz-productlist-list").addClass("four-column").removeClass("three-column");
                    $('.mz-four-column svg g').attr('stroke', '#000000');
                    $('.mz-three-column svg g').attr('stroke', '#999999');
                }
            }  
        }
        // Desktop View - Search Each Filter Facets
        function searchFilter() {
            $(".search-filter").on("keyup", function () {
                var value = $(this).val().toLowerCase();
                $(this).parent().siblings(".facets-lists").find("li").filter(function () {
                    $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
                });
            });
            $(".search-filter").on("click", function () {
                var value = $(this).val().toLowerCase(),
                eventData = {
                    'event':"eventTracker",
                    'custom_event':'filter',
                    'event_params':{
                        'event_act':'filter',
                        'event_lbl':value
                    }
                };
                if(value) window.globalEventBus.emit('dataLayerEvent', eventData);
            });
        }
        function mobileFilter() {
            if ($(window).width() < 500) {
                if ($('.filter-facets-container .filter-selected').children().length === 0) {
                    $('.filter-facets-container .filter-selected').hide();
                } else {
                    $('.filter-facets-container .filter-selected').show();
                }
            }
            // Mobile Filter
            $('.filter-btn').on('click', function () {
                $('.filter-facets-container').addClass('show d-block');
                if($('.facet-data-available').val() ==  1){
                    $('body').addClass('overflow-hidden');
                    $('html').addClass('overflow-hidden');
                }
                $('.mz-future-date-header').addClass('hidden');
            });
            $('.close-filter').on('click', function () {
                $('.filter-facets-container').removeClass('show d-block');
                $('body').removeClass('overflow-hidden');
                $('html').removeClass('overflow-hidden');
                $('.mz-future-date-header').removeClass('hidden');
            });
            $('.mz-facetingform-clearall').on('click', function () {
                $('.filter-facets-container').removeClass('show d-block');
                $('body').removeClass('overflow-hidden');
                $('html').removeClass('overflow-hidden');
                $('.mz-future-date-header').removeClass('hidden');
            });

            $(document).on('change', '.filter-select input', function() {
                
                var getUrl = $(this).attr('data-mz-url');
                var isGetUrlValid = true;
                if(getUrl == undefined) {
                    
                    if($(this).attr("data-mz-facet") == "CategoryId") {
                        isGetUrlValid = false;
                        getUrl = window.location.search.replace("&categoryId="+$(this).attr('data-mz-facet-value'),"");
                    }
                }
                
                var previousSelectedValue = sessionStorage.getItem("previousSelectedValue");
                if(previousSelectedValue) {
                    previousSelectedValue = JSON.parse(previousSelectedValue);
                }
                else {
                    previousSelectedValue = [];
                }
                if (this.checked) {   
                    previousSelectedValue.push($(this).attr('data-mz-facet-value'));
                    
                }
                else {  
                    previousSelectedValue.splice($.inArray($(this).attr('data-mz-facet-value'), previousSelectedValue),1);
                    
                }
                sessionStorage.setItem("previousSelectedValue", JSON.stringify(previousSelectedValue));
                
                if ($('.filter-facets-container .filter-selected').children().length > 0) {
                    $('.filter-facets-container .filter-selected').show();
                    if ($(window).width() < 500) {
                        $('.mz-l-sidebar .mz-l-sidebaritem .clear-all-btn').show();
                    }
                } else {
                    $('.filter-facets-container .filter-selected').hide();
                    if ($(window).width() < 500) {
                        $('.mz-l-sidebar .mz-l-sidebaritem .clear-all-btn').hide();
                    }
                }
                 finalUrl = $('.mz-facetingform-clearall').attr('data-mz-url');
                 var i = 0;
                /* if(getUrl.indexOf('?') > -1 && finalUrl.indexOf('?') > -1 && getUrl.indexOf('/') < 0) {
                    finalUrl += getUrl.replace("?","&");
                 }
                 else {
                    finalUrl = getUrl;
                 }*/
                 if(getUrl.indexOf("/") > -1) {
                    getUrl = getUrl.split("?");
                    getUrl = "?"+getUrl[1];
                 }
                 
                 getUrl.substr(1).split('&').forEach(function(pair) {
                    var item = pair.split('=')
                    if(finalUrl.indexOf(item[0]) == -1) {
                        finalUrl += (i == 0 && finalUrl.indexOf("?") == -1) ? "?":"&";
                        finalUrl += item[0]+"="+item[1];
                     }
                    i++;
                  })
                  
                if(!isGetUrlValid) {
                    finalUrl = finalUrl.replace("&categoryId="+$(this).attr('data-mz-facet-value'),"");
                }
                 
                 
                 /*var queryParmas = (new URLSearchParams(getUrl)).entries();
                 queryParmas.forEach(function(item, index) {
                     
                     if(finalUrl.indexOf(item[0]) == -1) {
                        finalUrl += (i == 0 && finalUrl.indexOf("?") == -1) ? "?":"&";
                        finalUrl += item[0]+"="+encodeURIComponent(item[1]);
                     }
                    i++;
                 });*/

                
                
                if ($(window).width() < 710){
                    displayMobileFilter = true;
                    $(".afg-ms-filter-sidebar .mobile-filter-loader-section").show();
                }
                 
                if ($(window).width() < 500) {
                    if (finalUrl && _dispatcher.send(finalUrl)) {
                        _$body.addClass('mz-loading');  
                        setTimeout(function(){
                            $(".afg-ms-filter-sidebar .mobile-filter-loader-section").hide();
                            _$body.removeClass('mz-loading'); 
                        }, 1000);    
                    }
                }
                
                cancelSelectedFilter();
                
            });
            cancelSelectedFilter();
            function cancelSelectedFilter() {
                if ($(window).width() < 500) {
                    $('.filter-selected .filter-selected__list input').click(function () {
                        var getUrl = $(this).attr('data-mz-facet-value');                    
                        $('.facets-lists .filter-select').find('input').each(function (index, value) {
                            if(getUrl == $(this).attr('data-mz-facet-value')){
                                $(this).trigger('click');
                            }
                        });
                    });
                }
            }
            // Mobile View - Filter Button
            $('.filter-results-mobile').on('click', function(){
                
                if(finalUrl === "" || finalUrl === undefined){
                   // finalUrl = catUrl+'?'+finalUrl;
                   finalUrl = catUrl;
                }
                if (finalUrl && _dispatcher.send(finalUrl)) {
                    _$body.addClass('mz-loading');
                    $('.filter-facets-container').removeClass('show d-block');
                    $('body').removeClass('overflow-hidden');
                    $('html').removeClass('overflow-hidden');
                    
                }
              });

            if($('.filter-selected__list').length > 0){
                var filterLength = $('.filter-selected__list').length;
                $('.filter-btn').addClass('active');
                if($('.filterCount').length < 1){
                    $('.filter-btn').append('<span class="filterCount">'+ '('+filterLength+')' +'</span>');
                    $('#view-items-btn-count').show();
                }
                $('.mz-facetingform-clearall').show();
            }

            // Mobile View - Clear All Filters
            
            $('.mz-facetingform-clearall').on('click', function(){
                if(catUrl.indexOf("/search") > -1) {
                    var i = 0;
                    window.location.search.substr(1).split('&').forEach(function(pair) {
                        var item = pair.split('=')
                        if(item[0] == "categoryId") {
                            catUrl = catUrl.replace("&categoryId="+item[1],"");
                        }
                    });
                    //window.location.href = url;
                    
                }
                if (catUrl && _dispatcher.send(catUrl)) {
                    _$body.addClass('mz-loading');
                    
                    urlArray = [];
                }
                $('.facets-lists').find('input').prop("checked", false);
                showFilterList(true);
            });
            
        }
        // Grid view Layout after applying the filters
        function GridLayoutSwitching() {
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
        }

        function getEnglishProducts(impressionsModel) {
            if(!Hypr.getThemeSetting('isArabicLanguageSite')) {
                fetchAndPushToWindowGTM(impressionsModel);
                return true;
            }
            
            console.log("After check isArabicLanguageSite");
            var items = impressionsModel.ecommerce.items;
            var skuArray = items.map(function (item) {
                return item.id;
            });
            var skuString = skuArray.join(',');
            api.request("GET", "/getproducts/english?skus=" + skuString)
                .then(function (res) {
                    console.log(res);
                    if (res) {
                        var responseData = res;
                        if (responseData.length > 0) {
                            items.forEach(function (entry, index) {
                                var foundObject = responseData.find(function (responseItem) {
                                    return responseItem.productCode === entry.id;
                                });
                                if (foundObject) {
                                    var productName = foundObject.name;
                                    var element = document.querySelector('[data-mz-product="' + entry.id + '"]');
                                    if (!element.hasAttribute('data-mz-productname-en')) {
                                        element.setAttribute('data-mz-productname-en', productName);
                                    }
                                                                        
                                    impressionsModel.ecommerce.items[index].item_name = productName;
                                    
                                    if(impressionsModel.ecommerce.items[index].item_category && impressionsModel.ecommerce.items[index].item_category !="") {
                                        if(impressionsModel.ecommerce.items[index].item_category !== 'search') {
                                            impressionsModel.ecommerce.items[index].item_category = foundObject.categories.item_category1 !="" ? foundObject.categories.item_category1.toLowerCase() : "";
                                        } 
                                    }
                                    if(impressionsModel.ecommerce.items[index].item_category2 && impressionsModel.ecommerce.items[index].item_category2 !="") {
                                            impressionsModel.ecommerce.items[index].item_category2 = foundObject.categories.item_category2 !="" ? foundObject.categories.item_category2.toLowerCase() : "";
                                    }
                                    if(foundObject.categories.item_category1 && foundObject.categories.item_category1 !="") {
                                        element.setAttribute('data-mz-category1-en', foundObject.categories.item_category1.toLowerCase());
                                    }
                                    if(foundObject.categories.item_category2 && foundObject.categories.item_category2 !="") {
                                        element.setAttribute('data-mz-category2-en', foundObject.categories.item_category2.toLowerCase());
                                    }
                                    if(foundObject.categories.item_category3 && foundObject.categories.item_category3 !="") {
                                        element.setAttribute('data-mz-category3-en', foundObject.categories.item_category3.toLowerCase());
                                    }
                                }
                            });
                        }
                    }
                    fetchAndPushToWindowGTM(impressionsModel);
                });
            return impressionsModel;
        }

        function gtmEventOnPageLoad() {
            if(pageContext.pageType == 'category' || pageContext.pageType == 'search'){
                var plpItems = window.plpProductData ? window.plpProductData : [];
                var pageTitle = pageContext.cmsContext.template.path ? pageContext.cmsContext.template.path.toLowerCase() : '';
                var category = getCategory();
                var itemCategory1 = category.item_category1;
                var itemCategory2 = category.item_category2;
                var position = 0;
                if(pageContext.pageType == 'search'){
                    itemCategory1 = itemCategory2 = 'search';
                }
                var impressionsModel = {
                    event: 'view_item_list',
                    ecommerce: {
                        items: []
                    },
                };
                const options = {
                    root: null,
                    threshold: 0.2
                };
                var observer = new IntersectionObserver(function (entries, observer) {
                    entries.forEach(function (entry) {
                        $(entry.target).addClass('active');
                        position = position + 1;
                        var productId = entry.target.getAttribute("data-mz-product");
                        var productName,
                            productPrice;
                            if (plpItems && plpItems.length > 0) {
                                var currentProductObject = plpItems.find(function (value, index) {
                                    position = index + 1;
                                    return value.productCode == productId;
                                });
                                productName = currentProductObject.productName;
                                productPrice = currentProductObject.price;
                            } else {
                                productName = entry.target.childNodes[0].getAttribute("data-mz-productname");
                                productPrice = entry.target.childNodes[0].getAttribute("data-mz-price");
                            }
                            var element = document.querySelector('[data-mz-product="' + productId + '"]');
                            if (!element.hasAttribute('data-visited')) {
                                element.setAttribute('data-visited', true);
                                var itemData = {
                                    'id': productId,
                                    'item_name': productName.toLowerCase(),
                                    'affiliation': "online store",
                                    'coupon': "",
                                    'currency': getCurrencyCode(),
                                    'discount': "",
                                    'index': position,
                                    'item_category': itemCategory1 ? itemCategory1.toLowerCase() : "",
                                    'item_category2': itemCategory2 ? itemCategory2.toLowerCase() : "",
                                    'item_list_id': pageTitle ? pageTitle.toLowerCase() : "",
                                    'item_list_name': pageTitle ? pageTitle.toLowerCase() : "",
                                    'price': productPrice,
                                    'item_variant': "",
                                    'quantity': 1
                                };
                                if(itemData.item_category2 == "") {
                                    itemData.item_category2 = itemData.item_category;
                                }                                
                                impressionsModel.ecommerce.items.push(itemData);
                            }
                            observer.unobserve(entry.target);
                        });
                    if(impressionsModel.ecommerce.items && impressionsModel.ecommerce.items.length){
                        try {
                            //fetchAndPushToWindowGTM(impressionsModel);
                            getEnglishProducts(impressionsModel);
                        }
                        catch (error) {
                            console.log("Exception occure in data push in GTM for dataLayerEvent", error);
                        }
                    }
                },options);
                var elements = document.querySelectorAll('.mz-productlist-item');
                _.forEach(elements, function (product) {
                    observer.observe(product);
                });
            }
        }

        function initInfiniteScroll() {
            var $btn = $('#loadMoreBtn');
            if ($btn.length) {
                _nextStartIndex = parseInt($btn.attr('data-mz-next-start') || 0, 10);
                _totalCount = parseInt($btn.attr('data-mz-total') || 0, 10);
            }
            _isLoadingMore = false;
        }

        function buildLoadMoreUrl() {
            var params = $.deparam(window.location.search.replace('?', ''));
            delete params.pageSize;
            delete params.startIndex;
            delete params.page;
            params.pageSize = _pageSize;
            params.startIndex = _nextStartIndex;
            var qs = $.param(params);
            return window.location.pathname + (qs ? '?' + qs : '');
        }

         function doLoadMore() {
            if (_isLoadingMore || _nextStartIndex >= _totalCount) return;
            _isLoadingMore = true;
            $('.plp-loader').show();

            var url = buildLoadMoreUrl();
            getPartialView(url, conf.template).then(function(response) {
                var $responseHtml = $('<div>').html(response.body);
                var $newItems = $responseHtml.find('[data-mz-productlist] .mz-productlist-item');

                if ($newItems.length) {
                    _$body.find('[data-mz-productlist]').append($newItems);
                    _nextStartIndex += _pageSize;

                    // Re-apply grid layout and event handlers to new items
                    setTimeout(function() {
                        GridLayoutSwitching();
                        updateItemImagePath();
                        productImpression();
                    }, 100);
                }

                _isLoadingMore = false;
                $('.plp-loader').hide();

                if (_nextStartIndex >= _totalCount || !$newItems.length) {
                    $('#loadMoreBtn').remove();
                }
            }, function() {
                _isLoadingMore = false;
                $('.plp-loader').hide();
            });
        }


        $(document).ready(function () {
            searchFilter();
            showHideFilter();
            showFilterList(false);
            mobileFilter();
            GridLayoutSwitching();
            gtmEventOnPageLoad();
            stickyFilter(false);
            initInfiniteScroll();
            var pageContext = require.mozuData('pagecontext') ? require.mozuData('pagecontext') : '';
            var templatePath = pageContext ? pageContext.cmsContext.template.path : '';
            $(window).on("scroll", function() {
                var scrollHeight = $(document).height();
                //scroll position
                var scrollPos = $(window).height() + $(window).scrollTop();
                // fire if the scroll position is 500 pixels above the bottom of the page
                if(((scrollHeight - 950) >= scrollPos) / scrollHeight == 0 && templatePath !== "parent-category"){
                    if($('#loadMoreBtn').length > 0) {
                        doLoadMore();
                    }
                 }
               });
            $(window).on('resize', function () {
                initialSize = $(window).width();
                if($('.filter-facets-container').hasClass('show')){
                    $('body').addClass('overflow-hidden');
                    $('html').addClass('overflow-hidden');
                }
                if (initialSize >= 710) {
                    $('body').removeClass('overflow-hidden');
                    $('html').removeClass('overflow-hidden');
                }
            });
        });
        function showFilterList(checkCategoryFilter) {
            //var selectedFilters = [];
            var filterlists = [];
            var previousSelectedValue = sessionStorage.getItem("previousSelectedValue");
            $('.facets-lists').find('input[data-mz-facet="tenant~gender"]').each(function() {
                var objCls = $(this).closest('.input-check');
                if($(objCls).find('.mz-facetingform-valuelabel').text().indexOf("_") > -1) {
                    $(objCls).find('.mz-facetingform-valuelabel').text($(objCls).find('.mz-facetingform-valuelabel').text().split("_").join(","))
                }
            })
            if(previousSelectedValue) {
                previousSelectedValue = JSON.parse(previousSelectedValue);
            }
            else {
                previousSelectedValue = [];
            }
            var lastFilterVal = previousSelectedValue.pop();
            try{
                if(!checkCategoryFilter) {
                    var facetValueFilter = decodeURIComponent(window.location.search)
                        .split('?')[1]
                        .split('&')
                        .filter(function(p){ return p.split('=')[0] === 'facetValueFilter';});
                        if(facetValueFilter.length > 0) {
                            facetValueFilter = facetValueFilter[0].split('=')[1]
                            .split(',')
                            .map(function(v){ return v.split(':'); });
                        }
                    if(facetValueFilter.length > 0) {
                        facetValueFilter.forEach(function(v,i) { 
                            if(v[0] === "categoryCode") {
                                $('.facets-lists').find('input#categorycode_'+v[1]).prop("checked", true);
                            }
                        });
                    }
                    var categoryValueFilter = decodeURIComponent(window.location.search)
                        .split('?')[1]
                        .split('&')
                        .filter(function(p){ return p.split('=')[0] === 'categoryId';});
                        if(categoryValueFilter.length > 0) {
                            categoryValueFilter = categoryValueFilter[0].split('=')[1]
                            .split('&')[0]                            
                        }
                        if(categoryValueFilter != "") {
                            $('.facets-lists').find('input#categoryid_'+categoryValueFilter).prop("checked", true);
                               
                        }
                }
            }
            catch(e) {
                console.log("No Category Filter");
            }
            $('.facets-lists').find('input:checked').each(function (index, value) {
                //    selectedFilters.push($(this)); 

                if($(this).attr('data-mz-facet-value') === lastFilterVal) {
                    $(this).closest('.facets-lists-container').show();
                }
                
                filterlists.push('<div class="filter-selected__list"><span class="list">' + $(this).attr('data-mz-facet-label') + '</span><span class="close-filter-selected"><input type="checkbox" data-mz-facet-value="' + $(this).attr('data-mz-facet-value') + '" data-mz-facet="' + $(this).attr('data-mz-facet') + '" data-mz-url="' + $(this).attr('data-mz-url') + '" checked><img src="/resources/images/icons/svg/close.svg" alt="close" /></span></div>');
                if(!$(".filter-selected").hasClass("filterApplied")){
                    $(".filter-selected").addClass("filterApplied");
                }
            });
            
            $(".filter-selected").html(filterlists.join(""));
            if ($(window).width() > 500) {
                // $("html, body").animate({scrollTop: ($(window).scrollTop() + 1)});
                if($('.filter-selected__list').length > 0){
                    var filterLengthInTitle = $('.filter-selected__list').length;
                    $('.filter-title-desktop .desktop-filter-count').text(' ('+filterLengthInTitle+')');
                    $('.afg-ms-filter-sidebar .filter-selected').show();
                    $('.afg-ms-filter-sidebar .mz-l-sidebaritem.top-container').css('display', 'flex');
                } else {
                    $('.afg-ms-filter-sidebar .filter-selected').hide();
                    $('.afg-ms-filter-sidebar .mz-l-sidebaritem.top-container').hide();
                }
            }
        }

        function showError(error) {
            // if (error.message === ROUTE_NOT_FOUND) {
            //     window.location.href = url;
            // }
            _$body.find('[data-mz-messages]').text(error.message);
        }

        function intentToUrl(e) {
            
            console.log("e.target.className",e.target.className);
            var elm = e.target;
            var url;
            if(e.target.className !== "templink") {
                stopScrollTopEvent = false;
                if(e.target.className && e.target.className.includes('pagesort')) stopScrollTopEvent = false;
            }            
            if (elm.tagName.toLowerCase() === "select") {
                elm = elm.options[elm.selectedIndex];
            }
            url = elm.getAttribute('data-mz-url') || elm.getAttribute('href') || '';
            if(elm.getAttribute("data-mz-facet") == "CategoryId" && (url == "undefined" || url == undefined || url == "")) {
                url = window.location.pathname+window.location.search.replace("&categoryId="+elm.getAttribute('data-mz-facet-value'),"");
            }
            if(elm.getAttribute('data-mz-action') == "clearFacets" && url.indexOf("/search") > -1) {
                var i = 0;
                var tempUrlLink = "";
                url.split("?")[1].split('&').forEach(function(pair) {
                    var item = pair.split('=')
                    if(item[0] != "categoryId") {
                        tempUrlLink += tempUrlLink.indexOf("?") > -1 ? "&" :"?";
                        tempUrlLink += item[0]+"="+item[1];
                    }
                });
                if(tempUrlLink.indexOf("?") > -1) {
                    url = window.location.pathname+ tempUrlLink;
                }              
                
            }
            if (url && url[0] != "/") {
                if(!e.target.checked) {
                    if(e.target.dataset.mzFacet === 'categoryCode') {
                        url = url.replaceAll('categoryCode%3a'+e.target.dataset.mzFacetValue,'');
                    }
                }
                var parser = document.createElement('a');
                parser.href = url;
                url = window.location.pathname + parser.search;
                scrollevent = true;
                productImpression();
            }
            setTimeout(function(){updateItemImagePath()}, 2000);
            return url;
        }

        var navigationIntents = IntentEmitter(
            _$body,
            [
                'click a[data-mz-facet-value]',
                'click [data-mz-action="clearFacets"]',
                'click [data-mz-action="viewFilterFacetsMobile"]',
                'change input[data-mz-facet-value]',
                'click button.templink'
            ],
            intentToUrl
        );

        navigationIntents.on('data', function (url, e) {

            // check if its checked or unchecked
            var currentElement = e.currentTarget;
            if(e.type == "change" && document.getElementById(currentElement.id) && document.getElementById(currentElement.id).checked){
                var firstLabel = currentElement.dataset.mzFacet.toLowerCase().includes('category') ? 'category' : currentElement.dataset.mzFacet.split('~')[1];

                if (window.globalEventBus) {
                    var eventData = {
                        custom_event: 'sort & filter',
                        event_params:{
                            event_act: "filter",
                            event_lbl: currentElement.dataset.mzFacetValue ?  firstLabel + '=' + currentElement.dataset.mzFacetValue.toLowerCase() : 'filter'
                        }
                      
                    };
                    window.globalEventBus.emit('CategoryDataLayerEvent', eventData);
                }
            } else if(e.type == "click"){
                if(window.globalEventBus){
                    var clearEvent = {
                        custom_event:'sort & filter',
                        event_params:{
                            event_act: 'filter',
                            event_lbl: 'clear all'
                        }
                        
                    };
                    window.globalEventBus.emit('CategoryDataLayerEvent', clearEvent);
                }
            }
            if (initialSize >= 710) {
                if (url && _dispatcher.send(url)) {
                    _$body.addClass('mz-loading');
                    
                    e.preventDefault();
                }
            }
        });

        // Sorting and Pagination
        var navigationSort = IntentEmitter(
            _$body,
            [
                'click [data-mz-pagingcontrols] a',
                'click [data-mz-pagenumbers] a',
                'click [data-mz-action="filterMyStore"]',
                'change [data-mz-value="pageSize"]',
                'change [data-mz-value="sortBy"]', 
                'click button.templink'
            ],
            intentToUrl
        );

        navigationSort.on('data', function (url, e) {
            var result = $('.custom-select :selected').text().toLowerCase();
            var eventData = {
                custom_event: 'sort & filter',
                event_params:{
                    event_act:"sort",
                    event_lbl:""
                }
            };
            if (window.globalEventBus) {
                eventData.event_params.event_act = "sort";
                eventData.event_params.event_lbl =  result ;
                window.globalEventBus.emit('CategoryDataLayerEvent', eventData);
            }
            if (url && _dispatcher.send(url)) {
                _$body.addClass('mz-loading');
                
                e.preventDefault();
                setTimeout(function(){
                    stickyFilter(true);
                }, 3000);
            }
        });

        _dispatcher.onChange(function (url) {
            getPartialView(url, conf.template).then(updateUi, showError);
            
        });
        
        //sticky filter on plp
        function stickyFilter(autoSet){
            //sticky filter on plp
            if(($('body').hasClass('porduct-listing-page')) || ($('body').hasClass('mz-searchresults'))) {
                if ($(window).width() > 500) {
                    var $sticky = $('.plp-container .mz-l-sidebar');
                    var $stickyrStopper = $('.porduct-listing-page .mz-pagefooter, .mz-searchresults .mz-pagefooter');
                    if (!!$sticky.offset()) { 
                
                        var generalSidebarHeight = $sticky.innerHeight();
                        var stickyTop = $sticky.offset().top;
                        var stickOffset = 0;
                        var stickyStopperPosition = $stickyrStopper.offset().top;
                        var stopPoint = stickyStopperPosition - generalSidebarHeight - stickOffset;
                        var diff = stopPoint + stickOffset;
                        if(autoSet) {
                            var windowTop = $(window).scrollTop();
                            
                            if (stopPoint < windowTop) {
                                $('.plp-container .mz-l-sidebar').removeClass('sticky-filter-plp');
                                $('.plp-container .mz-l-paginatedlist').removeClass('sticky-product-list-plp');
                            } else if (stickyTop < windowTop+stickOffset) {
                                $('.plp-container .mz-l-sidebar').addClass('sticky-filter-plp');
                                $('.plp-container .mz-l-paginatedlist').addClass('sticky-product-list-plp');
                            } else {
                                $('.plp-container .mz-l-sidebar').removeClass('sticky-filter-plp');
                                $('.plp-container .mz-l-paginatedlist').removeClass('sticky-product-list-plp');
                            }
                        }
                        $(window).scroll(function(){ 
                            generalSidebarHeight = $sticky.innerHeight();
                            stopPoint = stickyStopperPosition - generalSidebarHeight - stickOffset;
                            var windowTop = $(window).scrollTop();
                            
                            if (stopPoint < windowTop) {
                                $('.plp-container .mz-l-sidebar').removeClass('sticky-filter-plp');
                                $('.plp-container .mz-l-paginatedlist').removeClass('sticky-product-list-plp');
                            } else if (stickyTop < windowTop+stickOffset) {
                                $('.plp-container .mz-l-sidebar').addClass('sticky-filter-plp');
                                $('.plp-container .mz-l-paginatedlist').addClass('sticky-product-list-plp');
                            } else {
                                $('.plp-container .mz-l-sidebar').removeClass('sticky-filter-plp');
                                $('.plp-container .mz-l-paginatedlist').removeClass('sticky-product-list-plp');
                            }
                        });
                    }
                } else {
                    // mobile filter sticky
                    var mobileStickyTop =  $('.plp-container .filter-mobile-container').offset().top;
                    $(window).on( 'scroll', function(){
                        if ($(window).scrollTop() >= mobileStickyTop) {
                            $('#page-wrapper').hide();
                            $('.plp-container .filter-mobile-container').addClass('mobile-filter-sticky');
                            $('.afg-ms-plp-container .mz-l-paginatedlist-list').css('margin-top', '50px');
                        } else {
                            $('#page-wrapper').show();
                            $('.plp-container .filter-mobile-container').removeClass('mobile-filter-sticky');
                            $('.afg-ms-plp-container .mz-l-paginatedlist-list').css('margin-top', '0');
                        }
                    });
                }
            }
        }
        function updateItemImagePath() {

            if(pageContext.pageType == 'category' || pageContext.pageType == 'search') {

                $('.mz-productlist-list').find('img:not(".loaded")').each(function() {
                    $(this).addClass("loaded");
                    if(!$(this).context.complete) {                       
                        $(this).attr("src", $(this).attr("src")+"&reload=true");
                    }
                })
            }
        }
    }
    

    return {
        createFacetedCollectionViews: factory
    };

});