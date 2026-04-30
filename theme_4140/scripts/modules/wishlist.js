define(['modules/jquery-mozu', 'modules/api' , 'hyprlive', 'modules/backbone-mozu' , 'modules/models-cart' , 'underscore' , 'hyprlivecontext','modules/models-wishlist','modules/models-customer', "modules/cart-monitor","modules/models-product", "modules/analytics/wishlist-event"], function ($, api, Hypr, Backbone , CartModels , _ , HyprLiveContext,WishlistModels,CustomerModels,CartMonitor,ProductModels, WishlistEvent) {

  //code added for add to cart from wishlist popup is not working from homepage
    var productModelWishlist = ProductModels.Product.fromCurrent();
    productModelWishlist.on('addedtocart', function (cartitem, stopRedirect) {
      if (cartitem && cartitem.prop('id')) 
          CartMonitor.addToCount(productModelWishlist.get('quantity'));
      });
    var isItemRemoved = false;
    var pageContext = require.mozuData('pagecontext') ? require.mozuData('pagecontext') : '';
    var GuestWishlistitems = [];
    var WishListPopout = Backbone.MozuView.extend({
        templateName: "modules/page-header/wishlist-popover",
        additionalEvents:{
           'click .mini-cart-image':'testfunct',
           'click .mz-wish-close-icon':'closeWishlistPopover'
        },
        initialize:function(){
          if(require.mozuData("user").isAuthenticated){
            this.addToWishlistAfterLoginNew();
          }          
          this.displayWishlistPopup();
        },
        render: function(e) {
            var me =this;
            $('.wishlist-data-container').removeClass('hidden');
            $('.addtobagall-btn').removeClass('hidden');
            Backbone.MozuView.prototype.render.apply(this);
          
            if(require.mozuData("user").isAuthenticated){
             // me.getWishlistData();
            }

        },
        getWishlistData:function(){
            var self=this;
            if(require.mozuData("user").accountId){
              api.request("GET", "/api/commerce/wishlists")
              .then(function(wishlistsData) {
                if(wishlistsData.items.length > 0) {
                  api.request("GET", "/api/commerce/wishlists/customers/" + require.mozuData("user").accountId + "/my_wishlist?pageSize=200")
                  .then(function(res) {
                      self.model.set('wishlistItems',res.items);
                      window.wishlistItemModel.get("wishlist").get('items').reset(res.items,null);
                      window.wishlistItemModel.get("wishlist").set('wishlistId',res.id);
                      WishilistPopoutInstance.model  = window.wishlistItemModel;
                  });
                }
              });
            }

        },
        getWishlistItem:function(){
            var me =this;
            var wishItm =me.model.get('wishlistItems');
            window.wishlistItem = wishItm;
           
        },
        removeFromWishlist: function (e) {
            var me = this;
            var variationProductCode = me.model.get("variationProductCode");
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
                      if (
                        variationProductCode == myModel.product.variationProductCode
                      ) {
                        var wishlistitemId = myModel.id;
                        api.request(
                          "DELETE",
                          "/api/commerce/wishlists/" +
                            wishID +
                            "/items/" +
                            wishlistitemId
                        );
                        me.changeImageOnWishlist(false);
                        me.displayWishlistCount();
                      }
                    }
                  });
              });
        },
        addToWishlistAfterLoginNew: function(){
           var me = this;
           var guestWishlistProducts = $.cookie('guestWishlistN');
           var wishlistArray = [];
           var wishlistItems = this.model.get('wishlist').get('items');
           var items = [];
           var itemCount=0;
           if((guestWishlistProducts)){
            guestWishlistProducts = JSON.parse(guestWishlistProducts);
            guestWishlistProducts.forEach(function(wishproduct){
              api.request('GET','/api/commerce/catalog/storefront/products/'+wishproduct.itemProductCode+'?variationProductCode='+wishproduct.itemVPC).then(function(res){
               var singleProductModel = new ProductModels.Product(res);
                singleProductModel.addToWishlist();
                itemCount++;
              });
            });

            setTimeout(function(){
              me.getWishlistData();
              if(itemCount == guestWishlistProducts.length){
                $.cookie("guestWishlistN" , JSON.stringify(wishlistArray), { path: '/', expires: 1 });
              }
               
            },4000);
          }
        },
        addToWishlistAfterLogin: function (){
            var me = this;
            var wishlistData = JSON.parse(sessionStorage.getItem("wishlistItem"));
            if(wishlistData){
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
                          me.displayWishlistCount();
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
            }
           
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
                      me.displayWishlistCount();
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
        highlightGreanHeart: function(itemVpc){
          if(pageContext.pageType == 'product'){
            var product = ProductModels.Product.fromCurrent();
            if(product.get('productUsage') == 'Standard'){
              if(product.get('productCode') == itemVpc){
                $('.wishlist-add').removeClass('hidden');
                $('.wishlist-added').addClass('hidden');
             }
            }else {  
            if(product.get('variationProductCode') == itemVpc){
               $('.wishlist-add').removeClass('hidden');
               $('.wishlist-added').addClass('hidden');
            }
          }
          }
        },
        removeWishlistItem: function (e) {
            var self = this;
            var id = $(e.currentTarget).data("mz-wishlist-item");
            var vpc = $(e.currentTarget).data("mz-wishlist-item-vpc");
            var wishlistId = self.model.get('wishlist').get('wishlistId');
            var productType = $(e.currentTarget).data("mz-wishlist-producttype");
            if (id) {
              var removeWishId = id;
              if(require.mozuData('user').isAuthenticated){
                api.request("DELETE", "/api/commerce/wishlists/"+wishlistId+"/items/"+id)
                .then(function (res) {
                  self.getWishlistData();
                  self.highlightGreanHeart(vpc);
                  var itemLength = window.wishlistItemModel.get("wishlist").get('items').length;
                  var newCount=itemLength-1;
                
                  $('.'+ $(e.currentTarget).data("mz-item-div")).remove();
                  $('.item-count').text(newCount);
                  if(newCount === 0){
                      $('.wishlist-no-item-remove').removeClass('hidden');
                      $('.wishlist-data-container').addClass('hidden');
                      $('.addtobagall-btn').addClass('hidden');
                  }
                  self.displayWishlistCount();
                })
                .catch(function (errData) {
                });
                
      
              }else{
                var guestWishlistProducts = $.cookie('guestWishlistN');
                guestWishlistProducts = JSON.parse(guestWishlistProducts);
                var wishlistArray = [];
                var newCount1=guestWishlistProducts.length-1;
                $('.'+ $(e.currentTarget).data("mz-item-div")).remove();
                $('.item-count').text(newCount1);
                if(newCount1 === 0){
                    $('.wishlist-no-item-remove').removeClass('hidden');
                    $('.wishlist-data-container').addClass('hidden');
                    $('.addtobagall-btn').addClass('hidden');
                }
                var wishlisteItemObject = ($.cookie("guestWishlistN"))? ($.cookie("guestWishlistN")): false;
                wishlisteItemObject=JSON.parse(wishlisteItemObject);
                wishlisteItemObject.forEach(function(items){
                  if(productType == 'Standard'){
                    if(items.itemProductCode != id){
                      wishlistArray.push(items);
                    }
                  }else {
                  if(items.itemVPC != id){
                    wishlistArray.push(items);
                  }
                }
                });
                $.cookie("guestWishlistN" , JSON.stringify(wishlistArray), { path: '/', expires: 1 });
                self.highlightGreanHeart(id);
                self.displayWishlistCount();
              }
          
             }
             if($('body').hasClass('mz-cart')) {
              window.cartView.cartView.render();
             }
        },
        addItemToCart: function (e) {
            var self = this,
              $target = $(e.currentTarget),
              itemId = $target.data("mz-wishlist-item"),
              itemVpc = $target.data("data-mz-wishlist-item-vpc"),
              itemProductCode = $target.data("mzwishlistproductcode");
              //window.CartPopoutInstance.update();
              $target.prop("disabled",true);
              //window.location.href='/cart';
              var currentPageContext = require.mozuData("pagecontext");
              if(require.mozuData('user').isAuthenticated){
                this.model.get('wishlist').addItemToCart(itemId);
                var wishlistId = self.model.get('wishlist').get('wishlistId');
                if (itemId) {
                  var removeWishId = itemId;
    
                  api.request("DELETE", "/api/commerce/wishlists/"+wishlistId+"/items/"+itemId)
                          .then(function (res) {
                            self.getWishlistData();
                            self.highlightGreanHeart(itemVpc);
                            var itemLength = window.wishlistItemModel.get("wishlist").get('items').length;
                            var newCount=itemLength-1;
                          
                            $('.item_'+ itemId).remove();
                            $('.item-count').text(newCount);
                            if(newCount === 0){
                                $('.wishlist-no-item-remove').removeClass('hidden');
                                $('.wishlist-data-container').addClass('hidden');
                                $('.addtobagall-btn').addClass('hidden');
                            }
                            window.CartPopoutInstance.update();
                            if(currentPageContext.pageType === "cart") {
                              window.location.reload();
                            }
                            self.displayWishlistCount();
                          })
                          .catch(function (errData) {
                              console.log('errData',errData);
                          });
                
                 }
              }
              else{
                var guestWishlistProducts = $.cookie('guestWishlistN');
                guestWishlistProducts = JSON.parse(guestWishlistProducts);
                var wishlistArray = [];
                var newCount1=guestWishlistProducts.length-1;
                var wishlistItems = this.model.get('wishlist').get('items');
                wishlistItems.forEach(function(wishlistItem){
                  var productItemId = wishlistItem.get('productUsage') == "Standard" ? wishlistItem.get('productCode') : wishlistItem.get('variationProductCode');
                  if(productItemId ==  itemId){
                              var singleProductModel = new ProductModels.Product(wishlistItem.attributes);
                              singleProductModel.addToCart();
                               $('.'+ $(e.currentTarget).data("mz-item-div")).remove();
                               $('.item-count').text(newCount1);
                               if(newCount1 === 0){
                                   $('.wishlist-no-item-remove').removeClass('hidden');
                                   $('.wishlist-data-container').addClass('hidden');
                                   $('.addtobagall-btn').addClass('hidden');
                               }
                               var wishlisteItemObject = ($.cookie("guestWishlistN"))? ($.cookie("guestWishlistN")): false;
                               wishlisteItemObject=JSON.parse(wishlisteItemObject); 
                               wishlisteItemObject.forEach(function(items){
                                if(wishlistItem.get('productUsage') == 'Standard'){

                                  if(items.itemProductCode != productItemId){
                                    wishlistArray.push(items);
                                  }
                                }else {
                                 if(items.itemVPC != itemId){
                                   wishlistArray.push(items);
                                 }
                                }
                               });
                               $.cookie("guestWishlistN" , JSON.stringify(wishlistArray), { path: '/', expires: 1 });
                                setTimeout(function(){
                                  window.CartPopoutInstance.update();
                                  if(currentPageContext.pageType === "cart") {
                                    window.location.reload();
                                  }
                                  self.displayWishlistCount();
                                  self.highlightGreanHeart(itemId);
                                },800);
                              
                       }
                });
            

              }
              
              try {
                WishlistEvent.init.call({ variationProductCode:$target.data("mz-wishlist-item-vpc"), productCode:$target.data("mzwishlistproductcode"), isSingleLineItem:true });
              } catch (error) {
                console.log(error.message);
              }
        },
        addAllItemToCartNew: function(e){
          var self = this;
          var items = self.model.get('wishlist').get('items');
          var wishlistId = self.model.get('wishlist').get('wishlistId');
          var itemLength = window.wishlistItemModel.get("wishlist").get('items').length;
          var newCount=itemLength;
          var InStockItems = _.find(items.models, function(inStockItem){
            return inStockItem.get('purchasableStatusType') == "purchasable";
          });
          var InStockitems= [];
          var OutOfStockItems = [];
          items.models.forEach(function(item){
           if(item.get('purchasableStatusType') === "purchasable"){
              InStockitems.push(item);
            }else{
              OutOfStockItems.push(item);
            }
          });
         if(require.mozuData('user').isAuthenticated){
           api.request("POST","/api/commerce/carts/current/bulkitems", InStockitems)
                     .then(function(res){
                     window.CartPopoutInstance.update();
                      //self.deleteItemsFromWishlist(InStockitems,wishlistId,itemLength);
                   self.deleteWishlistItemRecursive(InStockitems,wishlistId,itemLength);
                   self.getWishlistData();
            });
          }

        },
        addItemToCartForGuest:function(wishlistItems){
          var self=this;
          wishlistItems.forEach(function(wishlistItem,index){
           if(index === 0){
              var singleProductModel = new ProductModels.Product(wishlistItem.attributes);
              singleProductModel.addToCart().then(function(){
                var itemId = wishlistItem.attributes.productUsage=='Standard' ? wishlistItem.attributes.productCode : wishlistItem.attributes.variationProductCode ;
                window.CartPopoutInstance.update();
                wishlistItems = wishlistItems.filter(function( item ) {
                  return wishlistItem.attributes.productUsage=='Standard' ? item.get('productCode') !== wishlistItem.attributes.productCode : item.get('variationProductCode') !== wishlistItem.attributes.variationProductCode;
                });
                self.highlightGreanHeart(itemId);
                self.addItemToCartForGuest(wishlistItems);
              });
            }
                     
                
          });
        },
        addAllItemToCart:function(e){
          var self = this;
          var items = self.model.get('wishlist').get('items');
          var wishlistId = self.model.get('wishlist').get('wishlistId');
          var itemLength = window.wishlistItemModel.get("wishlist").get('items').length;
          $(e.currentTarget).prop("disabled",true);
          var newCount=itemLength;
          if(require.mozuData('user').isAuthenticated){
            var InStockitems= [];
            var OutOfStockItems = [];
            items.models.forEach(function(item){
             if(item.get('purchasableStatusType') === "purchasable"){
                InStockitems.push(item);
              }else{
                OutOfStockItems.push(item);
              }
            });
            api.request("POST","/api/commerce/carts/current/bulkitems", InStockitems)
                       .then(function(res){
                        window.CartPopoutInstance.update();
                        //self.deleteItemsFromWishlist(InStockitems,wishlistId,itemLength);
                     self.deleteWishlistItemRecursive(InStockitems,wishlistId,itemLength);
                    
              });
          setTimeout(function(){
             self.getWishlistData();
             self.displayWishlistCount();
           },3800);
        }else{
          var guestWishlistProducts = $.cookie('guestWishlistN');
              guestWishlistProducts = JSON.parse(guestWishlistProducts);
              var newCount1=guestWishlistProducts.length-1;
              var wishlistItems = this.model.get('wishlist').get('items');
              self.addItemToCartForGuest(wishlistItems);
              setTimeout(function(){
                var wishlistArray = [];
                  $('.wishlist-no-item-remove').removeClass('hidden');
                  $('.wishlist-data-container').addClass('hidden');
                  $('.addtobagall-btn').addClass('hidden');
                  $.cookie("guestWishlistN" , JSON.stringify(wishlistArray),{ path: '/', expires: 1});
                  window.CartPopoutInstance.update();
                  self.displayWishlistCount();
              },600);
        }
        if(pageContext.pageType == 'product'){
          $('.wishlist-add').removeClass('hidden');
          $('.wishlist-added').addClass('hidden');
        }

      },
        deleteItemsFromWishlist:function(items,wishilistId,itemLength){
            var itemcount =0;
            var totalCount = itemLength;
            var newCount = totalCount;
            var me = this;
            items.forEach(function(item, index){
                var itemId = item.get('id');
                if(item.get('purchasableStatusType') == "purchasable"){
                    if (itemId) {
                        var removeWishId = itemId;
                        var end = 0;
                        setTimeout(function(){
                          var start = new Date().getTime();
                          var isItemExist = _.filter(items,function(item){
                             return item.get('id') == itemId;
                          });
                             api.request("DELETE", "/api/commerce/wishlists/"+wishilistId+"/items/"+itemId)
                              .then(function (res) {
                               end = new Date().getTime();
                            newCount = newCount-1;
                            $('.item_'+ itemId).remove();
                            $('.item-count').text(newCount);
                            if(newCount === 0){
                                $('.wishlist-no-item-remove').removeClass('hidden');
                                $('.wishlist-data-container').addClass('hidden');
                                $('.addtobagall-btn').addClass('hidden');
                            }
                            itemcount++;
                            var time = end - start;
                             })
                              .catch(function (errData) {
                                  console.log('errData',errData);
                              });
                            
                             
                        },1000);
                       
                      
                       }

                  try {
                    WishlistEvent.init.call({ variationProductCode: item.get('product').get('variationProductCode'), productCode: item.get('product').get('productCode'), isSingleLineItem: false });
                    if (index === (items.length - 1)) WishlistEvent.triggerAddAllBagEvent();
                  } catch (error) {
                    console.log('Error Occured While Firing Event For Add To All Bag From Wishlist', error.message);
                  }
                    }

               
            });
            
            setTimeout(function(){
             me.getWishlistData();
             },4000);
           
            // window.CartPopoutInstance.update();
        },

        deleteWishlistItemRecursive: function(items,wishilistId,itemLength){
          var itemcount =0;
          var totalCount = itemLength;
          var newCount = totalCount;
          var me = this;
          if(!_.isEmpty(items)){
            items.forEach(function(item,index){
              var itemId = item.get('id');
              if(item.get('purchasableStatusType') == "purchasable"){
                  if (itemId) {
                      var removeWishId = itemId;
                      var end = 0;
                    // setTimeout(function(){
                        var start = new Date().getTime();
                        var isItemExist = _.filter(items,function(item){
                          return item.get('id') == itemId;
                       });
                       if(index === 0){
                            api.request("DELETE", "/api/commerce/wishlists/"+wishilistId+"/items/"+itemId)
                            .then(function (res) {
                              items = items.filter(function( item ) {
                                return item.get('id') !== itemId;
                              });
                            end = new Date().getTime();
                            newCount = newCount-1;
                          $('.item_'+ itemId).remove();
                          $('.item-count').text(newCount);
                          if(newCount === 0){
                              $('.wishlist-no-item-remove').removeClass('hidden');
                              $('.wishlist-data-container').addClass('hidden');
                              $('.addtobagall-btn').addClass('hidden');
                          }
                          
                          itemcount++;
                          var time = end - start;
                          me.deleteWishlistItemRecursive(items,wishilistId,newCount);
                      
                       
                            })
                            .catch(function (errData) {
                                console.log('errData',errData);
                            });
                     }
                           
                    // },1000);
                     
                    
                     }

                     try {
                          WishlistEvent.init.call({ variationProductCode:item.get('product').get('variationProductCode'), productCode:item.get('product').get('productCode'), isSingleLineItem:false });
                          if(index === (items.length-1)) WishlistEvent.triggerAddAllBagEvent();
                     } catch (error) {
                        console.log('Error Occured While Firing Event For Add To All Bag From Wishlist', error.message);
                     }
                  }
                  
          });
          }
          
           
        },
        showWhishlistOfGuestUser:function(e){
            var wishlistData = JSON.parse(sessionStorage.getItem("wishlistItem"));
            if(wishlistData){
                window.wishlistItemModel.get("wishlist").get('items').reset(wishlistData,null);
            }
        },
        displayWishlistPopup: function() {
          var me = this;
          $(".wishlist-popup")
          .on('click',function(){
              $(".mz-minicart-popover").hide();
              $(".minicart-popup-container").hide();
              $(".mz-signin-popover").hide();
              $('.wishlist-loader').show();
              // $('.mz-hamburgmenu-option-container').hide();
            if(require.mozuData("user").isAuthenticated){
              $(".mz-backdrop-wishlist").addClass("active").removeClass("deactive");
              WishilistPopoutInstance.update().then(
                WishilistPopoutInstance.view.render()
             );
            }else{
              $(".mz-backdrop-wishlist").addClass("active").removeClass("deactive");
              WishilistPopoutInstance.update();
            }
            const wishListObject = {
              custom_event: 'navigation',
              event_params:{
                event_act: "top header links",
                event_lbl: "wishlist"
              }
              
            };
            if (window.globalEventBus) {
              window.globalEventBus.emit('dataLayerEvent', wishListObject);
            }
            if(require.mozuData("user").isAuthenticated) {
              setTimeout(function(){
                me.showWishlistPopover();
              },1000);
            }
            else {
              setTimeout(function(){
                me.showWishlistPopover();
              },3000);
            }
          
       });
       $('.wishlist-popup-mob').on('click',function(){
        $(".mz-minicart-popover").hide();
        $(".minicart-popup-container").hide();
        $(".mz-signin-popover").hide();
        $('.wishlist-label').hide();
        $('.wishlist-loader').show();
        if(require.mozuData("user").isAuthenticated){
         // $(".mz-backdrop-wishlist").addClass("active").removeClass("deactive");
          
          WishilistPopoutInstance.update().then(
            WishilistPopoutInstance.view.render()
         );
        }else{
        //  $(".mz-backdrop-wishlist").addClass("active").removeClass("deactive");
          WishilistPopoutInstance.update();
       
        }
     
        if(require.mozuData("user").isAuthenticated) {
          setTimeout(function(){
            me.showWishlistPopover();
          },1000);
        }
        else {
          setTimeout(function(){
            me.showWishlistPopover();
          },3000);
        }
       });
     
        },
        closeWishlistPopover: function(){
          $(".mz-wishlist-popover-container").hide();
          $('.mz-hamburgmenu-option-container').hide();
          $(".mz-backdrop").addClass("deactive").removeClass("active");
          $(".mz-backdrop").removeProp("style");  
          $(".mz-product").css("overflow","auto");
          $('.mz-l-pagecontent').css("overflow","auto");
          $("body").removeProp("style"); 
          $('body').css("overflow","auto");
          $(".mz-l-pagewrapper").addClass('sticky');
        },
        showWishlistPopover :function(){
          $(".mz-l-pagewrapper").removeClass('sticky');
          //$(".mz-backdrop-wishlist").addClass("deactive").removeClass("active");
          $('.wishlist-label').show();
          $('.wishlist-loader').hide();
          $('.mz-hamburgmenu-option-container').hide();
          $(".mz-wishlist-popover-container").show();
          $(".mz-backdrop").addClass("active").removeClass("deactive");
          $(".mz-backdrop").attr("style","top:0% !important; height:"+$(document).height()+"px !important;");
          $( ".mz-wishlist-popover-container" ).animate({ "right": "0px" }, "slow" );
          $(".mz-product").css("overflow","hidden");
          $('.mz-l-pagecontent').css("overflow","hidden");
          $('body').css("overflow","hidden");
        },
        displayWishlistCount: function(e){
          if(require.mozuData("user").isAuthenticated){
            api.request("GET", "/api/commerce/wishlists")
            .then(function(wishlistsData) {
              if(wishlistsData.items.length > 0) {
                api.request("GET", "/api/commerce/wishlists/customers/"+ require.mozuData("user").accountId +"/my_wishlist")
                .then(function(wishlistData) {
                  const wishlistItemModel = wishlistData.items;
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
            const wishlisteItemObject = JSON.parse(($.cookie("guestWishlistN"))? ($.cookie("guestWishlistN")): false);
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
    var WishilistPopoutInstance = {
   
        update: function() {
          if(require.mozuData("user").isAuthenticated){
            
            return api.request("GET", "/api/commerce/wishlists/customers/" + require.mozuData("user").accountId + "/my_wishlist?pageSize=200")
            .then(function(res) {
                setTimeout(function(){
                    window.wishlistItemModel.get("wishlist").get('items').reset(res.items,null);
                    window.wishlistItemModel.get("wishlist").set('wishlistId',res.id);
                    WishilistPopoutInstance.model  = window.wishlistItemModel;
                },180);
            
            });
          }
           else
          {
              var guestWishlistProducts = $.cookie('guestWishlistN');
             
               var items = [];
              if((guestWishlistProducts)){
                guestWishlistProducts = JSON.parse(guestWishlistProducts);
                guestWishlistProducts.forEach(function(wishproduct,index){
                  api.request('GET','/api/commerce/catalog/storefront/products/'+wishproduct.itemProductCode+'?variationProductCode='+wishproduct.itemVPC).then(function(res){
                   items.push(res);
                   GuestWishlistitems.push(res);
                  });
                });
               setTimeout(function(){
                  window.wishlistItemModel.get("wishlist").get('items').reset(items,null);
                  WishilistPopoutInstance.model  = window.wishlistItemModel;
                  WishilistPopoutInstance.view.render();
            
               },2500);
               
              }
          }
          
        }
    };
    $(document).ready(function () {
      $('.wishlist-loader').hide();
      var wishlistItemModel = (window.wishlistItemModel = CustomerModels.EditableCustomer.fromCurrent());
      if(require.mozuData("user").isAuthenticated){
        api.request("GET", "/api/commerce/wishlists")
        .then(function(wishlistsData) {
          if(wishlistsData.items.length > 0) {
            api.request("GET", "/api/commerce/wishlists/customers/" + require.mozuData("user").accountId + "/my_wishlist?pageSize=200")
            .then(function(res) {
              window.wishlistItemModel.get("wishlist").get('items').reset(res.items,null);
              window.wishlistItemModel.get("wishlist").set('wishlistId',res.id);
            })
            .catch(function(error) {
            });
          }
        });
      }
         
    setTimeout(function(){
  
    var element = $('.mz-wishlist-popover-container');
    if (window.matchMedia('(max-width: 1000px)').matches){
        if(require.mozuData("user").isAuthenticated){
          element = $('#wishlist-popover-mobile');
        }else{
          element = $('#wishlist-popover-mobile-guest');
        }
    }
   
    WishilistPopoutInstance.model  = window.wishlistItemModel;
    WishilistPopoutInstance.view = new WishListPopout({
        el: element,
        model: WishilistPopoutInstance.model
    });
    
    //WishilistPopoutInstance.update().then(
       // WishilistPopoutInstance.view.render()
    //);
    },500);


        window.WishilistPopoutInstance = WishilistPopoutInstance;

   

    });
});