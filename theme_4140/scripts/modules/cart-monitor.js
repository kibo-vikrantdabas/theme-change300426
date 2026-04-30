/**
 * Watches for changes to the quantity of items in the shopping cart, to update
 * cart count indicators on the storefront.
 */
 define(['modules/jquery-mozu', 'modules/api' , 'hyprlive', 'modules/backbone-mozu' , 'modules/models-cart' , 'underscore' , 'hyprlivecontext','modules/analytics/productPageEvent', 'modules/analytics/checkout-process-gtm', 'modules/garbage-dump'], function ($, api, Hypr, Backbone , CartModels , _ , HyprLiveContext,ProductPageEvent, CheckoutEvents, GarbageHandler) {

    var $cartCount,
        user = require.mozuData('user'),
        userId = user.userId,
        $document = $(document),
        CartMonitor = {
            setCount: function(count) {
                if(this.$el) {
                    this.$el.text(count);
                }
                savedCounts[userId] = count;
                this.checkCount(count);
                $.cookie('mozucartcount', JSON.stringify(savedCounts), { path: '/' });
            },
            addToCount: function(count) {
                this.setCount(this.getCount() + count);
                 CartPopoutInstance.update().then(
                    CartPopoutInstance.view.render() 
                );
            },
            getCount: function() {
                return parseInt(this.$el.text(), 10) || 0;
            },
            checkCount:function(count){
                if(count>0){
                   $('.bag-iconfilled').removeClass('hidden');
                   $('.bag-icon').addClass('hidden');
                   if(count >=100){
                //    $('[data-mz-role="cartmonitor"]').css('left','1px');
                   $('.mz-minicart-popover').css('right','-23px');
                   if (count >=1000){
                    // $('[data-mz-role="cartmonitor"]').css('left','0px');
                    $('.mz-minicart-popover').css('right','-23px');
                  }
                  }else if(count >=10){
                    // $('[data-mz-role="cartmonitor"]').css('left','5px');
                    $('.mz-minicart-popover').css('right','-24px');
                  }else{
                    // $('[data-mz-role="cartmonitor"]').css('left','9px');
                    $('.mz-minicart-popover').css('right','-22px');
                  }
                }else{
                    $('.bag-iconfilled').addClass('hidden');
                    $('.bag-icon').removeClass('hidden');
                }

            },
            update: function() {
                api.get('cartsummary').then(function(summary) {
                    $document.ready(function() {
                        CartMonitor.setCount(summary.count());
                    });
                });
            }
        },
        savedCounts,
        savedCount;

    try {
        savedCounts = JSON.parse($.cookie('mozucartcount'));
    } catch(e) {}

    if (!savedCounts) savedCounts = {};
    savedCount = savedCounts && savedCounts[userId];

    if (isNaN(savedCount)) {
        CartMonitor.update();
    }
    var CartPopout = Backbone.MozuView.extend({
        templateName: "modules/cart/mini-cart",
        additionalEvents:{
           'click .mini-cart-image':'testfunct'
        },
        removeItem:function(e){ 
            var $removeButton = $(e.currentTarget);
            var id = $removeButton.data('mz-cart-item');
            var item = this.model.get("items").get(id);
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
                ProductPageEvent.cartWishlistEvent.gtmObjectFromCart.call(CartData,'remove_from_cart', 'cart');
              } catch (error) {
                 console.log(error.message);
              }
              this.model.removeItem(id);
        },
        checkCartCount:function(){
            var self = this.model.toJSON();
            var items = self.items;
            if(!items.length){
                $('[data-mz-role="cartmonitor"]').css('left','0px');
                //$('.mz-minicart-popover').css('right','-5px');
            }
        },
        setQuantityCount: function() {
            var self = this.model.toJSON();
            var items = self.items;
            self.total = 0;
            self.discountTotal = 0;
            self.cartTotal = 0;
            if(items.length) {
                $('.bag-iconfilled').removeClass('hidden');
                $('.bag-icon').addClass('hidden');
                var overallQuantity = items.reduce(function(acc, i) {
                    return acc + i.quantity;
                }, 0);
                var pageContext = require.mozuData('pagecontext');
                if(pageContext.pageType == "confirmation"){ 
                    CartMonitor.setCount(0); 
                    $('.bag-iconfilled').addClass('hidden');
                    $('.bag-icon').removeClass('hidden');
                }else{
                    CartMonitor.setCount(overallQuantity); 
                }
                this.changeCartCountPosition(overallQuantity);
            } else {
                CartMonitor.setCount(0); 
                $('.bag-iconfilled').addClass('hidden');
                $('.bag-icon').removeClass('hidden');
            }
        },
        goToCart: function() {
            window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory||'') + "/checkout";
            return false;
        },
        checkout: function(e){
            var self = this.model.toJSON();
            var items = self.items;
            var m=this;
            var isAnonymous = require.mozuData('user').isAuthenticated;
            if(!isAnonymous) {
              this.model.isLoading(false); 
                if(items.length){
                   
                    try {
                        CheckoutEvents.fireEvent.call(this.model, 'begin_checkout');
                      } catch (error) {
                        console.log('Error Occured While Fireing Begin Checkout Event', error.message);
                    }

                    window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'').concat('/guestcheckoutsignin');
                }else{
                    window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/cart";
                }
              
            }else{
                if(items.length){
                    
                     try {
                        CheckoutEvents.fireEvent.call(this.model, 'begin_checkout');
                      } catch (error) {
                        console.log('Error Occured While Fireing Begin Checkout Event', error.message);
                      }
                      
                    window.location.href =  (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + '/cart/checkout';
                }else{
                    window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/cart";
                }
            }
           
        },
        checkInventory:function(vpc,locationCode,index,itemsLength){
            
            api
            .request(
              "POST",
              "/api/commerce/inventory/v5/inventory/",
              this.getInventoryPayload(vpc,locationCode)
            )
            .then(function (res) { 
                  var outofStock = false;
                  if(_.isEmpty(res)) window.location.href = '/cart';
                  if(res[0].upc == vpc && res[0].available<=0 ){
                    outofStock=true;
                    window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + '/cart';
                  }
                  if(index == (itemsLength-1) &&  !outofStock){
                    window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + '/cart/checkout';
                  }
            });
          },
          getInventoryPayload:function(variationProductCode,locationCode){
            return {
              requestLocation: {
                locationCode: locationCode,
              },
              type: "ALL",
              items: [
                {
                  "upc":variationProductCode,
                  "quantity": 1
                }
              ],
              includeNegativeInventory: true,
            };
          },
        changeCartCountPosition:function(newQuantity){
            if(newQuantity >=100){
            //  $('[data-mz-role="cartmonitor"]').css('left','1px');
             $('.mz-minicart-popover').css('right','-23px');
             if (newQuantity >=1000){
                // $('[data-mz-role="cartmonitor"]').css('left','0px');
                $('.mz-minicart-popover').css('right','-23px');
              }
            }else if(newQuantity >=10){
            //   $('[data-mz-role="cartmonitor"]').css('left','5px');
              $('.mz-minicart-popover').css('right','-24px');
            }else{
            //   $('[data-mz-role="cartmonitor"]').css('left','9px');
            //   $('.mz-minicart-popover').css('right','-5px');
            }
          },
        render: function(e) {
            this.setQuantityCount();
            this.checkCartCount();
            Backbone.MozuView.prototype.render.apply(this);
        },
        redirectToCart: function() {
          GarbageHandler.session();
        }
    });
    var CartPopoutInstance = {
        update: function() {
            return this.model.apiGet();
        },
        getCount: function () {
            return this.model.isEmpty();
        }
    };

    $document.ready(function () {
      
        var cart = require.mozuData('cart');
        if(savedCount > 0 || cart && cart.count > 0){
            CartMonitor.$el = $('[data-mz-role="cartmonitor"]').text(savedCount);
            $('.bag-iconfilled').removeClass('hidden');
            $('.bag-icon').addClass('hidden');
            $('[data-mz-role="cartmonitor"]').animate({opacity: 1}, 500);
        }else{
            $('.bag-iconfilled').addClass('hidden');
            $('.bag-icon').removeClass('hidden');
            $('[data-mz-role="cartmonitor"]').removeClass('mz-change-cart-icon');
        }
        CartPopoutInstance.model  = new CartModels.Cart();
        CartPopoutInstance.view = new CartPopout({
            el: $('.cart-popover-view'),
            model: CartPopoutInstance.model
        });
        
        CartPopoutInstance.update().then(
            CartPopoutInstance.view.render() 
        );

        CartPopoutInstance.model.on('checkoutcreated', function (order) {
            window.location =  (HyprLiveContext.locals.siteContext.siteSubdirectory||'') + '/checkout/'+ order.prop('id');
        });

        window.CartPopoutInstance = CartPopoutInstance;
       
        CartMonitor.$el = $('[data-mz-role="cartmonitor"]').text(savedCount || 0);

        if (HyprLiveContext.locals.themeSettings.akamaiEdgeControlEnabled) {
          try {
            
            var user = JSON.parse(atob($.cookie("_mzPc"))).user;
            if (user.isAnonymous || !user.isAuthenticated) {
              $(".logged-in").hide();
              $(".guest-user").show();
            } else {
              $(".logged-in").show();
              $(".guest-user").hide();
            }
            var userInfo = require.mozuData('user');
            var prevUserId = $.cookie('prevUserId');
            if(!userInfo.isAuthenticated) {
                if(prevUserId) {
                    if(prevUserId !== userInfo.userId) {
                        var cookies = $.cookie();
                        for(var cookie in cookies) {
                            $.removeCookie(cookie, { path: '/' });
                        }
                        $.cookie('prevUserId',userInfo.userId, { path: '/' });
                    }
                }
                else{
                    $.cookie('prevUserId',userInfo.userId, { path: '/' });
                }
            }
          } catch (err) {
            console.error(err);
          }
        }
    });

    return CartMonitor;

});