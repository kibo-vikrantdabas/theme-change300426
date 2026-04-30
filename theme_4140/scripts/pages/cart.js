//const { indexOf } = require("underscore");

define(['modules/api',
        'modules/backbone-mozu',
        'underscore',
        'modules/jquery-mozu',
        'modules/models-cart',
        'modules/cart-monitor',
        'hyprlivecontext',
        'hyprlive',
        'modules/preserve-element-through-render',
        'modules/modal-dialog',
        'modules/xpress-paypal',
        'modules/models-location',
        'modules/views-location',
        'modules/amazonPay',
        'modules/applepay',
        'modules/cart/discount-dialog/views-discount-dialog',
        'modules/models-discount',
        'modules/message-handler',
        'modules/mobile-sticky-header',
        'modules/analytics/checkout-gtm',
        "modules/analytics/productPageEvent",
        'modules/analytics/checkout-process-gtm',
        'modules/garbage-dump'
], function (api, Backbone, _, $, CartModels, CartMonitor, HyprLiveContext, Hypr, preserveElement, modalDialog, paypal, LocationModels, LocationViews, AmazonPay, ApplePay, DiscountModalView, Discount, MessageHandler, StickyHeader,CheckoutGTM,ProductPageEvent, CheckoutEvents, GarbageHandler) {

    var ThresholdMessageView = Backbone.MozuView.extend({
      templateName: 'modules/cart/cart-discount-threshold-messages'
    });
    var eventData = {
      eventCategory: 'cart page'
    };

    var CartView = Backbone.MozuView.extend({
        templateName: "modules/cart/cart-table",
        additionalEvents: {
          "click .sth-fulfillment" : "setSTHFulfillmentMethod"
        },
        initialize: function () {
            var me = this;
            this.listenTo(this.model, 'change:couponCode', this.onEnterCouponCode, this);
            if(me.model.get("selectedFulfillmentMethod") == "Ship") {
              this.model.set('isFulfillmentMethodAction', true);
              this.model.assignSTHFulfillment(true);
            }else {
              this.model.set('isFulfillmentMethodAction', true);
              var selectedLocation;
              if(sessionStorage.getItem('userSelectedLocation')){
                selectedLocation = sessionStorage.getItem('userSelectedLocation');
              }
              if(selectedLocation){
                this.model.assignPickupLocation(JSON.parse(selectedLocation));
              } else {
                var defaultPickupLocation = {
                  code: this.model.get('selectedLocation'),
                  name: this.model.get('defaultLocation'),
                  address: this.model.get('defaultLocationAddress'),
                  geo: window.storeGeo
                };
                sessionStorage.setItem('userSelectedLocation', JSON.stringify(defaultPickupLocation));
                this.model.assignPickupLocation(defaultPickupLocation);
              }
            }
            this.listenTo(this.model, 'change:nearestLocation', this.render);
            this.listenTo(this.model, 'change:isModalReady', this.render);
            this.codeEntered = !!this.model.get('couponCode');
            this.$el.on('keypress', 'input', function (e) {
                if (e.which === 13) {
                    if (me.codeEntered) {
                    me.handleEnterKey();
                    }
                    return false;
                }
            });

            AmazonPay.init(true);
            this.listenTo(this.model.get('items'), 'quantityupdatefailed', this.onQuantityUpdateFailed, this);

            var visaCheckoutSettings = HyprLiveContext.locals.siteContext.checkoutSettings.visaCheckout;
            var pageContext = require.mozuData('pagecontext');
            if (visaCheckoutSettings.isEnabled) {
                window.onVisaCheckoutReady = initVisaCheckout;
                require([pageContext.visaCheckoutJavaScriptSdkUrl], initVisaCheckout);
            }

            me.messageView = new ThresholdMessageView({
              el: $('#mz-discount-threshold-messages'),
              model: this.model
            });

            try {
              if(this.model.get('items').length) CheckoutEvents.fireEvent.call(this.model, 'view_cart');
            } catch (error) {
              console.log('Something Went Wrong While Firing view_cart event');
            }

            CheckoutGTM.userPickupLocation("M&S, Dubai Festival City");
        },
        render: function() {
            preserveElement(this, ['.v-button', '.p-button', '#AmazonPayButton', '#applePayButton'], function() {
                Backbone.MozuView.prototype.render.call(this);
            });
            var me = this;
            // normally we preserveElement on the apple pay button, but we hide it if a change to the cart 
            // has lead the total price to be $0. Apple doesn't like $0 orders
            if (ApplePay && ApplePay.scriptLoaded) ApplePay.hideOrShowButton();
            // this.messageView.render();

            //Needed scroll functionality to create sticky header
           /* $(window).scroll(function () {
              var scrolled_val = $(document).scrollTop().valueOf();
              // window.scrollTo(scrolled_val, 0);
              // $(window).unbind('scroll');
            });*/

            $(".mz-carttable-footer #mz-total-saving-cart").click(function(){
              $(this).toggleClass('mz-collapse-active');
              $(".mz-carttable-footer #mz-discount-cart-section").slideToggle();
            });
            //error message -OOS
            if ( $(".mz-cart .mz-carttable-item-v2 .mz-oos-stock-avail").length > 0) {   
              $(".mz-cart #mz-oos-stock-errMsg").show();
            }
         
          $(".mz-item-link .mz-carttable-item-image").on("click", function(e){
            if (window.globalEventBus) {
              eventData.custom_event="cart page";
              eventData.event_params.event_act = "revisit pdp page";
              eventData.event_params.event_lbl = me.model.apiModel.data.items[0].product.name + " | " + me.model.apiModel.data.items[0].product.productCode;
              window.globalEventBus.emit('dataLayerEvent', eventData);
            }
          });
            $(".mz-carttable-item-v2 .mz-carttable-item-product .mz-oos-error-msg").attr('style', 'display: flex !important');
            //sticky checkout cart
            this.stickyCheckoutBtn();
            this.checkWishlistItem();

        },
        setSTHFulfillmentMethod: function(e) {
          this.model.set('isFulfillmentMethodAction', true);
          this.model.assignSTHFulfillment();
        },
        setPickupFulfillmentMethod: function() {
          var self = this;

          self.model.set('isFulfillmentMethodAction', true);

          if(self.model.get('selectedFulfillmentMethod') !== "Pickup"){
            var selectedLocation;
            if(sessionStorage.getItem('userSelectedLocation')){
              selectedLocation = sessionStorage.getItem('userSelectedLocation');
            } 
            if(selectedLocation){
              self.model.assignPickupLocation(JSON.parse(selectedLocation));
            } else {
              var defaultPickupLocation = {
                code: this.model.get('selectedLocation'),
                name: this.model.get('defaultLocation'),
                address: this.model.get('defaultLocationAddress'),
                geo: window.storeGeo
              };
              sessionStorage.setItem('userSelectedLocation', JSON.stringify(defaultPickupLocation));
              self.model.assignPickupLocation(defaultPickupLocation);
            }
  
            //if it is indeed the radio button
              //call seperate function first, then this stuff
              //to at least set it
              //leave notes for not triggering rest of modal
            this.changeFulfillmentMethod();

          }

          CheckoutGTM.userPickupLocation();
        },
        updateQuantity: _.debounce(function (e) {
          this.model.set('isWishlistAction', false);
          this.model.set('isRemoveFromCartAction', false);
          this.model.set('isFulfillmentMethodAction', false);

            var $qField = $(e.currentTarget),
                newQuantity = parseInt($qField.val(), 10),
                id = $qField.data('mz-cart-item'),
                item = this.model.get("items").get(id),
                oldQuantity = item.get('quantity'),
                CartData={};
            if (item && !isNaN(newQuantity)) {
                  CartData ={
                    productName:item.get("product").get("name"),
                    productCode:item.get("product").get("productCode"),
                    price:item.get("product").get("price").get('price'),
                    productQuantity: newQuantity > oldQuantity? (newQuantity - oldQuantity):newQuantity,
                    removedQuantity:newQuantity < oldQuantity ? (oldQuantity - newQuantity) : newQuantity,
                    variationProductCode: item.get("product").get("variationProductCode"),
                    removeFlag:false
                };
                  item.get("product").get("options").each(function(op,index){
                    if(op.get('attributeFQN') == "tenant~colour" || op.get('attributeFQN') == "tenant~color"){
                        CartData.color= op.get('stringValue');
                    
                    }
                  });
                if(newQuantity < oldQuantity){
                  try {
                     ProductPageEvent.cartWishlistEvent.gtmObjectFromCart.call(CartData,'remove_from_cart', 'cart');
                  } catch (error) {
                    console.log(error.message);
                  }
                 
                }else if(newQuantity > oldQuantity){
                  try {
                    ProductPageEvent.cartWishlistEvent.gtmObjectFromCart.call(CartData, 'add_to_cart', 'cart');
                    ProductPageEvent.cartWishlistEvent.UpdateQunatityOnDecrease.call(this,CartData);
                  } catch (error) {
                    console.log(error.message);
                  }
                }
                item.set('quantity', newQuantity);
                item.saveQuantity();
                this.changeCartCountPosition(newQuantity);
                $(".mz-cart .mz-item-removed-message-container").remove();
            }
        },400),
        onQuantityUpdateFailed: function(model, oldQuantity) {
            var field = this.$('[data-mz-cart-item=' + model.get('id') + ']');
            if (field) {
                field.val(oldQuantity);
            }
            else {
                this.render();
            }
        },
        addToWishlist: function (e) {
          // GTM code for cart page add to wishlist 10.a.3
          var cartItemId = $(e.currentTarget).data('mz-cart-item');
          var cartItem = this.model.get("items").get(cartItemId);
    
         
        },
        removeItem: function(e) {
            if(require.mozuData('pagecontext').isEditMode) {
                // 65954
                // Prevents removal of test product while in editmode
                // on the cart template
                return false;
            }

            var $removeButton = $(e.currentTarget);
            var id = $removeButton.data('mz-cart-item');
            var itemUpc = $removeButton.data('mz-cart-item-upc');
            var me = this;

          var productName = $(e.currentTarget);
          var productPrice;
          var productQuantity;
          var cartData ={};
          
          if (this.model.get("items").models && this.model.get("items").models.length > 0) {
            _.filter(this.model.get("items").models, function (item) {
              if (item.get("id") == id) {
                productPrice = item.attributes.total;
                productQuantity = item.attributes.quantity;
                cartData.productQuantity = item.attributes.quantity;
                cartData.productName=item.get("product").get("name");
                cartData.productCode=item.get("product").get("productCode");
                cartData.price=item.get("product").get("price").get('price');
                cartData.productQuantity= item.get("quantity");
                cartData.variationProductCode= item.get("product").get("variationProductCode");
                cartData.removeFlag =true;
                item.get("product").get("options").each(function(op,index){
                  if(op.get('attributeFQN') == "tenant~colour"){
                      
                      cartData.color = op.get('stringValue');
                  }
                });
      
              }
            })[0];
          }
           
          this.model.set('isRemoveFromCartAction', true);
            this.model.removeItem(id).then(function(){

              try {
                  ProductPageEvent.cartWishlistEvent.gtmObjectFromCart.call(cartData,'remove_from_cart', 'cart');
              } catch (error) {
                console.log(error.message);
              }
              //product remove from cart message
	            $(".mz-cart .mz-item-removed-message-container").remove();
	            var itemName = $removeButton.data('mz-cart-item-name');
	            var itemUrl = $removeButton.data('mz-cart-item-url');
	            var removeMsg = "<div class='mz-item-removed-message-container'><div class='mz-item-removed-main'><img src='../../resources/images/icons/svg/Tick-Green.svg' width='26' height='26' class='mz-item-removed-tick-icon'></div><div class='mz-item-removed-content'><strong class='mz-item-removed-head'>"+Hypr.getLabel("allDone")+"</strong><br><span><a href='"+ itemUrl +"' class='mz-item-removed-product-link'>"+ itemName +" </a></span><span class='mz-item-removed-title'>"+Hypr.getLabel("cartMessage")+"</span></div><div class='mz-item-remove-popup'><img src='../../resources/images/icons/svg/close.svg' width='21' height='18' alt='remove-btn' data-mz-action='removePopupMsg'></img></div></div>";
	            $(removeMsg).insertAfter('.mz-cart .mz-cart-multiple-location-message');
	            $('html,body').animate({
	                scrollTop: $(".mz-cart-multiple-location-message").offset().top},
	            'slow');
              me.removePopupMsg();
            });
            
            //remove discount FREE product
            setTimeout(function() {
              me.model.get("items").forEach(function(item){
                if (item.get("product").get("upc") === itemUpc) {
                  var itemId = item.get("id");
                  me.model.removeItem(itemId);
                  me.render();
                }
              });
            }, 1200);
            return false;
        },
        removePopupMsg : function(){
          $(".mz-item-remove-popup").click(function(){
            $(".mz-cart .mz-item-removed-message-container").hide();
          });
        },
        updateAutoAddItem: function(e) {
            var self = this;
            var $target = $(e.currentTarget);
            var discountId = $target.data('mz-discount-id');
            var itemId = $target.data('mz-cart-item');
            window.cartView.discountModalView.updateSelectedAutoAddItem(itemId, discountId);
        },
        changeCartCountPosition:function(newQuantity){
          if(newQuantity >=100){
            // $('[data-mz-role="cartmonitor"]').css('left','1px');
            $('.mz-minicart-popover').css('right','-22px');
            if (newQuantity >=1000){
              //  $('[data-mz-role="cartmonitor"]').css('left','0px');
               $('.mz-minicart-popover').css('right','-22px');
             }
           }else if(newQuantity >=10){
            //  $('[data-mz-role="cartmonitor"]').css('left','5px');
             $('.mz-minicart-popover').css('right','-22px');
           }else{
            //  $('[data-mz-role="cartmonitor"]').css('left','9px');
             $('.mz-minicart-popover').css('right','-22px'); 
           }
        },
        empty: function() {
            this.model.apiDel().then(function() {
                window.location.reload();
            });
        },
        changeStore: function(e){
          //click handler for change store link.launches store picker
          var cartItemId = $(e.currentTarget).data('mz-cart-item');
          var cartItem = this.model.get("items").get(cartItemId);
          var productCode = cartItem.apiModel.data.product.variationProductCode || cartItem.apiModel.data.product.productCode;
          this.pickStore(productCode, cartItemId);
        },
        hideModal: function() {
          var me = this;
          me.pickerDialog.hide();
        },
        pickStore: function(productCode, cartItemId){
          var me = this;

          var locationsCollection = new LocationModels.LocationCollection();
          window.loc = locationsCollection;
          

          locationsCollection.apiGetForProduct({productCode: productCode}).then(function(collection){
            locationsCollection.get('items').forEach(function(item){
              me.model.get('storeLocationsCache').addLocation({code: item.get('code'), name: item.get('name')});
            });

            var $bodyElement = $('#mz-location-selector').find('.modal-body');
            $bodyElement.attr('mz-cart-item', cartItemId);
            if (collection.length === 0){
              me.pickerDialog.setBody(Hypr.getLabel("noNearbyLocationsProd"));
            } else {
              //me.pickerDialog.setBody(me.makeLocationPickerBody(locationsCollection, cartItemId));
            }
            me.pickerDialog.show();

          }, function(error){
            //error
          });

        },
        getInventoryData: function(id, productCode){
          //Gets basic inventory data based on product code.
          return window.cartView.cartView.model.get('items').get(id).get('product').apiGetInventory({
            productCode: productCode
          });
        },
        changeFulfillmentMethod: function(e){
          
          var me = this;

          if(window.cartView.locationView){
            window.cartView.locationView.resetModal();
            window.cartView.locationView.modal.show();
          } else {
            //this.buildCartLocationModal();
            window.cartView.locationView.modal.show();
          }
        },
        assignPickupLocation: function(selectedStoreData){
          //called by Select Store button from store picker dialog.
          //Makes the actual change to the item using data held by the button
          //in the store picker.
          CheckoutGTM.userPickupLocation();
          this.model.assignPickupLocation(selectedStoreData);
        },
        proceedToCheckout: function () {
            //commenting  for ssl for now...
            //this.model.toOrder();
            // return false;
            // this.model.isLoading(true);
            if(this.model.get('selectedFulfillmentMethod') === "Pickup") {
              if(!this.model.get('isGiftHamper')){
                if(sessionStorage.getItem('userSelectedLocation')){
                  this.model.assignPickupLocation(JSON.parse(sessionStorage.getItem('userSelectedLocation')));
                }
                else {
                  return false;
                }
              } else{
                $('.mz-messagebar').html('<div class="mz-messagebar" data-mz-message-bar=""><ul class="is-showing mz-errors"><li class="mz-message-item">'+Hypr.getLabel('giftHamperClickCollectMsg')+'</li></ul></div>');
                return false;
              }
            } 

            if(this.model.get('selectedFulfillmentMethod') === 'Ship'){
              var triggerFromCheckout= true;
              this.model.assignSTHFulfillment(triggerFromCheckout);
            }

            var $form = $('#cartform');
            var isAnonymous = require.mozuData('user').isAuthenticated;
            try {
              CheckoutEvents.fireEvent.call(this.model, 'begin_checkout');
            } catch (error) {
              console.log('Error Occured While Fireing Begin Checkout Event', error.message);
              var errorMessageNode = $('#cartform .mz-messagebar .mz-errors .mz-message-item');
              if((errorMessageNode.text()).length > 0){
                  setTimeout(function(){
                      window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/cart";
                  },2500);
              }
            }

            GarbageHandler.session(); // Delete All Exisitng EPG Info
            
            if(!isAnonymous) {
              // this.model.isLoading(false); 
              this.signInUser();
            } else {
              if (this.model.toJSON().items.length > 1) {
                setTimeout(function() {
                  $form.attr('action', (HyprLiveContext.locals.siteContext.siteSubdirectory || '') +  "/cart/checkout");
                  $form.submit();
                }, 1500);
              }
              else {
                $form.attr('action', (HyprLiveContext.locals.siteContext.siteSubdirectory || '') +  "/cart/checkout");
                $form.submit();
              }
            }
            return false;
        },
        signInUser: function() {
            window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'').concat('/guestcheckoutsignin');
        },
        stickyCheckoutBtn: function() {
          GarbageHandler.session(); // Delete All Exisitng EPG Info
          
          if ($(window).width() <= 992) {
            $(window).scrollTop($(window).scrollTop()+1);
            $(window).scroll(function(){
              var myElement = document.getElementById('mz-carttable-total-row ');
              if(myElement) {
                  var bounding = myElement.getBoundingClientRect();
                  var myElementHeight = myElement.offsetHeight;
                  var myElementWidth = myElement.offsetWidth;
                  if (bounding.top >= -myElementHeight && bounding.left >= -myElementWidth && bounding.right <= (window.innerWidth || document.documentElement.clientWidth) + myElementWidth && bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) + myElementHeight) {
                    $('.mz-sticky-checkout .cart-sticky-checkout-total .mz-carttable-total-wrap').appendTo('.mz-carttable-total-row');
                    $('.mz-sticky-checkout .cart-sticky-checkout-btn .mz-carttable-checkout-btn').appendTo('.mz-carttable-checkout-row');
                    $('.mz-sticky-checkout').removeClass("show-for-sticky");
                    $('.mz-carttable-footer').removeClass('hide-content-empty');
                  } else {
                    $('.mz-carttable-total-row .mz-carttable-total-wrap').appendTo('.mz-sticky-checkout .cart-sticky-checkout-total');
                    $('.mz-carttable-checkout-row .mz-carttable-checkout-btn').appendTo('.mz-sticky-checkout .cart-sticky-checkout-btn');
                    $('.mz-sticky-checkout').addClass("show-for-sticky");
                    if($('.mz-carttable-footer .mz-carttable-ordervalue').length <= 0) {
                      $('.mz-carttable-footer').addClass('hide-content-empty');
                    }
                  }
              }
            });
          }
        },
        checkWishlistItem: function() {
          var self = this;
          if(require.mozuData("user").isAuthenticated){
            api.request("GET", "/api/commerce/wishlists")
            .then(function(wishlistsData) {
              if(wishlistsData.items.length > 0) {
                api.request("GET", "/api/commerce/wishlists/customers/"+ require.mozuData("user").accountId +"/my_wishlist")
                .then(function(wishlistData) {
                  var wishlistItemModel = wishlistData.items;
                  $('.mz-table-cart .mz-saved-wishlist-items #wishlist-count').text(wishlistItemModel.length);
                  if (wishlistItemModel.length > 0) {
                    self.model.get("items").forEach(function(item){
                      var itemUpc = item.get("product").get("upc");
                      var isFound = JSON.stringify(wishlistItemModel).includes(itemUpc);
                      if (isFound) {
                        $('.mz-carttable-save-later .remove-'+itemUpc).show();
                        $('.mz-carttable-save-later .add-'+itemUpc).hide();
                      }else {
                        $('.mz-carttable-save-later .remove-'+itemUpc).hide();
                        $('.mz-carttable-save-later .add-'+itemUpc).show();
                      } 
                    });
                  }
                });
              }
            });
          } else {
            var wishlisteItemObject = JSON.parse(($.cookie("guestWishlistN"))? ($.cookie("guestWishlistN")): false);
            if(wishlisteItemObject.length > 0){
              $('.mz-table-cart .mz-saved-wishlist-items #wishlist-count').text(wishlisteItemObject.length);
            }
          }
        },
        addToWishlistCart: function(e) {
          // this.model.set('isLoading', false);
          
          this.model.set('isWishlistAction', true);
          var me = this;
          var $saveForLaterBtn = $(e.currentTarget);
          var itemId = $saveForLaterBtn.data('mz-cart-item');
          var item = this.model.get("items").get(itemId);
          var accountID = require.mozuData("user").accountId;
          // this.model.isLoading(false);
          var postData = {
            quantity: item.get("quantity"),
            currencyCode: "AED",
            localeCode: "en-US",
            product: {
              productCode: item.get("product").get("productCode"),
              variationProductCode: item.get("product").get("variationProductCode"),
              options: item.get("product").get("options"),
            },
          };
          // GTM code for cart page add to wishlist 10.a.3
          var cartItemId = $(e.currentTarget).data('mz-cart-item');
          var cartItem = this.model.get("items").get(cartItemId);
   
          var CartData ={
            productName:item.get("product").get("name"),
            productCode:item.get("product").get("productCode"),
            price:item.get("product").get("price").get('price'),
            productQuantity: item.get("quantity"),
            variationProductCode: item.get("product").get("variationProductCode"),
            removeFlag:true
         };

          item.get("product").get("options").each(function(op,index){
            if(op.get('attributeFQN') == "tenant~colour"){
                CartData.color= op.get('stringValue');
            }
          });

          try {
            ProductPageEvent.cartWishlistEvent.gtmObjectFromCart.call(CartData,'add_to_wishlist', 'wishlist');
          } catch (error) {
            console.log(error.message);
          }
          
          if (!require.mozuData("user").isAuthenticated || require.mozuData("user").isAnonymous) {
            // me.model.isLoading(true);
            var wishlistArray = [];
            var wishlisteItemObject = ($.cookie("guestWishlistN"))? ($.cookie("guestWishlistN")): false; 
            if (wishlisteItemObject.length === 0 || !wishlisteItemObject){
              wishlisteItemObject=[];
              wishlistArray.push(
                { 
                  itemProductCode : item.get("product").get("productCode"),
                  itemVPC : item.get("product").get("variationProductCode"),
                }
              );
              $.cookie("guestWishlistN" , JSON.stringify(wishlistArray), { path: '/', expires: 1 });
              $('#wishlist-count').text(parseInt($('#wishlist-count').text())+1);
              // me.model.isLoading(false);
              me.model.removeItem(itemId);
              me.displayWishlistCount();
            } else {
              wishlisteItemObject=JSON.parse(wishlisteItemObject);
              var checkIfexist = false;
              wishlisteItemObject.forEach(function(items){
                if(items.itemVPC == item.get("product").get("variationProductCode")){
                  checkIfexist = true;
                }
                wishlistArray.push(items);
              });
              if(!checkIfexist){
                wishlistArray.push(
                  { 
                      itemProductCode : item.get("product").get("productCode"),
                      itemVPC : item.get("product").get("variationProductCode"),
                  }
                );
              }
              $('#wishlist-count').text(parseInt($('#wishlist-count').text())+1);
              // me.model.isLoading(false);
              me.model.removeItem(itemId);
              $.cookie("guestWishlistN" , JSON.stringify(wishlistArray), { path: '/', expires: 1 });
              me.displayWishlistCount();
            }
          } else {
            // me.model.isLoading(true);
            api
              .request(
                "GET",
                "/api/commerce/wishlists/customers/" + accountID + "/my_wishlist"
              )
              .then(function (wishlist) {
                var wishlistId = wishlist.id;
                api
                  .request(
                    "POST",
                    "/api/commerce/wishlists/" + wishlistId + "/items/",
                    postData
                  )
                  .then(
                    function (wishlistitem) {
                      // me.model.isLoading(false);
                      window.WishilistPopoutInstance.update().then(
                        window.WishilistPopoutInstance.view.render()
                      );
                      // $('.mz-carttable-save-later .remove-'+item.get("product").get("productCode")).show();
                      // $('.mz-carttable-save-later .add-'+item.get("product").get("productCode")).hide();
                      $('#wishlist-count').text(parseInt($('#wishlist-count').text())+1);
                      me.model.removeItem(itemId);
                      me.displayWishlistCount();
                    },
                    function (e) {
                      console.log("Error :: ", e);
                      // me.model.isLoading(false);
                    }
                  )
                  .catch(function (err) {
                    console.log("Error occurred  :: ", err);
                    // me.model.isLoading(false);
                  });
              })
              .catch(function (errData) {
                me.createWishlist(itemId);
                // me.model.isLoading(false);
              });
          }
        },
        removeFromWishlist: function(e) {
          var me = this;
          var $unsaveForLaterBtn = $(e.currentTarget);
          var currentItemUpc = $unsaveForLaterBtn.data('upc-code');
          var accountID = require.mozuData("user").accountId;
          // me.model.isLoading(true);
          api
          .request(
            "GET",
            "/api/commerce/wishlists/customers/" + accountID + "/my_wishlist"
          )
          .then(function (wishlist) {
            var wishlistId = wishlist.id;
            api
              .request(
                "GET",
                "/api/commerce/wishlists/" + wishlistId + "/items/"
              )
              .then(function (wishlistData) {
                wishlist.items.forEach(function(wishlistItem){
                  var wishlistItemId = wishlistItem.id;
                  var wishlistItemUpc = wishlistItem.product.productCode;
                  if(wishlistItemUpc == currentItemUpc){
                    api
                    .request(
                      "DELETE",
                      "/api/commerce/wishlists/" + wishlistId + "/items/" + wishlistItemId
                    )
                    .then(function(){
                      // me.model.isLoading(false);
                      window.WishilistPopoutInstance.update().then(
                        window.WishilistPopoutInstance.view.render()
                      );
                      // $('.mz-carttable-save-later .remove-'+currentItemUpc).hide();
                      // $('.mz-carttable-save-later .add-'+currentItemUpc).show();
                      $('#wishlist-count').text(parseInt($('#wishlist-count').text())-1);
                      me.displayWishlistCount();
                    });
                  }
                });
              });
          });
        },
        addItemToWishlist: function(itemId, wishlistId) {
          var me = this;
          var item = this.model.get("items").get(itemId);
          var postData = {
            quantity: item.get("quantity"),
            currencyCode: "AED",
            localeCode: "en-US",
            product: {
              productCode: item.get("product").get("productCode"),
              variationProductCode: item.get("product").get("variationProductCode"),
              options: item.get("product").get("options"),
            },
          };
          // GTM code for cart page add to wishlist 10.a.3
          var cartItem = this.model.get("items").get(itemId);
          // me.model.isLoading(true);
          api
            .request(
              "POST",
              "/api/commerce/wishlists/" + wishlistId + "/items/",
              postData
            )
            .then(
              function (wishlistitem) {
                // me.model.isLoading(false);
                window.WishilistPopoutInstance.update().then(
                  window.WishilistPopoutInstance.view.render()
                );
                // $('.mz-carttable-save-later .remove-'+item.get("product").get("upc")).show();
                // $('.mz-carttable-save-later .add-'+item.get("product").get("upc")).hide();
                $('#wishlist-count').text(parseInt($('#wishlist-count').text())+1);
                me.model.removeItem(itemId);
              },
              function (e) {
                console.log("Error :: ", e);
                // me.model.isLoading(false);
              }
            )
            .catch(function (err) {
              console.log("Error occurred  :: ", err);
              // me.model.isLoading(false);
            });
        },
        createWishlist: function(itemId) {
          var me = this;
          var postData = {
            name: "my_wishlist",
          };
          api
            .request("POST", "/api/commerce/wishlists/", postData)
            .then(function (wishlist) {
              // console.log("Created Wishlist!");
              var wishlistId = wishlist.id;
              me.addItemToWishlist(itemId, wishlistId);
            })
            .catch(function (errData) {
              console.log("Error : ", errData);
            });
        },
        deleteWishlist: function() {
          var wishlistModel = window.wishlistItemModel.get("wishlist");
          var wishlistId = wishlistModel.get("wishlistId");
          api.request("DELETE", "/api/commerce/wishlists/"+wishlistId)
          .then(function (wishlistitem) {
            console.log("Deleted Wishlist!");
          });
        },
        addCoupon: function () {
            var self = this;
            this.model.addCoupon().ensure(function () {
                self.model.unset('couponCode');
                self.render();
            });
        },
        onEnterCouponCode: function (model, code) {
            if (code && !this.codeEntered) {
                this.codeEntered = true;
                this.$el.find('#cart-coupon-code').prop('disabled', false);
            }
            if (!code && this.codeEntered) {
                this.codeEntered = false;
                this.$el.find('#cart-coupon-code').prop('disabled', true);
            }
        },
        autoUpdate: [
            'couponCode'
        ],
        handleEnterKey: function () {
            this.addCoupon();
        },
        buildCartLocationModal: function() {
          var self = this;
          var storePickupModalView = new LocationViews.CartStoreFinder({
            model: new LocationModels.StoreFinder(),
            el: $('#mz-location-selector')
          });
          var purchaseLocation;
          self.model.get('items').each(function(item){
            if(item.get('purchaseLocation')){
              purchaseLocation = item.get('purchaseLocation');
            }
          });
          if(sessionStorage.getItem('userSelectedLocation')){
            var loc = JSON.parse(sessionStorage.getItem('userSelectedLocation'));
            storePickupModalView.model.set('nearestLocation', loc.name);
            storePickupModalView.model.set('selectedLocation', loc.name);
          } else {
            storePickupModalView.model.set('nearestLocation', self.model.get('defaultLocation'));
            storePickupModalView.model.set('selectedLocation', self.model.get('defaultLocation'));
          }

          //add ininital selected dropdown too
          storePickupModalView.on('assignPickupLocation', function(selectedStoreData){
            self.assignPickupLocation(JSON.parse(selectedStoreData));
          });
          window.cartView.locationView = storePickupModalView;
        },
        displayWishlistCount: function(e){
          if(require.mozuData("user").isAuthenticated){
            api.request("GET", "/api/commerce/wishlists")
            .then(function(wishlistsData) {
              if(wishlistsData.items.length > 0) {
                api.request("GET", "/api/commerce/wishlists/customers/"+ require.mozuData("user").accountId +"/my_wishlist")
                .then(function(wishlistData) {
                  var wishlistItemModel = wishlistData.items;
                  if (wishlistItemModel.length > 0) {
                    $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').html('<span class="wishlist-count">'+wishlistItemModel.length+ '</span>');
                    $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon').hide();
                    $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon-green').show();
                    $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').show();
                  }
                  else {
                    $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').html('<span class="wishlist-count">0</span>');
                    $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').hide();
                    $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon').show();
                    $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon-green').hide();
                  }
                });
              }
            });
          } else {
            var wishlisteItemObject = JSON.parse(($.cookie("guestWishlistN"))? ($.cookie("guestWishlistN")): false);
            if(wishlisteItemObject.length > 0){
              $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').html('<span class="wishlist-count">'+wishlisteItemObject.length+ '</span>');
              $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon').hide();
              $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon-green').show();
              $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').show();
            }
            else {
              $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').html('<span class="wishlist-count">0</span>');
              $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').hide();
              $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon').show();
              $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon-green').hide();
            }
          }
        }
    });

  function renderVisaCheckout(model) {

    var visaCheckoutSettings = HyprLiveContext.locals.siteContext.checkoutSettings.visaCheckout;
    var apiKey = visaCheckoutSettings.apiKey;
    var clientId = visaCheckoutSettings.clientId;

    //In case for some reason a model is not passed
    if(!model) {
      model = CartModels.Cart.fromCurrent();
    }

    function initVisa(){
      var delay = 200;
      if(window.V) {
          window.V.init({
            apikey: apiKey,
            clientId: clientId,
            paymentRequest: {
                currencyCode: model ? model.get('currencyCode') : 'USD',
                subtotal: "" + model.get('subtotal')
            }});
          return;
        }
        _.delay(initVisa, delay);
    }

    initVisa();

  }
    /* begin visa checkout */
    function initVisaCheckout () {
      if (!window.V) {
          //window.console.warn( 'visa checkout has not been initilized properly');
          return false;
      }

      // on success, attach the encoded payment data to the window
      // then turn the cart into an order and advance to checkout
      window.V.on("payment.success", function(payment) {
          // payment here is an object, not a string. we'll stringify it later
          var $form = $('#cartform');

          _.each({

              digitalWalletData: JSON.stringify(payment),
              digitalWalletType: "VisaCheckout"

          }, function(value, key) {

             $form.append($('<input />', {
                  type: 'hidden',
                  name: key,
                  value: value
              }));

          });

          $form.submit();

      });
    }
    /* end visa checkout */


    $(document).ready(function() {
      StickyHeader.onPageLoad();
      StickyHeader.hideSearchBar();
      StickyHeader.searchBoxIconMobileToggle();
        var cartModel = CartModels.Cart.fromCurrent(),
            cartViews = {
                cartView: new CartView({
                    el: $('#cart'),
                    model: cartModel,
                    messagesEl: $('[data-mz-message-bar]')
                }),
                discountModalView: new DiscountModalView({
                    el: $("[mz-modal-discount-dialog]"),
                    model: cartModel.get('discountModal'),
                    messagesEl: $("[mz-modal-discount-dialog]").find('[data-mz-message-bar]')
                }) 
                
            }; 
        cartModel.on('ordercreated', function (order) {
            // cartModel.isLoading(true);
            window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory||'') + '/checkout/' + order.prop('id');
        });

        cartModel.on('sync', function() {
            CartMonitor.setCount(cartModel.count());
            window.CartPopoutInstance.update();
        });
        
        cartModel.checkBOGA() 
        window.cartView = cartViews;
        
        cartViews.cartView.buildCartLocationModal();

        CartMonitor.setCount(cartModel.count());

        cartViews.cartView.render();
        //if (cartModel.get('discountModal').get('discounts').length) {
            cartViews.discountModalView.render(); 
        //}
        renderVisaCheckout(cartModel);

        MessageHandler.showMessage("BulkAddToCart");

        paypal.loadScript();
        if (cartModel.count() > 0){
          ApplePay.init();
        }
        if (AmazonPay.isEnabled && cartModel.count() > 0)
            AmazonPay.addCheckoutButton(cartModel.id, true);
    });
});
