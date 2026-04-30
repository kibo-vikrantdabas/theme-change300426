require(["modules/jquery-mozu", "underscore", "hyprlive", "modules/backbone-mozu", "modules/cart-monitor", "modules/models-product", "hyprlivecontext", "vendor/slick-carousel/slick/slick", 'modules/modal-dialog','modules/api', 'modules/preserve-element-through-render', 'modules/mobile-checker', "modules/analytics/productPageEvent", "modules/views-productimages"], function ($, _, Hypr, Backbone, CartMonitor, ProductModels, HyprLiveContext, slick, modalDialog,api, preserveElements, MobileChecker, ProductPageEvent, ProductImageViews) {

  function getExistingNotifications() {
    return ($.cookie('mozustocknotify') || '').split(',');
}
function getExistingNotificationsGuest() {
  return ($.cookie('mozustocknotifyguest') || '').split(',');
}

function saveNotification(productCode) {
    var existing = getExistingNotifications();
    $.cookie('mozustocknotify', existing.concat(productCode).join(','), { path: '/', expires: 365 });
}

function saveNotificationGuest(productCode) {
  var existing = getExistingNotificationsGuest();
  $.cookie('mozustocknotifyguest', existing.concat(productCode).join(','), { path: '/', expires: 1 });
}
function HideSizeDropDown() {
$('.mz-product').on('click',  function(event) {
  if(event.target.className) {
    if(event.target.className.toLowerCase() !== 'productsizeoption' && event.target.className !== 'mz-down-cart-icon') {
      $(".size-option-view").addClass("hidden");
      $(".option-select-size-dropdown").removeClass("active");
    }
  }
});

}

var pageContext = require.mozuData('pagecontext');
var user = require.mozuData('user');
var ProductView = Backbone.MozuView.extend({
    requiredBehaviors: [1014],
    templateName: 'modules/product/product-detail',
    additionalEvents: {
        "click [data-mz-product-option]": "onOptionChange",
        "keypress [data-mz-product-option]": "onOptionChange",
        "change [data-mz-product-option]": "onOptionChange",
        "blur [data-mz-product-option]": "onOptionChange",
        "change [data-mz-value='quantity']": "onQuantityChange",
        "keyup input[data-mz-value='quantity']": "onQuantityChange",
        "click .find-in-store": "popupForFindInStore",
        "click .pdp-notify-email": "notifyForProductInStock",
        "click .mz-close-icon": "closeFindInStore",
        "click .product-notifyBtn": "widgetNotifyUserAction",
        "click .option-select-size-dropdown": "displaySizeDropDown"
    },
    clearError: function() {
        this.setError('');
      },
     setError: function(txt) {
        //  this.$('[data-mz-validationmessage-for]').text(txt);
         $('.mz-validationmessage-email').text(txt);
     },
    getRenderContext: function() {
      var context = Backbone.MozuView.prototype.getRenderContext.apply(this, arguments);
      if(user.isAuthenticated){
      context.subscribed = (_.indexOf(getExistingNotifications(), (this.model.get('variationProductCode') || this.model.get('productCode'))) !== -1);
      }else{
        context.subscribedGuest = (_.indexOf(getExistingNotificationsGuest(), (this.model.get('variationProductCode') || this.model.get('productCode'))) !== -1);
      }
      return context;
    },
    generatePreserveSwatchArray: function(){
      //get all colors available on product
      var colors = this.model.getProductColorIds();
      return colors.map(function(c){
        return ".preserve-" + c;
      });
    },
    isEmail: function (email) {
      var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
      return regex.test(email);
   },
    widgetNotifyUserAction: function () {
      var self = this;
      this.clearError();
      $('.mz-validationmessage-email').text('');
      var email = this.$('[data-mz-role="email"]').val() || user.email;
      if (!email) {
        $('.mz-validationmessage-email').text(Hypr.getLabel('emailMissing'));
          return false;
      }
      if(!this.isEmail(email)){
        $('.mz-validationmessage-email').text(Hypr.getLabel('emailMissing'));
        return false;
      }
      api.create('instockrequest', {
          email: email,
          customerId: user.accountId,
          productCode: this.model.get('variationProductCode') || this.model.get('productCode'),
          locationCode: this.model.get('inventoryInfo').onlineLocationCode
      }).then(function () {
          if(user.isAuthenticated){
          saveNotification(self.model.get('variationProductCode') || self.model.get('productCode'));
          }else{
          saveNotificationGuest(self.model.get('variationProductCode') || self.model.get('productCode'));
          }
          self.render();
      }, function () {
          self.setError(Hypr.getLabel('notifyWidgetErrorMsg'));
      });
  },
  render: function () {
        var me = this;
        if($(window).width() >= 900) {
         
          this.pdpImagesGrid();
        }
       // this.pdpImagesGrid();
        var preservedSwatches = me.generatePreserveSwatchArray();
        preserveElements(this, preservedSwatches, function(){
          Backbone.MozuView.prototype.render.apply(this, arguments);
        });
        this.$('[data-mz-is-datepicker]').each(function (ix, dp) {
            $(dp).dateinput().css('color', Hypr.getThemeSetting('textColor')).on('change  blur', _.bind(me.onOptionChange, me));
        });

        var target = $('.pdp-images-wrapper');
        var init = {
            autoplay: false,
            infinite: true,
            dots: true,
            slidesToShow: 1,
            mobileFirst: true,
            slidesToScroll: 1
        };
        function createSlick() {
          const slider = $(".pdp-images-wrapper");
          if ($(window).width() < 900) {
            if (slider.not(".slick-initialized")) {
              slider.slick(init);

              const bodyDir = document.querySelector("body").getAttribute("dir");
              if (bodyDir === "rtl") {
                if (document.getElementsByClassName("slick-list")[0]) {
                  document.getElementsByClassName("slick-list")[0].setAttribute("dir", "ltr");
                }
              }
            }
          }
        }
        //createSlick();
        $(window).on('resize orientationchange', function() {
            if($(window).width() < 900) {
                target.not(".slick-initialized").slick(init);
            } else {
                if(target.hasClass('slick-initialized'))
                  target.slick("unslick");
            }

        });

        if(MobileChecker.isPhoneOrTablet()){
           this.disableStickyBtn();
        }

        $('.afg-size-chart-link .mz-size-guide-link').on('click', function(e) {
            e.preventDefault();
            window.open(this.href,"my_window", "width=750, height=650");
        });

        $('.mz-product-size-info .mz-size-guide-link').on('click', function(e) {
          e.preventDefault();
          window.open(this.href,"my_window", "width=750, height=650");
        });
    },
    touchDeviceAddToBag : function() {
      if(MobileChecker.isPhoneOrTablet()){
        this.showStickyBtn();
        this.detectStickyAddToCartBtn();
        this.stickyBtnOnClick();
        this.disableStickyBtn();
      }
    },
    disableStickyBtn: function() {
      if(MobileChecker.isPhoneOrTablet()){
        var $staticBtn = $('#add-to-cart');
        var $stickyBtn = $('#add-to-cart-sticky');

        if($staticBtn.hasClass('is-disabled')){
          $stickyBtn.addClass('is-disabled');
        } else {
            if($stickyBtn.hasClass('is-disabled')){
              $stickyBtn.removeClass('is-disabled');
            }
        }
      } 
    },
    stickyBtnOnClick: function() {
      var self = this;
      $('#add-to-cart-sticky').click(function() {
          self.addToCart();
      });
    },
    showStickyBtn: function() {
          var myElement = document.getElementById('add-to-cart');
          var bounding = myElement.getBoundingClientRect();
          var myElementHeight = myElement.offsetHeight;
          var myElementWidth = myElement.offsetWidth;

          if (!(bounding.top >= -myElementHeight && bounding.left >= -myElementWidth && bounding.right <= (window.innerWidth || document.documentElement.clientWidth) + myElementWidth && bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) + myElementHeight)) {
            $('.mz-sticky-addToCart-btn').show();
          }
    },
    detectStickyAddToCartBtn: function() {
      var prevScrollPos = 0;
      $(window).scroll(function(){
          var currentScrollPos = $(this).scrollTop();
          var myElement = document.getElementById('sticky-add-to-cart');
          var bounding = myElement.getBoundingClientRect();
          var myElementHeight = myElement.offsetHeight;
          if(currentScrollPos > prevScrollPos){
            //account for sticky header
            myElementHeight -= 75;
          } 
          var myElementWidth = myElement.offsetWidth;
          if (bounding.top >= -myElementHeight && bounding.left >= -myElementWidth && bounding.right <= (window.innerWidth || document.documentElement.clientWidth) + myElementWidth && bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) + myElementHeight) {
              // $('.mz-sticky-addToCart-btn').slideUp("fast");
              $(".mz-productdetail-conversion").removeClass("sticky-product-controls");
          } else {
              // $('.mz-sticky-addToCart-btn').slideDown("fast");
              $(".mz-productdetail-conversion").addClass("sticky-product-controls");
          }

          prevScrollPos = currentScrollPos;
      });
    },
    pdpImagesGrid: function () {
        var pdpimagesLength = $(".pdp-images-wrapper img").length; 
        var target = $('.pdp-images-wrapper');
        $(".pdp-images-wrapper").removeClass("no-grid").addClass("pdp-grid");  
        /*if(!target.hasClass('pdp-grid')) {
        if(pdpimagesLength >= 1 && pdpimagesLength < 3 ) {
            $(".pdp-images-wrapper").addClass("no-grid");
        } else if(pdpimagesLength >= 3) {
            $(".pdp-images-wrapper").removeClass("no-grid").addClass("pdp-grid");
        }
        }*/
    },
    continueShopping:function() {
        $('.modal').on('click', '.continue-shopping', function() {
            $('#confirmation-modal').modal('hide');
        });
    },
    goToCheckout:function() {
      var self = this;
        $('.modal').on('click', '.go-to-checkout', function() {
          $('#confirmation-modal').modal('hide');
            window.location.href = HyprLiveContext.locals.siteContext.siteSubdirectory + "/cart";
            // window.location.href = (HyprLiveContext.locals.pageContext.secureHost || HyprLiveContext.locals.siteContext.siteSubdirectory) + "/cart";
        });
    },
    notifyForProductInStock:function(e) {
      if(user.isAuthenticated){
        var self = this;    
        setTimeout(function(){
          var availableStockCount = self.model.get("availableInventory");
          if(availableStockCount === 0) {
            self.widgetNotifyUserAction();
          }
        }, 1500);
      }else{
            if($('.mz-email-notify-popup-container').hasClass("deactive")){
              $('.mz-email-notify-popup-container').addClass("active").removeClass("deactive");
          }else{
              $('.mz-email-notify-popup-container').addClass("deactive").removeClass("active");
          }
      }
      
      try {
        ProductPageEvent.productPageEvent.notifyMe(this.model.get('content').get('productShortDescription'), this.model.get('productCode'));
      } catch (error) {
        console.log(error.message);
      }

    },
    popupForFindInStore:function() {          
      if (this.model.notDoneConfiguring() || !this.model.isPurchasable() || !this.model.supportsInStorePickup()) { 
        $('.mz-select-size-notification').addClass('hidden');
        $(".error-msg-popup").removeClass("hidden");
        return false;
      }
      var self = this;
      this.model.setLocationData(this.model.get("variationProductCode") ? this.model.get("variationProductCode") : this.model.get('productCode'), function() {
        self.render();
        $('.pdp-find-in-store-container').addClass("active").removeClass("deactive");
        $('.mz-backdrop').addClass("active").removeClass("deactive");
        $(".mz-backdrop").attr("style","top:0% !important;height:"+$(document).height()+"px !important;background-color:rgba(0,0,0,0.6) !important;opacity:0.05");

      });

      try {
        ProductPageEvent.productPageEvent.findStore(this.model.get('content').get('productShortDescription'), this.model.get('productCode'));
      } catch (error) {
        console.log(error.message);
      }
      
    },
    closeFindInStore: function() {
            $('.pdp-find-in-store-container').addClass("deactive").removeClass("active");
            $('.mz-backdrop').addClass("deactive").removeClass("active");
            $('.mz-backdrop').removeProp("style");
    },
    displayFreeDeliveryPopup: function() {
        var mql = window.matchMedia("screen and (min-width: 768px) and (max-width: 820px");
        var mql2 = window.matchMedia("screen and (min-width: 1024px) and (max-width: 1180px");
        $('.mz-productdetail-wrap').on('click',".mz-free-delivery-message-container, .mz-help-icon-offer", function() {
            $(".mz-productdetail-conversion-buttons").addClass('hidStickyAddToCart');
            if(window.globalEventBus){
                window.globalEventBus.emit('dataLayerEvent', 
                {'custom_event': 'pdp page',
                'event_params':{
                  'event_act': 'free standard delivery', 
                  'event_lbl' : 'link click'}
                }
                );
            }
            if($('.discount-offer-value').text()){
               var discountData=$('.discount-offer-value').text();
               $('.discount-offer-div').removeClass('hidden');
               $('.offer-value-text').text(discountData);
               var discuntTime = $('.discount-time').val();
               var discuntDate = $('.discount-date').val();
               var DiscountOfferValid = discuntTime+' '+ discuntDate;
               $('.offer-time-date').text(DiscountOfferValid);
               if($('.discount-description-item').html() != "") {
                    $('.offer-tc-content').html($('.discount-description-item').html());
                }
             } 
            $(".mz-product").css("overflow","hidden");
            $('.mz-l-pagecontent').css("overflow","hidden");

            $(".mz-free-delivery-popover-container").addClass("active");
            if (window.matchMedia('(max-width: 500px)').matches){
              $(".mz-backdrop").addClass("deactive").removeClass("active");
            }else{
              $(".mz-backdrop").addClass("active").removeClass("deactive");
            }
          
            $(".mz-backdrop").addClass("active").removeClass("deactive");
            $(".mz-backdrop").attr("style","top:0% !important; height:"+$(document).height()+"px !important;");
            
            //Fix for Mobile devices scroll on free delivery popup
            if (window.matchMedia('(max-width: 500px)').matches){
              $(".mz-backdrop").css("width","100%");
            }else{
              $(".mz-backdrop").css("width","");
            }

            $( ".mz-free-delivery-popover-container" ).animate({ "right": "0px" }, "slow" );
            /**
             * This Will allow backdrop to display top of sticky header
             */
             $(".mz-l-pagewrapper").removeClass("sticky");

            $(".mz-free-delivery-popover-container .mz-close-icon").on("click", function(){
                $(".mz-l-pagewrapper").addClass("sticky");
                $(".mz-backdrop").addClass("deactive").removeClass("active");
                $(".mz-backdrop").removeProp("style");
                $(".mz-product").css("overflow","auto");
                $('.mz-l-pagecontent').css("overflow","auto");
                if(mql.matches){
                    $( ".mz-free-delivery-popover-container" ).animate({ "right": "-100%" }, "slow" );
                }else if(mql2.matches){
                    $( ".mz-free-delivery-popover-container" ).animate({ "right": "-100%" }, "slow" );
                }
                else{
                    $( ".mz-free-delivery-popover-container" ).animate({ "right": "-411px" }, "slow" );
                }
                $(".mz-productdetail-conversion-buttons").removeClass('hidStickyAddToCart');
            });
        });
    },
    getDiscountIdfromPromotions:function(){
       var self = this;
       var categories = self.model.get('categories');

       categories.forEach(function(cat){
      if(HyprLiveContext.locals.themeSettings.promotionalParentCategoryId){
        if( cat.parentCategoryId == HyprLiveContext.locals.themeSettings.promotionalParentCategoryId){
          var desc = cat.content.description.split('|');
          api.request("POST","/getDiscount", { "discountId": desc[1] } )

          .then(function(res){

              if(res){
                self.model.set('discountDate',res.discountDate);
                self.model.set('discountTime',res.discountTime);
              }
            });
        }
      }
    });
        
       
    },
    displayDeliveryAccordian: function() {
      var self = this;
        $('.mz-productdetail-wrap').on('click', '.mz-information-text', function () {
            if(window.globalEventBus){
              var eventData = {
                  "custom_event": "pdp page",
                  "event_params":{
                    "event_act": Hypr.getLabel('delivery') + "," + Hypr.getLabel('collection') + " & " + Hypr.getLabel('returns'),
                    "event_lbl" : self.model.get('content').get('productName') + "|" + self.model.get('productCode')
                }
             };
              window.globalEventBus.emit('dataLayerEvent', eventData);
            }
            if($('.mz-information-text').hasClass('deactive')) {
                $('.mz-information-text')
                .addClass('active')
                .removeClass('deactive');

                $('.mz-details-information-text')
                .addClass('deactive')
                .removeClass('active');
            }
            else {
            $('.mz-information-text')
                .addClass('deactive')
                .removeClass('active');
            }
        });

        $('.mz-productdetail-wrap').on('click', '.mz-details-information-text', function () {
            if(window.globalEventBus){
              var eventData = {
                  "custom_event": "pdp page",
                  "event_params":{
                    "event_act": Hypr.getLabel('detailsAndCare'),
                    "event_lbl" : self.model.get('content').get('productName') + "|" + self.model.get('productCode')
                  }
                 
              };
              window.globalEventBus.emit('dataLayerEvent', eventData);
            }
            if($('.mz-details-information-text').hasClass('deactive')) {
                $('.mz-details-information-text')
                .addClass('active')
                .removeClass('deactive');

                $('.mz-information-text')
                .addClass('deactive')
                .removeClass('active');
            }
            else {
                $('.mz-details-information-text')
                .addClass('deactive')
                .removeClass('active');
            }
        });
    },
    onOptionChange: function (e) {

        var keycode = (e.keyCode ? e.keyCode : e.which);
        if(keycode == 13){
          return this.configure($(e.currentTarget));
        } else {
          return this.configure($(e.currentTarget));
        }
    },
    onQuantityChange: _.debounce(function (e) {
        
        var $qField = $(e.currentTarget),
          newQuantity = parseInt($qField.val(), 10);
        if (!isNaN(newQuantity)) {
            this.model.updateQuantity(newQuantity);
        }
        
    },500),
    configure: function ($optionEl) {
        var that = this;
        var newValue = $optionEl.data('value'),
        oldValue,
        id = $optionEl.data('mz-product-option'),
        optionEl = $optionEl[0],
        isPicked = (optionEl.type !== "checkbox" && optionEl.type !== "radio") || optionEl.checked,
        option = this.model.get('options').findWhere({'attributeFQN':id});
        if (option) {
            if (option.get('attributeDetail').inputType === "YesNo") {
                option.set("value", isPicked);
            } else if (isPicked) {
                oldValue = option.get('value');
                if (oldValue !== newValue && !(oldValue === undefined && newValue === '')) {
                    option.set('value', newValue);
                }
            }
            var color, size1,size2;
            if(option.get('attributeFQN') == "tenant~color"){
              that.model.set({ selectedColor: newValue });
              that.model.setIsSizeSelected(false);
              that.model.set("hasClickedCartBtn", false);
              color = newValue;
            }
            if(option.get('attributeFQN') == "tenant~size1"){
              that.model.set({ selectedSize1: newValue });
              size1 = newValue;
              $(".size-option-view").toggleClass("hidden");
              $(".option-select-size-dropdown").toggleClass("active");
            }
            if(option.get('attributeFQN') == "tenant~size2"){
              that.model.set({ selectedSize2: newValue });
              size2 = newValue;
              $(".size-option-view").toggleClass("hidden");
              $(".option-select-size-dropdown").toggleClass("active");
            }

            setTimeout(function() {
              if((color || size1) && (window.globalEventBus)) ProductPageEvent.productPageEvent.variantSelectorEvent.call(that, color, that.model.get('selectedSize1'),  that.model.get('selectedSize2'));
            }, 900);
        }
        //this.model.setSelectedOptions();
        // setTimeout(function() {
        //     that.pdpImagesGrid();
        //   }, 750);
    },
    mobileConfigure: function(newValue, id) {
      var oldValue,
      option = this.model.get('options').findWhere({'attributeFQN':id});

      if(option){
        oldValue = option.get('value');
        if(oldValue !== newValue && !(oldValue === undefined && newValue === '')){
          option.set('value', newValue);
        }
      }
      this.model.setSelectedOptions();
      this.model.setIsSizeSelected(true);

    },
    isValidQuantityForCart: function () {
        var self = this;
        var productCode = this.model.get('variationProductCode') || this.model.get('productCode');
        return self.model.getProductInventory(productCode).then(function(res){
            var availableStock = res[0].available;
            var userQuantityAdded = self.model.get('quantity');
            var cartQuantity = 0;
            window.CartPopoutInstance.model.get('items').models.forEach(function(model){
                var cartProductCode = model.get('product').get('variationProductCode');
                if(cartProductCode === productCode){
                    cartQuantity = model.get('quantity');
                }
            });

            var totalUserAddedItems = cartQuantity + userQuantityAdded;

            if(availableStock){
                return totalUserAddedItems <= availableStock;
            } 
        })
        .catch(function(e){
          console.log('error', e);
        });
        
    },
    addToCartAfterConfigure: function() {
      this.addToCart();
    },
    addToCart: function () {
        var self = this;  
        if(this.model.isPurchasable() && this.model.get('availableInventory') > 0){
            self.isValidQuantityForCart().then(function(res){
                var isValid = res;
                if(isValid){
                    self.addSizeVals();
                    self.addColorVals();
                    self.addProductImage();
                    self.updatePriceVals();
                    self.confirmationDialog.show();
                    self.model.addToCart();
                    try {
                      ProductPageEvent.cartWishlistEvent.gtmObjectForCart.call(self, 'add_to_cart', 'cart');
                    } catch (error) {
                      console.log(error.message);
                    }
                } else {
                    self.model.setQuantityWarning(true);
                    self.model.setCartBtnClicked(true);
                    self.render();
                }
            });
        } else {
            // if(!this.model.isPurchasable()){
            //   if(this.model.get('availableInventory')!== 0){
            //     var addToCartConfigure = true;
            //     //Update configuration if inital state of product
            //     _.once(self.model.updateConfiguration(addToCartConfigure));
            //   }
            // }
            this.scrollToSizeDropdown();
            self.model.setCartBtnClicked(true);
            self.render();
        }
    },
    addSizeVals: function (){
      $('.confirmation-size').text(Hypr.getLabel('size').concat(':',' ', this.model.getConfirmationSizes()));
    },
    addColorVals: function (){
      var confirmationColor = this.model.getConfirmationColor();
      if(confirmationColor) {
        var colorValue = confirmationColor.split('_');
        colorValue = colorValue.length > 1 ? colorValue[1] : colorValue[0];
        $('.afg-confirmation-color').text(Hypr.getLabel('itemColor').concat(':',' ',colorValue.toLowerCase()));
      }          
      
    },
    addProductImage: function (){
      var selectedProductImage = "";
      if(this.model.get("productImages")) selectedProductImage = this.model.get("productImages")[0];

      if(this.model.get('productUsage').toLowerCase() == 'standard') {
        if(this.model.get('content').get("productImages")) selectedProductImage = this.model.get('content').get("productImages")[0];
      }
      
      if(selectedProductImage && selectedProductImage !== undefined) {
        $(".afg-confirmation-product-image").html("<img src='"+selectedProductImage.imageUrl+"' alt='"+selectedProductImage.altText+"' >");
      } else {
        $(".afg-confirmation-product-image").html("<span class='item-noImg'>"+Hypr.getLabel('productImagePlaceholder')+"</span>");
      }
    },
    updatePriceVals: function() {
        var self = this;
        var price = self.model.get('price');
        var regPrice = price.get('price');
        var salePrice = price.get('salePrice');

        if(salePrice){
            $('.selected-sale-price').text(salePrice.toFixed(pageContext.currencyInfo.precision));
            $('.selected-reg-price').text(regPrice.toFixed(pageContext.currencyInfo.precision));
            $('.reg-price-show').hide();
            $('.sale-price-show').show();
        } else {
            $('.reg-price').text(regPrice.toFixed(pageContext.currencyInfo.precision));
            $('.sale-price-show').hide();
            $('.reg-price-show').show();
        }
    },
    removeAlert: function(){
        var self = this;
        $('.mz-product').on('click', function(){
            if(self.model.get('quantityWarning') === true){
                self.model.setQuantityWarning(false);
                self.render();
            }
        });
    },
    addToWishlist: function () {
       // this.model.addToWishlist();
    },
    checkLocalStores: function (e) {
        var me = this;
        e.preventDefault();
        this.model.whenReady(function () {
            var $localStoresForm = $(e.currentTarget).parents('[data-mz-localstoresform]'),
                $input = $localStoresForm.find('[data-mz-localstoresform-input]');
            if ($input.length > 0) {
                $input.val(JSON.stringify(me.model.toJSON()));
                $localStoresForm[0].submit();
            }
        });

    },
    initializeConfirmationDialog: function() {
        var me = this;

        var options = {
            elementId: "confirmation-modal",
            body: "", 
            hasXButton: false,
            scroll: false
        };

        return modalDialog.init(options);

    },
    showConfirmationDialog: function() {
        var me = this;
        me.confirmationDialog.show();
    },
    mobileFunction: function(){
      var self = this;
      $('.mz-product').on('change', '#dropdown-select-size', function(e){
        var data = $(this.options[this.selectedIndex]).context.dataset;
        var mobileSelectedSize = data.sizeoneValue;
        self.mobileConfigure(data.sizeoneValue, data.sizeone);
        //add conditional here for size2
        if(data.sizetwo){
          self.mobileConfigure(data.sizetwoValue, data.sizetwo);
          mobileSelectedSize += (' / ' + data.sizeTwoValue);

        }
        //conditional for size 2
        self.model.setMobileSelectedSize(mobileSelectedSize);
      });
    },
  
  displaySizeDropDown: function(e){
    $(".size-option-view").toggleClass("hidden");
    $(".option-select-size-dropdown").toggleClass("active");
  },
    initialize: function () {
        // handle preset selects, etc
      //  this.pdpImagesGrid();
        if($(window).width() >= 900) {
         
          this.pdpImagesGrid();
        }
        this.touchDeviceAddToBag();
        this.displayFreeDeliveryPopup();
        this.displayDeliveryAccordian();
        this.continueShopping();
        this.goToCheckout();
        this.notifyForProductInStock();
        this.mobileFunction();            
        //this.removeAlert();
        this.getDiscountIdfromPromotions();
        this.confirmationDialog = this.initializeConfirmationDialog();
        this.listenTo(this.model, 'availableInventory', this.render);
        this.listenTo(this.model, 'inventoryArray', this.render);
        this.listenTo(this.model, 'sizesupdated', this.render);
        //this.listenTo(this.model, 'addToCartConfigure', this.addToCartAfterConfigure);
        var me = this;
        this.$('[data-mz-product-option]').each(function () {
            var $this = $(this), isChecked, wasChecked;
            if ($this.val()) {
                switch ($this.attr('type')) {
                    case "checkbox":
                    case "radio":
                        isChecked = $this.prop('checked');
                        wasChecked = !!$this.attr('checked');
                        if ((isChecked && !wasChecked) || (wasChecked && !isChecked)) {
                            me.configure($this);
                        }
                        break;
                    default:
                        me.configure($this);
                }
            }
        });

        if(this.model && window.globalEventBus){
          var price = this.model.get('price') ? (this.model.get('price').get('salePrice') ? this.model.get('price').get('salePrice') : this.model.get('price').get('price')) : '';
          var discount = this.model.get('price').get('discount');
          var gtmProductName = this.model.get('content').get('productName');
          var gtmItemCategory = {};
          var isEnglishSite = true; 
          if(this.model.get('analyticsData')) {
            var analyticsData = this.model.get('analyticsData');
            gtmProductName = analyticsData.item_name;
            gtmItemCategory = {
              item_category1: analyticsData.item_category.item_category1 ? analyticsData.item_category.item_category1 : '',
              item_category2: analyticsData.item_category.item_category2 ? analyticsData.item_category.item_category2 : '',
              item_category3: analyticsData.item_category.item_category3 ? analyticsData.item_category.item_category3 : '',
              item_category4: analyticsData.item_category.item_category4 ? analyticsData.item_category.item_category4 : '',
              item_category5: analyticsData.item_category.item_category5 ? analyticsData.item_category.item_category5 : ''
            };
            isEnglishSite = false;
          }

          if((!Hypr.getThemeSetting('isArabicLanguageSite') && isEnglishSite) || (Hypr.getThemeSetting('isArabicLanguageSite') && !isEnglishSite)) {
            
            window.globalEventBus.emit('productViewEvent', 
            {
              'productCode': this.model.get('productCode'),
              'productName': gtmProductName,
              'price': price,
              'discount':discount ? discount.impact : 0,
              'currentColor' : $('.selectedProductAttribute').text().trim().toLowerCase(),
              'itemCategory': gtmItemCategory,
              'originalProductName': this.model.get('content').get('productName')
            });
            
          }

        }
    },
    scrollToSizeDropdown : function() {
      if(!this.model.isSizeSelected){
        var dropdownEl = $("#dropdown-select-size");
        if(!_.isNull(dropdownEl)){
          var actualTopOffSet = dropdownEl.offset() ? dropdownEl.offset().top : 200,
              persentOff = actualTopOffSet * 0.30,
              requrieTopOffSet = actualTopOffSet - persentOff;
          $([document.documentElement, document.body]).animate({
            scrollTop: requrieTopOffSet,
            }, 300);
        }
      }
    }
});

var ProductPrimaryView = Backbone.MozuView.extend({
    requiredBehaviors: [1014],
    templateName: 'modules/product/product-primary-detail',
    additionalEvents: {
        "click .save-to-favorites": "addToWishlist",
        "click .remove-from-favorite": "removeFromWishlist",
    },
    initialize:function(){
      this.setWishlistedProduct();
     
     },
     setWishlistedProduct:function(){
       var me =this;
          var variationProductCode = this.model.get('variationProductCode');
          var productType = this.model.get('productUsage');
          var productCode = this.model.get('productCode');
          if(require.mozuData("user").accountId){
            api.request("GET", "/api/commerce/wishlists/customers/" + require.mozuData("user").accountId + "/my_wishlist?pageSize=200")
            .then(function(res) {
              var wishlistItems = res.items;
              wishlistItems.forEach(function(items){
                if(productType == 'Standard'){
                  if(items.product.productCode == productCode){
                    $('.wishlist-add').addClass('hidden');
                    $('.wishlist-added').removeClass('hidden');
                  }
                }else {
                  if(items.product.variationProductCode == variationProductCode && items.product.variationProductCode){
                    $('.wishlist-add').addClass('hidden');
                    $('.wishlist-added').removeClass('hidden');
                  }
                }
              });
           });
        }else {
          var guestWishlistProducts = $.cookie('guestWishlistN');
          if((guestWishlistProducts)){
            guestWishlistProducts = JSON.parse(guestWishlistProducts);
            guestWishlistProducts.forEach(function(wishproduct,index){
              if(productType == 'Standard'){
                if(wishproduct.itemProductCode == productCode){
                  $('.wishlist-add').addClass('hidden');
                  $('.wishlist-added').removeClass('hidden');
              }
              }else {
              if(wishproduct.itemVPC == variationProductCode && wishproduct.itemVPC){
                  $('.wishlist-add').addClass('hidden');
                  $('.wishlist-added').removeClass('hidden');
              }
            }
            });
          }
        }
     },
    render: function () {
        var me = this;
        Backbone.MozuView.prototype.render.apply(this);
        if (
          (require.mozuData("user").isAuthenticated ||
            !require.mozuData("user").isAnonymous) &&
          sessionStorage.getItem("wishlistItem") !== undefined
        ) {
         // me.addToWishlistAfterLogin();
        }
        if (
          require.mozuData("user").isAuthenticated ||
          !require.mozuData("user").isAnonymous
        ) {
         // me.isWishlistItem();
        }
        me.setWishlistedProduct();
    },
   
     addToWishlist: function (e) {
      var validation=false;
      var me = this;
      var isColorSelected = true;// me.model.get('isColorSelected');
      var isSizeSelected = me.model.get('isSizeSelected');
      var Sizeoptions = me.model.get('options');
      var checkSize = true;
      if(Sizeoptions){
        var preSelectedColor;
        Sizeoptions.forEach(function (opt){
            if(opt.get('attributeFQN') === 'tenant~size1' || opt.get('attributeFQN') === 'tenant~size2' ){
              checkSize = false;
            }
          });
        }
      if(!isColorSelected && !isSizeSelected){
        validation=false;
      $('.mz-select-color-notification-for-wishlist').removeClass('hidden');
      $('.mz-select-size-notification-for-wishlist').removeClass('hidden');
      $('#checkSizeError,.find-store-popup-error').addClass('hidden');
      //$('.mz-productoptions-optionlabel').hide();
      //$('.selectedProductAttribute').hide();
      }else
      if(!isColorSelected){
        validation=false;
      $('.mz-select-color-notification-for-wishlist').removeClass('hidden');
      //$('.mz-productoptions-optionlabel').hide();
      //$('.selectedProductAttribute').hide();
      }else if(!isSizeSelected){
        if(checkSize){
          validation = true;
          $('.mz-select-size-notification-for-wishlist').addClass('hidden');
          $('.mz-productoptions-optionlabel').show();
          $('.selectedProductAttribute').show();
        }else{
          validation=false;
          $('.mz-select-size-notification-for-wishlist').removeClass('hidden');
          $('#checkSizeError,.find-store-popup-error').addClass('hidden');
          //$('.mz-productoptions-optionlabel').hide();
          //$('.selectedProductAttribute').hide();
        }
      
      }else if(isColorSelected && isSizeSelected){
        validation = true;
        $('.mz-select-size-notification-for-wishlist').addClass('hidden');
        $('.mz-select-color-notification-for-wishlist').addClass('hidden');
        $('.mz-productoptions-optionlabel').show();
        $('.selectedProductAttribute').show();
      }
    
      if (validation) {
        var variationProductCode = me.model.get("variationProductCode");
        var productType = this.model.get('productUsage');
        var productCode = this.model.get('productCode');
        var options = me.model.get('options');
        if (  require.mozuData("user").isAuthenticated ||  !require.mozuData("user").isAnonymous) 
        {
        
          var CurrentWishlistItem = {
              variationProductCode: variationProductCode,
              inventoryStock: me.model.get("inventoryStock"),
            };

           this.model.addToWishlist();
           $('.wishlist-add').addClass('hidden');
           $('.wishlist-added').removeClass('hidden');
        }else{
          var wishlistArray = [];
          var wishlisteItemObject = ($.cookie("guestWishlistN"))? ($.cookie("guestWishlistN")): false;
        
          if (wishlisteItemObject.length === 0 || !wishlisteItemObject){
              wishlisteItemObject=[];
              wishlistArray.push(
                { 
                  itemProductCode : this.model.get('productCode'),
                  itemVPC : variationProductCode,
                }
              );
              $.cookie("guestWishlistN" , JSON.stringify(wishlistArray), { path: '/', expires: 1 });
              me.model.displayWishlistCount();
          }
          else{
            wishlisteItemObject=JSON.parse(wishlisteItemObject);
            var checkIfexist = false;
            wishlisteItemObject.forEach(function(items){
              if(productType == 'Standard'){
                if(items.itemProductCode == productCode){
                  checkIfexist = true;
                }
              }
              else{
              if(items.itemVPC == variationProductCode){
                checkIfexist = true;
              }
            }
              wishlistArray.push(items);
            });
           if(!checkIfexist){
              wishlistArray.push(
                { 
                    itemProductCode : this.model.get('productCode'),
                    itemVPC : variationProductCode,
                }
              );
            }
            $.cookie("guestWishlistN" , JSON.stringify(wishlistArray), { path: '/', expires: 1 });
            me.model.displayWishlistCount();
          }
          $('.wishlist-add').addClass('hidden');
          $('.wishlist-added').removeClass('hidden');
        
        }
        
        try {
          ProductPageEvent.cartWishlistEvent.gtmObjectForCart.call(me,'add_to_wishlist', 'wishlist');
        } catch (error) {
          console.log(error.message);
        }
      }
    },
    storeWishlist: function (e) {
      var me = this;
      var validation=false;
      var isColorSelected = me.model.get('isColorSelected');
      var isSizeSelected = me.model.get('isSizeSelected');
      if(isColorSelected){
        validation = true;
      }
      if(isSizeSelected){
        validation = true;
      }
      if(validation){
        var variationProductCode = me.model.get("variationProductCode");
        var options = me.model.get('options');
      }
    
    },
    addToWishlistAfterLogin: function (e) {
      var me = this;
      var wishlistData = JSON.parse(sessionStorage.getItem("wishlistItem"));
      sessionStorage.removeItem("wishlistItem");
      me.model.lastConfiguration = wishlistData.options;
      this.model.set("selectedVariant", wishlistData.options);
      var accountID = require.mozuData("user").accountId;
      var postData = {
        quantity: wishlistData.quantity,
        currencyCode: "AED",
        localeCode: "en-US",
        product: {
          productCode: this.model.get("productCode"),
          variationProductCode: wishlistData.variationProductCode,
          options: wishlistData.options,
        },
      };
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
                // console.log('wishlistitem',wishlistitem);
              },
              function (e) {
                console.log("Error ::: ", e);
              }
            )
            .catch(function (err) {
              console.log("Error occurred :: ", err);
            });
        })
        .catch(function (errData) {
          if (errData.items.length === 0) {
            // Creating new wishlist & adding item to it
            me.model.set({ colorValidation: false });
            me.model.set({ widthValidation: false });
            me.model.set({ sizeValidation: false });
            me.createWishlist(wishlistData);
          }
        });
    },

    addItemToWishlist: function (wishlistData) {
      var me = this;
      var accountID = require.mozuData("user").accountId;
      var postData = {
        quantity: wishlistData.quantity,
        currencyCode: "USD",
        localeCode: "en-US",
        product: {
          productCode: this.model.get("productCode"),
          variationProductCode: wishlistData.variationProductCode,
          options: wishlistData.options,
        },
      };
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
               
              },
              function (e) {
                console.log("Error :: ", e);
              }
            )
            .catch(function (err) {
              console.log("Error occurred  :: ", err);
            });
        });
    },
    createWishlist: function (wishlistData) {
      var me = this;
      var postData = {
        name: "my_wishlist",
      };
      api
        .request("POST", "/api/commerce/wishlists/", postData)
        .then(function (wishlistitem) {
          me.addItemToWishlist(wishlistData);
        })
        .catch(function (errData) {
          console.log("Error : ", errData);
        });
    },
    changeImageOnWishlist: function (isChangeImageGreen) {
      if (isChangeImageGreen) {
        $(".mz-wishlist-button")
          .removeClass("save-to-favorites")
          .addClass("remove-from-favorite");
        $(".fav-icon")
          .removeClass("save-to-favorite-image")
          .addClass("save-to-favorite-green");
        $(".mz-wishlist-text").text(Hypr.getLabel("addedToWishlist"));
      } else {
        $(".mz-product-wishlist-link.wishlist-add").removeClass("hidden");
        $(".mz-product-wishlist-link.wishlist-added").addClass("hidden");
        $(".mz-wishlist-button")
          .removeClass("remove-from-favorite")
          .addClass("save-to-favorites");
        $(".fav-icon")
          .removeClass("save-to-favorite-green")
          .addClass("save-to-favorite-image");
        $(".mz-wishlist-text").text(Hypr.getLabel("saveToFavorites"));
      }
    },
    isWishlistItem: function () { // This function checks if product is wishlisted or not and highlight is as required.
      var me = this;
      var variationProductCode = me.model.get("variationProductCode");
      api.get("wishlist").then(function (wishlists) {
        // console.log(wishlists);
      });
     
    },

    removeFromWishlist: function (e) {
      var me = this;
      var variationProductCode = me.model.get("variationProductCode");
      var productType = this.model.get('productUsage');
      var productCode = this.model.get('productCode');
      if(user.isAuthenticated){
      api
        .request(
          "GET",
          "/api/commerce/wishlists/customers/" +
            require.mozuData("user").accountId +
            "/my_wishlist"
        )
        .then(function (wishlistID) {
          var wishID = wishlistID.id;
          api
            .request(
              "GET",
              "/api/commerce/wishlists/" +
                wishID +
                "/items?startIndex=0&pageSize=10"
            )
            .then(function (wishlist) {
              var myModel;
              for (var i = 0; i < wishlist.items.length; i++) {
                myModel = wishlist.items[i];
                var wishlistitemId = "";
                if(productType == 'Standard'){
                  if (
                    productCode == myModel.product.productCode
                  ){
                    wishlistitemId = myModel.id;
                  }
                }else{
                  if (
                    variationProductCode == myModel.product.variationProductCode
                  ){
                    wishlistitemId = myModel.id;
                  }
                }
                if (
                  wishlistitemId !=""
                ) {
                  
                  api.request(
                    "DELETE",
                    "/api/commerce/wishlists/" +
                      wishID +
                      "/items/" +
                      wishlistitemId
                  );
                  me.model.displayWishlistCount();
                  me.changeImageOnWishlist(false);
                }
              }
            });
        });
      }
      else {
        var guestWishlistProducts = $.cookie('guestWishlistN');
            guestWishlistProducts = JSON.parse(guestWishlistProducts);
            var wishlistArray = [];
            var newCount1=guestWishlistProducts.length-1;
            var wishlisteItemObject = ($.cookie("guestWishlistN"))? ($.cookie("guestWishlistN")): false;
            wishlisteItemObject=JSON.parse(wishlisteItemObject);
            wishlisteItemObject.forEach(function(items){
              if(productType == 'Standard'){
                if(items.itemProductCode != productCode){
                  wishlistArray.push(items);
                }
              }
              else{
              if(items.itemVPC != variationProductCode){
                wishlistArray.push(items);
              }
            }
            });
            $.cookie("guestWishlistN" , JSON.stringify(wishlistArray), { path: '/', expires: 1 });
            me.model.displayWishlistCount();
            me.changeImageOnWishlist(false);
      }
    },
  });

$(document).ready(function () {
  function onResize() {
    var width = document.body.clientWidth;
    if (width < 900) {
      const bodyDir = document.querySelector("body").getAttribute("dir");
      if (bodyDir === "rtl") {
        document.getElementsByClassName("slick-list")[0].setAttribute("dir", "ltr");
      }
    }
  }

  window.addEventListener("resize", onResize);

  //product slider bottom
  function productSlider(productSliderClass) {
    $(productSliderClass).slick({
      dots: true,
      arrows: true,
      infinite: false,
      slidesToShow: 6,
      slidesToScroll: 6,
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: 4,
            slidesToScroll: 4                
          }
        },
        {
          breakpoint: 992,
          settings: {
            arrows: false, 
            dots: false,
            slidesToShow: 3.5,
            slidesToScroll: 3
          }
        },
        {
          breakpoint: 500,
          settings: {
            arrows: false,
            dots: false,
            slidesToShow: 2.3,
            slidesToScroll: 2
          }
        }
      ]
    });
  }
  var interval1 = setInterval(forInterval1, 1300);
  var interval2 = setInterval(forInterval2, 1300);
  var interval3 = setInterval(forInterval3, 1300);
  function forInterval1() {
    productSlider('.you-may-also-like .mz-l-carousel');
    if ($('.you-may-also-like .mz-l-carousel').length > 0) {
      clearInterval(interval1);
    }
  }
  function forInterval2() {
    productSlider('.style-it-with .mz-l-carousel');
    if ($('.style-it-with .mz-l-carousel').length > 0) {
      clearInterval(interval2);
    }
  }
  function forInterval3() {
    productSlider('.why-not-try .mz-l-carousel');
    if ($('.why-not-try .mz-l-carousel').length > 0) {
      clearInterval(interval3);
    }
  }
  
  // setTimeout(function() {
  //   productSlider('.you-may-also-like .mz-l-carousel');
  //   productSlider('.style-it-with .mz-l-carousel');
  //   productSlider('.why-not-try .mz-l-carousel');
  // },1000);

  
    var product = ProductModels.Product.fromCurrent();  
    
    api.on('sync', function(o) {
      if (o.type === "product") {
        product.set(o.data);
        product.trigger('sync', o.data);
      }
  });     
    product.on('addedtocart', function (cartitem, stopRedirect) {
        if (cartitem && cartitem.prop('id')) {
            product.isLoading(true);
            CartMonitor.addToCount(product.get('quantity'));
            product.isLoading(false);
            // if(!stopRedirect) {
            //     window.location.href = (HyprLiveContext.locals.pageContext.secureHost || HyprLiveContext.locals.siteContext.siteSubdirectory) + "/cart";
            // }  
        } else {
            product.trigger("error", { message: Hypr.getLabel('unexpectedError') });
        }
    });

    product.on('addedtowishlist', function (e) {

       
        window.WishilistPopoutInstance.update().then(
          window.WishilistPopoutInstance.view.render()
        );

        $('.wishlist-added').removeClass('hidden');
        $('.wishlist-add').addClass('hidden');
        // $('#add-to-wishlist').prop('disabled', 'disabled').text(Hypr.getLabel('addedToWishlist'));
    });

    var productImagesView = new ProductImageViews.ProductPageImagesView({
      el: $('[data-mz-productimages]'),
      model: product
    });

    var productView = new ProductView({
        el: $('#product-detail'),
        model: product,
        messagesEl: $('[data-mz-message-bar]')
    });
    var productPrimaryView = new ProductPrimaryView({
        el: $('#product-primary-detail'),
        model: product,
        messagesEl: $('[data-mz-message-bar]')
      });
      
      window.productView = productView;
      window.productPrimaryView =productPrimaryView;
      productView.render();
      productPrimaryView.render();
    
  HideSizeDropDown();
});

});
