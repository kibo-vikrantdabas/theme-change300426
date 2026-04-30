require(['vendor/minivents.amd.min', 'modules/jquery-mozu', "underscore"], function(MiniEvents, $, _) {
    window.globalEventBus = new MiniEvents();
    var pageContext = require.mozuData('pagecontext') ? require.mozuData('pagecontext') : '';
    var user = require.mozuData('user') ? require.mozuData('user'): '';
    var plpItems = window.plpProductData ? window.plpProductData : [];

   
    // add social media icons click event
    var facebook = document.querySelector('[title = Facebook]');
    var twitter = document.querySelector('[title = Twitter]');
    var youtube = document.querySelector('[title = Youtube]');
    var pinterest = document.querySelector('[title = Pinterest]');
    var instagram = document.querySelector('[title = Instagram]');

    var observer = null;
    createOnClickListener(facebook);
    createOnClickListener(twitter);
    createOnClickListener(youtube);
    createOnClickListener(pinterest);
    createOnClickListener(instagram);
    function createOnClickListener(socialNode){
        if(socialNode && socialNode !== undefined){
            socialNode.addEventListener('click', function(e){
                fetchAndPushToWindowGTM(
                {
                    event: 'eventTracker',
                    custom_event: 'social',
                    event_params:{
                        event_act: 'm&s', 
                        event_lbl : socialNode.getAttribute('title') ? socialNode.getAttribute('title').toLowerCase() : '',
                    }
                });
            });            
        }
    }

    // window scrolll event PLP Page - Product Impressions
    (function() {
        if(pageContext.cmsContext){
        var pageTitle = pageContext.cmsContext.template.path ? pageContext.cmsContext.template.path.toLowerCase() : '';
        if(pageContext.cmsContext.template.path == 'home' || pageContext.cmsContext.template.path == 'category' || pageContext.cmsContext.template.path == 'search'){            
            var category = getCategory();
            var itemCategory1 = category.item_category1;
            var itemCategory2 = category.item_category2;
            var position = 0;
            if(pageContext.pageType == 'search'){
                itemCategory1 = itemCategory2 = 'search';
            } else if (pageContext.cmsContext.template.path == 'home'){
                itemCategory1 = itemCategory2 = 'home';
            }
            
            var impressionsModel = {
                event: 'view_item_list',
                ecommerce: {
                    items: []
                }
            };

            const observer = new IntersectionObserver(function (entries, observer) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        observer.unobserve(entry.target);
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

                        impressionsModel.ecommerce.items.push({
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
                            'item_variant': "", //item color
                            'quantity': 1
                        });
                    } else {
                        return;
                    }
                });

                if (impressionsModel.ecommerce.items && impressionsModel.ecommerce.items.length) {
                    try {
                        // fetchAndPushToWindowGTM(impressionsModel);
                    }
                    catch (error) {
                        console.log("Exception occure in data push in GTM for dataLayerEvent", error);
                    }
                }
            });

            var elements = document.querySelectorAll('.mz-productlist-item');
            _.forEach(elements, function (product) {
                observer.observe(product);
            });
        } 


        if(pageContext.cmsContext.template.path == 'home' || pageContext.pageType == 'category') {
            var promotionImpressionsModel = {
                event: "view_promotion",
                ecommerce: {
                    items: []
                },
            };

            const options = {
                root: null,
                threshold: 0.2
            };

            var promotionObserver = new IntersectionObserver(function(entries, observer) { 
                entries.forEach(function(entry) {
                    if(entry.isIntersecting){
                        $(entry.target).addClass('active');
                        position = position+1;
                        var promotionId = entry.target.childNodes[1].attributes['class'].ownerElement.childNodes[1].childNodes[0].data;
                        var promotionName = entry.target.childNodes[3].attributes['class'].ownerElement.childNodes[1].childNodes[0].data;

                        promotionImpressionsModel.ecommerce.items.push({
                            promotion_id: promotionId, //Promotion ID 
                            promotion_name: promotionName, //Promotion Name
                            creative_slot: "slot1/slot2/slot3", //slot number of banner
                            location_id: pageContext ? pageContext.title.toLowerCase().concat(':',pageContext.url) : ''
                        });    
                                
                        observer.unobserve(entry.target);
                    } else {
                        return;
                    }
                }); 

                if(promotionImpressionsModel.ecommerce.items && promotionImpressionsModel.ecommerce.items.length){
                    try {
                        fetchAndPushToWindowGTM(promotionImpressionsModel);
                    } 
                    catch (error) {
                        console.log("Exception occure in data push in GTM for dataLayerEvent", error);
                    }
                }       
            },options);

            var promoElements = document.querySelectorAll('.offer-specs');
            _.forEach(promoElements, function (promotion) {
                promotionObserver.observe(promotion);
            });
        }
      }
    })();

    function getCurrencyCode(){
        return require.mozuData('apicontext').headers['x-vol-currency'] ? require.mozuData('apicontext').headers['x-vol-currency'] : 'AED';
    }

    function fetchAndPushToWindowGTM(localData) {
        try {
            // var data = [];
            // var gtmLocalStoreData = sessionStorage.getItem('gtmevents');
            // if (gtmLocalStoreData && gtmLocalStoreData.length > 0 && gtmLocalStoreData !== undefined && JSON.parse(gtmLocalStoreData) !== []) {
            //     data = JSON.parse(gtmLocalStoreData);
            // }
            // data.push(localData);
            // sessionStorage.setItem('gtmevents', JSON.stringify(data));
            // window.dataLayer = data;
            refactorKeys(localData);
            window.dataLayer.push(localData);

        } catch (error) {
            console.error("Exception occured in stroing data in window.");
        }
    }

    function getCommonLinksDL(eventData) {
        try {
            var gtmEventData = {
                event: 'eventTracker'

            };
            for (var eventProperty in eventData) {
                gtmEventData[eventProperty] = eventData[eventProperty];
            }
            if (eventData.email) {
                gtmEventData.email_hashed = eventData.email.toLowerCase();
            }
            if(eventData.moreCategory){
                gtmEventData.event_params.event_act = eventData.moreCategory ? eventData.moreCategory.toLowerCase() : pageContext.title.toLowerCase() + ":about category";
            }
            return gtmEventData;
        } catch (error) {
            console.log("Exception occured in checkDataFormat ", error);
        }
    }
    
    function getFilterEventDL(eventData) {
        try {
            var gtmEventData = {
                event: 'eventTracker'

            };
            for (var eventProperty in eventData) {
                gtmEventData[eventProperty] = eventData[eventProperty];
            }
            return gtmEventData;
        } catch (error) {
            console.log("Exception occured in checkDataFormat ", error);
        }
    }


    function getCategory() {
        var category =  document.getElementsByClassName('mz-breadcrumbs')[0] ? document.getElementsByClassName('mz-breadcrumbs')[0].innerText.replaceAll("/",">").toLowerCase() : '';
        return {
            item_category1: category  ? ( category.split(">")[1] ?  category.split(">")[1].trim() : '' ) : '',
            item_category2: category  ? ( category.split(">")[2] ?  category.split(">")[2].trim() : '' ) : '', 
            item_category3: category  ? ( category.split(">")[3] ?  category.split(">")[3].trim() : '' ) : '', 
            item_category4: category  ? ( category.split(">")[4] ?  category.split(">")[4].trim() : '' ) : '',
            item_category5: category  ? ( category.split(">")[5] ?  category.split(">")[5].trim() : '' ) : '',
        };
    }
    function getCategory1(eventData, category) {
        if ('item_category1' in eventData.itemCategory) {
            return eventData.itemCategory.item_category1 != "" ? eventData.itemCategory.item_category1.toLowerCase() : '';
        }
        var item_category = !_.isUndefined(category.item_category1) ? (category.item_category1.toLowerCase() != eventData.productName.toLowerCase() ? category.item_category1 : '') : '';
        return item_category;
    }

    function getCategory2(eventData, category) {
        if ('item_category2' in eventData.itemCategory) {
            return eventData.itemCategory.item_category2 != "" ? eventData.itemCategory.item_category2.toLowerCase() : '';
        }
        var item_category = !_.isUndefined(category.item_category2) ? (category.item_category2.toLowerCase() != eventData.productName.toLowerCase() ? category.item_category2 : '') : '';
        return item_category;
    }

    function getCategory3(eventData, category) {
        if ('item_category3' in eventData.itemCategory) {
            return eventData.itemCategory.item_category3 != "" ? eventData.itemCategory.item_category3.toLowerCase() : '';
        }
        var item_category = !_.isUndefined(category.item_category3) ? (category.item_category3.toLowerCase() != eventData.productName.toLowerCase() ? category.item_category3 : '') : '';
        return item_category;
    }

    function getProductClickDL(eventData) {
        var pageTitle = pageContext.cmsContext.template.path;
        var position = 0, category;
        if (pageTitle && !pageTitle.includes("search")) category = getCategory();
        for (var i = 0; i < plpItems.length; i++) {
            if (plpItems[i].productCode == eventData.productCode) {
                position = i + 1;
            }
        }

        var price = eventData.price ? Number((eventData.price.salePrice ? eventData.price.salePrice : eventData.price)).toFixed(2) : '';

        window.dataLayer.push({ ecommerce: null });

        var productName = eventData.productName;
        var element = document.querySelector('[data-mz-product="' + eventData.productCode + '"]');
        if (element.hasAttribute('data-mz-productname-en') && element.hasAttribute('data-mz-productname-en') != "") {
            productName = element.getAttribute('data-mz-productname-en');
        }

        var category1 = "";
        if (element.hasAttribute('data-mz-category1-en') && element.hasAttribute('data-mz-category1-en') != "") {
            category1 = element.getAttribute('data-mz-category1-en');
        } else {
            category1 = category && !_.isUndefined(category.item_category1) ? category.item_category1 : '';
        }

        var category2 = "";
        if (element.hasAttribute('data-mz-category2-en') && element.hasAttribute('data-mz-category2-en') != "") {
            category2 = element.getAttribute('data-mz-category2-en');
        } else {
            category2 = category && !_.isUndefined(category.item_category2) ? category.item_category2 : '';
        }

        var category3 = "";
        if (element.hasAttribute('data-mz-category3-en') && element.hasAttribute('data-mz-category3-en') != "") {
            category3 = element.getAttribute('data-mz-category3-en');
        } else {
            category3 = category && !_.isUndefined(category.item_category3) ? category.item_category3 : '';
        }

        if (pageContext.pageType == 'search') {
            category1 = 'search';
            category2 = "";
            category3 = "";
        }

        var selectitemData = {
            item_id: eventData.productCode,
            item_name: productName.toLowerCase(),
            affiliation: "online store",
            // coupon: "coupon code", 
            currency: getCurrencyCode(),
            // discount: "0.50", 
            index: position,
            item_brand: eventData.productBrand,
            item_category: category1,
            item_list_id: pageTitle,
            item_list_name: pageTitle,
            price: price ? price : 0,
            // item_variant: "blue", 
            quantity: 1
        };

        if (category2 != "") {
            selectitemData.item_category2 = category2;
        }
        else {
            selectitemData.item_category2 = category1;
        }
        if (category3 != "") {
            selectitemData.item_category3 = category3;
        }
        else {
            selectitemData.item_category3 = category1;
        }

        var productClick = {
            event: 'select_item',
            ecommerce: {
                items: [selectitemData]
            },
        };
        // if(pageTitle && !pageTitle.includes("search"))
        // localStorage.setItem('eventItems', JSON.stringify(productClick.ecommerce.items));
        // else
        // localStorage.removeItem('eventItems');
        return productClick;
    }

    function getProductClickDL(eventData) {
        var pageTitle = pageContext.cmsContext.template.path;
        var position = 0, category;
        if (pageTitle && !pageTitle.includes("search")) category = getCategory();
        for (var i = 0; i < plpItems.length; i++) {
            if (plpItems[i].productCode == eventData.productCode) {
                position = i + 1;
            }
        }

        var price = eventData.price ? Number((eventData.price.salePrice ? eventData.price.salePrice : eventData.price)).toFixed(2) : '';

        window.dataLayer.push({ ecommerce: null });

        var productName = eventData.productName;
        var element = document.querySelector('[data-mz-product="' + eventData.productCode + '"]');
        if (element.hasAttribute('data-mz-productname-en') && element.hasAttribute('data-mz-productname-en') != "") {
            productName = element.getAttribute('data-mz-productname-en');
        }

        var category1 = "";
        if (element.hasAttribute('data-mz-category1-en') && element.hasAttribute('data-mz-category1-en') != "") {
            category1 = element.getAttribute('data-mz-category1-en');
        } else {
            category1 = category && !_.isUndefined(category.item_category1) ? category.item_category1 : '';
        }

        var category2 = "";
        if (element.hasAttribute('data-mz-category2-en') && element.hasAttribute('data-mz-category2-en') != "") {
            category2 = element.getAttribute('data-mz-category2-en');
        } else {
            category2 = category && !_.isUndefined(category.item_category2) ? category.item_category2 : '';
        }

        var category3 = "";
        if (element.hasAttribute('data-mz-category3-en') && element.hasAttribute('data-mz-category3-en') != "") {
            category3 = element.getAttribute('data-mz-category3-en');
        } else {
            category3 = category && !_.isUndefined(category.item_category3) ? category.item_category3 : '';
        }

        if (pageContext.pageType == 'search') {
            category1 = 'search';
            category2 = "";
            category3 = "";
        }

        var selectitemData = {
            item_id: eventData.productCode,
            item_name: productName.toLowerCase(),
            affiliation: "online store",
            // coupon: "coupon code", 
            currency: getCurrencyCode(),
            // discount: "0.50", 
            index: position,
            item_brand: eventData.productBrand,
            item_category: category1,
            item_list_id: pageTitle,
            item_list_name: pageTitle,
            price: price ? price : 0,
            // item_variant: "blue", 
            quantity: 1
        };

        if (category2 != "") {
            selectitemData.item_category2 = category2;
        }
        else {
            selectitemData.item_category2 = category1;
        }
        if (category3 != "") {
            selectitemData.item_category3 = category3;
        }
        else {
            selectitemData.item_category3 = category1;
        }

        var productClick = {
            event: 'select_item',
            ecommerce: {
                items: [selectitemData]
            },
        };
        // if(pageTitle && !pageTitle.includes("search"))
        // localStorage.setItem('eventItems', JSON.stringify(productClick.ecommerce.items));
        // else
        // localStorage.removeItem('eventItems');
        return productClick;
    }

    function getProductViewDL(eventData) {
        var pageTitle = pageContext.cmsContext.template.path;
        var category = getCategory(),
            price = eventData.price ? Number((eventData.price.salePrice ? eventData.price.salePrice : eventData.price)).toFixed(2) : '';

        if (_.isUndefined(eventData.productBrand) && pageTitle.toLowerCase() == 'product') {
            var productData = require.mozuData('product'),
                brandObject = _.findWhere(productData.properties, { attributeFQN: 'tenant~brand' });
            eventData.productBrand = brandObject ? brandObject.values[0].stringValue.toLowerCase() : '';
        }

        var productItemDetails = {
            item_id: eventData.productCode,
            item_name: eventData.productName.toLowerCase(),
            affiliation: "online store",
            // coupon: "coupon code",
            currency: getCurrencyCode(),
            discount: eventData.discount,
            index: 0,
            item_brand: eventData.productBrand,
            item_category: getCategory1(eventData, category),
            item_list_id: pageTitle,
            item_list_name: pageTitle,
            price: price ? price : 0,
            item_variant: eventData.currentColor,
            quantity: 1
        };

        if (getCategory2(eventData, category) != "") {
            productItemDetails.item_category2 = getCategory2(eventData, category);
        }
        else {
            productItemDetails.item_category2 = getCategory1(eventData, category);
        }

        if (getCategory3(eventData, category) != "") {
            productItemDetails.item_category3 = getCategory3(eventData, category);
        }
        else {
            productItemDetails.item_category3 = getCategory1(eventData, category);
        }

        if (eventData.itemCategory.item_category4 && eventData.itemCategory.item_category4 != "") {
            productItemDetails.item_category4 = eventData.itemCategory.item_category4.toLowerCase();
        } else {
            if (!_.isUndefined(category.item_category4) && category.item_category4 != "") {
                if (category.item_category4.toLowerCase() != eventData.originalProductName.toLowerCase()) {
                    productItemDetails.item_category4 = category.item_category4;
                }
            }
        }
        if (eventData.itemCategory.item_category5 && eventData.itemCategory.item_category5 != "") {
            productItemDetails.item_category5 = eventData.itemCategory.item_category5.toLowerCase();
        } else {
            if (!_.isUndefined(category.item_category5) && category.item_category5 != "") {
                if (category.item_category5.toLowerCase() != eventData.originalProductName.toLowerCase()) {
                    productItemDetails.item_category5 = category.item_category5;
                }
            }
        }
        var productView = {
            event: 'view_item',
            ecommerce: {
                items: [productItemDetails]
            }
        };

        return productView;
    }

    function refactorKeys(localData) {
        if(localData.event.toLowerCase() == "eventtracker") {
            localData.ecommerce = undefined;
             localData.pageUrl = undefined;
             localData.pageTitle = undefined;
             localData.login_status = undefined;
             localData.locale = undefined;
        }
        else if(localData.event.toLowerCase() == "pageview") {
            localData.ecommerce = undefined;
            localData.custom_event = undefined;
            localData.event_params = undefined;
             
        }
        else {
            localData.custom_event = undefined;
            localData.event_params = undefined;
            localData.pageUrl = undefined;
            localData.pageTitle = undefined;
            localData.login_status = undefined;
            localData.locale = undefined;
        }
    }
    // Event subscriber for click events
    window.globalEventBus.on('dataLayerEvent', function (eventData) {
        try {
            fetchAndPushToWindowGTM(getCommonLinksDL(eventData));
        } catch (error) {
            console.log("Exception occure in data push in GTM for dataLayerEvent", error);
        }
    });

    // Event subscriber for clear events

    window.globalEventBus.on('CategoryDataLayerEvent', function (eventData) {
        try {
            fetchAndPushToWindowGTM(getFilterEventDL(eventData));
        } catch (error) {
            console.log("Exception occure in data push in GTM for dataLayerEvent", error);
        }
    });

    // Event subscriber for enhanced product click events
    window.globalEventBus.on('productClickEvent', function (eventData) {
        try {
            eventData.productBrand = plpItems.filter((function(value) {
                    return value.productCode == eventData.productCode;
            }))[0].productBrand;
            fetchAndPushToWindowGTM(getProductClickDL(eventData));
        }catch(error){
            console.log("Exception occured in data push in GTM for productClickEvent",error);
        }
    });


    // Event subscriber for enhanced product view events
    window.globalEventBus.on('productViewEvent', function (eventData) {
        try {
            var productDetailView = getProductViewDL(eventData);
            localStorage.setItem('eventItems', JSON.stringify(productDetailView.ecommerce.items));
            fetchAndPushToWindowGTM(productDetailView);
           /* var eventItems = JSON.parse(localStorage.getItem('eventItems'));
               if(_.isNull(eventItems)) {
                localStorage.setItem('eventItems', JSON.stringify(productDetailView.ecommerce.items));
                fetchAndPushToWindowGTM(productDetailView);
               }
               else {
                var eventObject = eventItems[0],
                category = getCategory();
                 if(eventObject.item_id != productDetailView.ecommerce.items[0].item_id) {
                     localStorage.setItem('eventItems', JSON.stringify(productDetailView.ecommerce.items));
                     eventObject = productDetailView.ecommerce.items[0];
                  } 
                  else {
                    eventObject.price = eventData.price;
                    eventObject.discount = eventData.discount;
                    eventObject.item_variant = eventData.currentColor;
                 }

                  if(eventObject.item_category1 === '') {
                    eventObject.item_category1 = category.item_category1;
                    eventObject.item_category2 = category.item_category2;
                    eventObject.item_category3 = category.item_category3;
                  }
                  
                  eventItems[0] = eventObject;
                  localStorage.setItem('eventItems', JSON.stringify(eventItems));

                  productDetailView = {
                         event:'view_item',
                         ecommerce : {
                            items : eventItems
                         }
                  };

                  fetchAndPushToWindowGTM(productDetailView);
               }*/
           
        }catch(error){
            console.log("Exception occured in data push in GTM for productViewEvent",error);
        }
    });


    window.globalEventBus.on('productAddToCart', function (eventData) {
        try {
            // fetchAndPushToWindowGTM(productAddToCartGTM(eventData));
            fetchAndPushToWindowGTM(eventData);
        } catch (error) {
            console.log("Exception occure in data push in GTM productAddToCart", error);
        }
    });

    window.globalEventBus.on('searchedKeywordEvent', function (searchedKeywordEventData) {
        try {
            var searchedkeyword = sessionStorage.getItem("searchedKeyword");
          //  searchedKeywordEventData.event_params.event_act = searchedkeyword + " : " + searchedKeywordEventData.event_lbl;
         //   searchedKeywordEventData.event_params.event_lbl = searchedKeywordEventData.event_lbl;
            sessionStorage.removeItem("searchedKeyword");
            fetchAndPushToWindowGTM(getCommonLinksDL(searchedKeywordEventData));
        } catch (error) {
            console.log("Exception occure in data push in GTM searchedKeywordEvent", error);
        }
    });

    window.globalEventBus.on('checkoutEvent', function(eventData){
        try {
            if (eventData.ecommerce && Array.isArray(eventData.ecommerce.items)) {
    eventData.ecommerce.items.forEach(function(item) {
        console.log("Item variation code", item.variationProductCode);
        if (item.variationProductCode) {
            delete item.variationProductCode;
        }
    });
}
            fetchAndPushToWindowGTM(eventData);
        } catch (error) {
            console.log('Error Occured While Firing Chekout Event', error.message);
        }
    });

    window.globalEventBus.on('useUserCurrentLocation', function (eventData) {
        try {
            fetchAndPushToWindowGTM(eventData);
        } catch (error) {
            console.log("Exception occure in data push in GTM useUserCurrentLocation", error);
        }
    });
    window.globalEventBus.on('userSearchedLocation', function (eventData) {
        try {
            fetchAndPushToWindowGTM(eventData);
        } catch (error) {
            console.log("Exception occure in data push in GTM userSearchedLocation", error);
        }
    });
    window.globalEventBus.on('userStorePickUpLocation', function (eventData) {
        try {
            fetchAndPushToWindowGTM(eventData);
        } catch (error) {
            console.log("Exception occure in data push in GTM userStorePickUpLocation", error);
        }
    });

})(window.dataLayer, window.globalEventBus);
