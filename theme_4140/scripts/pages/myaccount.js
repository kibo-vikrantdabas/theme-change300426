define([
  "modules/backbone-mozu",
  "modules/api",
  "hyprlive",
  "hyprlivecontext",
  "modules/jquery-mozu",
  "underscore",
  "modules/models-customer",
  "modules/views-paging",
  "modules/editable-view",
  "modules/api",
  "modules/b2c-account/payment-methods-view",
  "modules/b2c-account/address-book-view",
  "modules/b2c-account/password-view",
  "modules/b2c-account/wishlist-view",
  "modules/b2c-account/account-settings-view",
  "modules/b2c-account/returns/order-item-listing-view",
  "modules/b2c-account/store-credit-view",
  "modules/mobile-number-length"
], function (
  Backbone,
  Api,
  Hypr,
  HyprLiveContext,
  $,
  _,
  CustomerModels,
  PagingViews,
  EditableView,
  api,
  PaymentMethodsView,
  AddressBookView,
  PasswordView,
  WishListView,
  AccountSettingsView,
  ReturnOrderListingView,
  StoreCreditView,
  MobileNumberChecker
) {
  
  
  var OrderHistoryView = Backbone.MozuView.extend({
    templateName: "modules/my-account/order-history-list",
    additionalEvents: {
      "click .cancel-button": "openOrderCancelPopup",
      "click .mz-close-icon": "closeModal",
      "click .back-button": "closeModal",
      "click .confirm-button": "cancelOrderByShipmentNumber",
      "click .mz-oc-allcheckbox": "orderCancelSelectAll",
      "click .mz-oc-singlecheckbox":"orderCancelOneItem"
    },    
    cancelOrderByShipmentNumber: function (event) {
      $(".popup-order-button .confirm-button").addClass("loader-btn");
      $(".popup-order-button .confirm-button").text("");
      var orderId;
      const self = this;
      const apiContext = require.mozuData("apicontext");
      var check = $(".mz-oc-allcheckbox").is(":checked");
      if (check) {
        var orderNumber = $(".mz-oc-allcheckbox").attr("data-mz-value");
        orderId = $(".mz-oc-allcheckbox").attr("data-mz-orderid");
        var baseURLAll = window.location.origin + "/shipmentorOrdercancel";
        var requestBodyAll = {
          orderId: orderId.toString(),
          shipments: [],
          isOrderCancel: true,
        };
        api.request("POST", baseURLAll, requestBodyAll).then(function (resp) {
          
          $(".popup-order-button .confirm-button").removeClass("loader-btn");
          $(".popup-order-button .confirm-button").text("Confirm");
          $(".mz-ordercancel-popup-container .mz-ordercancel-popup").hide();
          if(resp.statusCode === 200 ){
            setTimeout(function(){
              api.request("GET",apiContext.urls.orderService+orderId+"?mode=synthesized").then(function (orderInfo){
                if(orderInfo.id) {
                  
                  var orderStatus = orderInfo.status;
                  if(orderStatus.toLowerCase() === "cancelled") {
                    
                    $(".checkItemStatus").text(Hypr.getLabel("cancelled"));
                    $('.order-button .back-button').addClass('reload-page');
                    $('.order-button .cancel-button').prop('disabled', true);          
                    $('.order-heading-dates').find('span:eq(1)').html('<strong>'+Hypr.getLabel("orderStatus")+':</strong>'+ Hypr.getLabel("cancelled"));
                    
                  }
                  /*api.request("GET",apiContext.urls.storefrontShipmentsService+"?filter=orderId=="+orderInfo.id).then(function (shipmentInfo){
                    shipmentInfo.forEach(function(shipmentDetails){
                      shipmentDetails.canceledItems.forEach(function(lineItem){
                        $("."+shipmentDetails.shipmentNumber+'-'+lineItem.lineId).text(Hypr.getLabel("cancelled"));
                      });
                    })
                  });*/
                  
                }
              });
              $(".mz-backdrop").addClass("deactive").removeClass("active");
            },2000);
            
            
          }
          else{
            $(".mz-backdrop").addClass("deactive").removeClass("active");
          }
          
          
        });
      } else {
        var a = [];
         orderId = $(".mz-oc-allcheckbox").attr("data-mz-orderid");
        
        $(".mz-ordercancel-items")
          .find(".mz-oc-singlecheckbox:checked")
          .each(function () {
            if ($(this).attr("data-mz-value")) {
              var tempShipmentNumber = parseInt($(this).attr("data-mz-value"));
              var tempLineID = parseInt($(this).attr("data-mz-lineid"));
              var tempQuantity = parseInt($(this).attr("data-mz-Quantity"));
              var filterObj = a.filter(function(obj){
                return obj.shipmentNumber == tempShipmentNumber;
              });
              
              if(filterObj.length === 0){
                a.push({
                  "shipmentNumber": tempShipmentNumber,
                  "shipmentItems": [{
                    "lineId": tempLineID,
                    "quantity": tempQuantity 
                  }]
                });
              }else{
                a.forEach(function(obj){
                  if(obj.shipmentNumber == tempShipmentNumber){
                      obj.shipmentItems.push({
                        "lineId": tempLineID,
                        "quantity": tempQuantity 
                      });
                  }
                });
              }
            }
          });
        
        var baseURL = window.location.origin + "/shipmentorOrdercancel";
        var requestBody = {
          orderId: orderId.toString(),
          shipments: a,
          isOrderCancel: false,
        };
        var currentObj = self;
        api.request("POST", baseURL, requestBody).then(function (resp) {
          $(".popup-order-button .confirm-button").removeClass("loader-btn");
          $(".popup-order-button .confirm-button").text("Confirm");
          $(".mz-ordercancel-popup-container .mz-ordercancel-popup").hide();
          
          if(resp.success === 200 ){
            
            setTimeout(function(){
              api.request("GET",apiContext.urls.orderService+orderId+"?mode=synthesized").then(function (orderInfo){
                if(orderInfo.id) {
                  
                  var orderStatus = orderInfo.status;
                  if(orderStatus.toLowerCase() === "cancelled") {
                    
                    $(".checkItemStatus").text(Hypr.getLabel("cancelled"));
                    $('.order-button .back-button').addClass('reload-page');
                    $('.order-button .cancel-button').prop('disabled', true);       
                    $('.order-heading-dates').find('span:eq(1)').html('<strong>'+Hypr.getLabel("orderStatus")+':</strong>'+ Hypr.getLabel("cancelled"));
                    
                  }
                  else {
                    api.request("GET",apiContext.urls.storefrontShipmentsService+"?filter=orderId=="+orderInfo.id).then(function (shipmentInfo){
                      shipmentInfo._embedded.shipments.forEach(function(shipmentDetails){
                        shipmentDetails.canceledItems.forEach(function(lineItem){
                          $("."+shipmentDetails.shipmentNumber+'-'+lineItem.lineId).text(Hypr.getLabel("cancelled"));
                        });
                      });
                    });
                  }
                  
                  
                }
              });
              $(".mz-backdrop").addClass("deactive").removeClass("active");
            },2000);
            
          }
          else{
            $(".mz-backdrop").addClass("deactive").removeClass("active");
          }
          
        });
      }

      //Display Hide Header 
      this.displayHeader();

      this.updatePopupHeight(false);

    },
    openOrderCancelPopup: function (e) {
      this.updatePopupHeight(true);
      $(".popup-order-button .confirm-button").removeClass("loader-btn");
      $(".mz-ordercancel-popup-container .mz-ordercancel-popup").show();
      $(".mz-ordercancel-popup-container .mz-ordercancel-popup .cancelled-item-rows .mz-oc-singlecheckbox").prop("checked", false);
      if (window.matchMedia("(max-width: 710px)").matches) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      else {
        window.scrollTo({ top: (window.innerHeight)/2, behavior: 'smooth' });
      }
      
      //code for backdrop on checkout page
      setTimeout(function () {
        if (window.matchMedia("(max-width: 710px)").matches) {
          $("header").hide();
        }
      }, 200);

      $(".mz-backdrop").attr(
        "style",
        "top:0% !important; height:" + $(document).height() + "px !important;"
      );
      $(".mz-backdrop").addClass("active").removeClass("deactive");

      // MY account cancel order change -> Disable checkbox on popup
      var self = this;
      var orderNumber = $(".mz-oc-allcheckbox").attr("data-mz-value");
      var orderId = $(".mz-oc-allcheckbox").attr("data-mz-orderid");
      var o = self.model.toJSON();
      var f;
      if ($.isArray(o.items) && o.items.length > 0) {
        f = o.items.filter(function (obj) {
          return obj.orderNumber == orderNumber;
        });
        var ci = self.model.get("items").get(orderId).toJSON().shipments
          ._embedded.shipments[0].canceledItems;
        if ($.isArray(ci)) {
          for (var i = 0; i < ci.length; i++) {
            $('[data-mz-shipidorg="' + ci[i].originalOrderItemId + '"]').attr(
              "disabled",
              true
            );
          }
        }
      }
    },
    closeModal: function () {
      $(".mz-ordercancel-popup-container .mz-ordercancel-popup").hide();
      $(".mz-ordercancel-items")
        .find(":checkbox")
        .each(function () {
          $(this).prop("checked", false);
        });
      $(".mz-backdrop").addClass("deactive").removeClass("active");
      this.displayHeader();
      this.updatePopupHeight(false);
    },
    orderCancelOneItem: function () {
      var check = $(".mz-oc-singlecheckbox").is(":checked"); 

      if(check) {
        $(".popup-order-button .confirm-button").addClass("active");
      }
      else  {
        $(".popup-order-button .confirm-button").removeClass("active");
      }

      $(".popup-order-button .confirm-button").prop("disabled", check ? false : true);
    },
    orderCancelSelectAll: function () {
      var check = $(".mz-oc-allcheckbox").is(":checked");
      if (check) {
        $(".mz-ordercancel-details-item")
          .find(":checkbox")
          .each(function () {
            $(this).prop("checked", true);
          });
          $(".popup-order-button .confirm-button").addClass("active");
          $(".popup-order-button .confirm-button").prop("disabled", false);
      } else {
        $(".mz-ordercancel-details-item")
          .find(":checkbox")
          .each(function () {
            $(this).prop("checked", false);
          });
          $(".popup-order-button .confirm-button").removeClass("active");
          $(".popup-order-button .confirm-button").prop("disabled", true);
      }
    },
    getRenderContext: function () {
      var context = Backbone.MozuView.prototype.getRenderContext.apply(
        this,
        arguments
      );
      context.returning = this.returning;
      if (!this.returning) {
        context.returning = [];
      }
      context.returningPackage = this.returningPackage;
      return context;
    },
    
    render: function () {
      var self = this;
      var user = require.mozuData("user");
      Backbone.MozuView.prototype.render.apply(this, arguments);

      $.each(
        this.$el.find("[data-mz-order-history-listing]"),
        function (index, val) {
          var orderId = $(this).data("mzOrderId");
          var myOrder = self.model.get("items").get(orderId);
          
          var orderHistoryListingView = new OrderHistoryListingView({
            el: $(this).find(".listing"),
            model: myOrder,
            messagesEl: $(this).find("[data-order-message-bar]"),
          });
          orderHistoryListingView.render();
        }
      );

      $(document).on("click",".mz-myaccount #account-orderhistory .page .mz-vieworder-button",
        function () {
          $(
            ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections .listing .mz-order-detail"
          ).hide();
          $(
            ".mz-myaccount #account-orderhistory .page .mz-l-stack-sectiontitle"
          ).hide();
          $(
            ".mz-myaccount #account-orderhistory .page .mz-orderlisting-headings"
          ).hide();
          $(
            ".mz-myaccount #account-orderhistory .page .mz-orderlisting-headings"
          )
            .next()
            .hide();
          $(".mz-myaccount #account-orderhistory .page .mz-orders").hide();
          $(
            ".mz-myaccount #account-orderhistory .mz-order-tracking-section"
          ).hide();
          $(".mz-myaccount .mz-order-list-view").hide();
          $(
            ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections .listing .mz-order-detail-second"
          ).show();
          $("body")
            .removeClass("account-orderhistory-body")
            .addClass("account-orderdetail-body");

          // MyAccount Order Cancel Change
          var oid = $(this)
            .closest(".listing")
            .closest("li")
            .data("ordernumber");
          var $li = $('[data-ordernumber="' + oid + '"]');
          var flag = false;
          $li.find(".checkItemStatus").each(function () {
            if (
              $(this).text() &&
              $(this).text().trim() &&
              $(this).text().trim() != Hypr.getLabel("cancelled")
            ) {
              flag = true;
            }
          });
          if (!flag) {
            $li.find(".cancel-button").prop("disabled", true);
            $li.find(".cancel-button").css("background-color", "#F2F2F2");
            $li.find(".cancel-button").css("border", "1px solid #CCCCCC");
          }
          window.scrollTo({top: 0, behavior: 'smooth'});
        }
      );

      $(
        ".mz-myaccount .mz-order-detail-second .order-button .back-button"
      ).click(function () {
        sessionStorage.removeItem("currentOrderId");
        if($(this).hasClass("reload-page")) {
          if(window.location.href.indexOf("account-orderhistory") > -1) {
              location.reload();
          }
          else{
              window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/myaccount#account-orderhistory";
          }
        }
        else {
          $(
            ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections .listing .mz-order-detail"
          ).show();
          $(
            ".mz-myaccount #account-orderhistory .page .mz-l-stack-sectiontitle"
          ).show();
          $(
            ".mz-myaccount #account-orderhistory .page .mz-orderlisting-headings"
          ).show();
          $(".mz-myaccount #account-orderhistory .page .mz-orderlisting-headings")
            .next()
            .show();
          $(".mz-myaccount #account-orderhistory .page .mz-orders").show();
          $(
            ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections li"
          ).show();
          $(
            ".mz-order-list-view, .mz-order-list-view .mz-oderDetailsSections li"
          ).show();
          $(".mz-order-detail-second").hide();
          $("body")
            .removeClass("account-orderdetail-body")
            .addClass("account-orderhistory-body");
        }
        window.scrollTo({top: 0, behavior: 'smooth'});
      });
    },
    selectReturnItems: function () {
      if (typeof this.returning == "object") {
        $.each(this.returning, function (index, value) {
          $('[data-mz-start-return="' + value + '"]').prop(
            "checked",
            "checked"
          );
        });
      }
    },
    addReturnItem: function (itemId) {
      if (typeof this.returning == "object") {
        this.returning.push(itemId);
        return;
      }
      this.returning = [itemId];
    },
    removeReturnItem: function (itemId) {
      if (typeof this.returning == "object") {
        if (this.returning.length === 0) {
          delete this.returning;
        } else {
          var itemIdx = this.returning.indexOf(itemId);
          if (itemIdx != -1) {
            this.returning.splice(itemIdx, 1);
          }
        }
      }
    },
    getOrderShipment: function () {
      var orderHistory = window.accountModel.toJSON().orderHistory;
      if (orderHistory.totalCount > 0) {
        var orderNumber = orderHistory.items[0].orderNumber;
        var self = this;
        
        /*api
          .request("POST", "/getOrderShipment", { orderNumber: orderNumber })
          .then(function (res) {
            if (res.shipment !== undefined && res.shipment !== null) {
              var shipments = res.shipment._embedded.shipments;
              var data = shipments.filter(function (item) {
                return item.items.length > 0;
              });
              res.shipment._embedded.shipments = data;
              self.model.set("customShipment", res.shipment);
              self.render();
            }
          });*/
          //self.render();
      }
    },
    initialize: function () {
      var user = require.mozuData("user");
      if (!user.isAuthenticated) {
        this.getOrderShipment();
      }
      var self = this;
      $(document).on('click', ".mz-order-time-dropdown .item", function(){
        const apiContext = require.mozuData("apicontext");
        var filterOption = "?pageSize=5&startIndex=0&filter=Status ne Created and Status ne Validated and Status ne Pending and Status ne Abandoned and Status ne Errored ";
        if($(this).attr('dataValue') == 'six' || $(this).attr('dataValue') == 'six+'){
          var submittedDate = (new Date((new Date()).setMonth((new Date()).getMonth() -6))).toISOString();
          if($(this).attr('dataValue') == 'six'){
            filterOption += " and submittedDate gt "+submittedDate;
          }
          else{
            filterOption += " and submittedDate lt "+submittedDate;
          }
        }
        console.log(self);
        

        api.request("GET",apiContext.urls.orderService+filterOption).then(function (orderInfo){
          
          window.accountModel.set("orderHistory",orderInfo);
          
          self.render();
          window.accountViews.orderHistoryPageNumbers.model.set(orderInfo);
          window.accountViews.orderHistoryPageNumbers.render();
        });
      });
      
    },
    displayHeader : function() {
      $("header").removeAttr('style');
    },
    updatePopupHeight : function(bool) {
      if (window.matchMedia("(max-width: 500px)").matches) {
        var props = { };
        if(bool) {
          props = {
              position : 'relative',
              top : '-5em'
          };
          $('.mz-ordercancel-popup').css('height',$(document).height()+'px');
          $("footer").hide();
          $(".mz-orderhistory-section").css(props);
        }
        else {
          props = {
              position : '',
              top : ''
          };
          $('.mz-ordercancel-popup').css('height','');
          $("footer").show();
          $(".mz-orderhistory-section").css(props);
        }
      }
    }
  });

  var OrderHistoryListingView = Backbone.MozuView.extend({
    templateName: "modules/my-account/order-history-listing",
    initialize: function () {
      this._views = {
        standardView: this,
        returnView: null,
      };

      if(location.href.includes('my-anonymous-account')) {
        this.setPickupLocationAddress(Number(sessionStorage.getItem('currentOrderId')));
      }
      else {
        if(!_.isNull(sessionStorage.getItem('currentOrderId')) && (location.href.endsWith('history') || location.href.includes('my-anonymous-account'))) 
          this.setPickupLocationAddress(Number(sessionStorage.getItem('currentOrderId')));
      }
    },
    views: function () {
      return this._views;
    },
    viewOrder: function (e) {
      var self = this;
      //
      var orderid = $(e.currentTarget).data("mzItemId");
      sessionStorage.setItem("currentOrderId", orderid);
      $(document).find(".mz-oderDetailsSections > li").hide();
      
        const apiContext = require.mozuData("apicontext");
        self.model.set('totalOrderItems', self.model.get('items').length);
        api.request("GET",apiContext.urls.storefrontShipmentsService+"?filter=orderId=="+self.model.get("id")).then(function (res){
          if(res && res._embedded) {
            var totalOrderItems = 0;
            var shipmentData = res._embedded.shipments.filter(function (item) { 
              if(!item.parentShipmentNumber) {
                if(item.items.length > 0 ) {
                  totalOrderItems += item.items.length;
                }
                else {
                  totalOrderItems += item.canceledItems.length;
                }
              } 
               return !item.parentShipmentNumber && (item.items.length > 0 || item.canceledItems.length > 0);
              });
            if(shipmentData.length == 0 ) {
              shipmentData = res._embedded.shipments.filter(function (item) { 
                if(!item.parentShipmentNumber) {
                  if(item.items.length > 0 ) {
                    totalOrderItems += item.items.length;
                  }
                  else {
                    totalOrderItems += item.canceledItems.length;
                  }
                }
                else {
                  if(item.items.length > 0 || item.canceledItems.length > 0) {
                    totalOrderItems += item.canceledItems.length;
                  }
                }
                 return (item.items.length > 0 || item.canceledItems.length > 0);

              });
            }
            res._embedded.shipments = shipmentData;
            self.model.set('totalOrderItems', totalOrderItems);
          }
          self.model.set("shipments", res);
          
          self.render();          
          $(document)
            .find(
              '.mz-oderDetailsSections > li[data-orderNumber="' + orderid + '"]'
            )
            .show();
            $(document)
            .find(
              '.mz-oderDetailsSections > li[data-orderNumber="' + orderid + '"]'
            )
            .find('.mz-order-detail-second').show();
            $(
              ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections .listing .mz-order-detail"
            ).hide();
        });
      
      
        this.setPickupLocationAddress(Number(sessionStorage.getItem('currentOrderId')));
        
        
      
      
      
    },
    getRenderContext: function () {
      var context = Backbone.MozuView.prototype.getRenderContext.apply(
        this,
        arguments
      );
      context.returning = this.returning;
      if (!this.returning) {
        context.returning = [];
      }
      context.returningPackage = this.returningPackage;
      return context;
    },
    render: function () {
      var self = this;
      Backbone.MozuView.prototype.render.apply(this, arguments);

      if (!this._views.returnView) {
        this._views.returnView = new ReturnOrderListingView({
          el: self.el,
          model: self.model,
        });
        this.views().returnView.on("renderMessage", this.renderMessage, this);
        this.views().returnView.on("returnCancel", this.returnCancel, this);
        this.views().returnView.on("returnSuccess", this.returnSuccess, this);
        this.views().returnView.on("returnFailure", this.returnFailure, this);
      }
    },
    renderMessage: function (message) {
      var self = this;
      if (message) {
        if (message.messageType) {
          message.autoFade = true;
          this.model.messages.reset([message]);
          this.messageView.render();
        }
      }
    },
    returnSuccess: function () {
      this.renderMessage({
        messageType: "returnSuccess",
      });
      this.render();
    },
    returnFailure: function () {
      this.renderMessage({
        messageType: "returnFailure",
      });
      this.render();
    },
    returnCancel: function () {
      this.render();
    },
    selectReturnItems: function () {
      if (typeof this.returning == "object") {
        $.each(this.returning, function (index, value) {
          $('[data-mz-start-return="' + value + '"]').prop(
            "checked",
            "checked"
          );
        });
      }
    },
    addReturnItem: function (itemId) {
      if (typeof this.returning == "object") {
        this.returning.push(itemId);
        return;
      }
      this.returning = [itemId];
    },
    removeReturnItem: function (itemId) {
      if (typeof this.returning == "object") {
        if (this.returning.length === 0) {
          delete this.returning;
        } else {
          var itemIdx = this.returning.indexOf(itemId);
          if (itemIdx != -1) {
            this.returning.splice(itemIdx, 1);
          }
        }
      }
    },
    startOrderReturn: function (e) {
      this.model.clearReturn();
      this.views().returnView.render();
    },
    setPickupLocationAddress: function(currentOrder) {
       var modelRaw = this.model.toJSON(),
           isSTH;
           
           if(!location.href.includes('my-anonymous-account')) if(modelRaw.orderNumber != currentOrder) return;
          
           if(modelRaw) isSTH = _.find(modelRaw.explodedItems, function(value){ return value.fulfillmentMethod.toLowerCase() == "ship"; });

           if(location.href.includes('my-anonymous-account')) {
              isSTH =  this.model.get('fulfillmentInfo').shippingMethodCode ? true : false;
           }

           this.model.set('isSTHShipment', isSTH ? true : false);
           
           if(!isSTH) this.setStoreLocationDetails(modelRaw);

    },
    setStoreLocationDetails: function(modelRaw) {
        var self = this;
        
        self.model.set('storeName', modelRaw.explodedItems[0].purchaseLocation);

        api.get('locations', { filter: 'code eq ' + modelRaw.explodedItems[0].fulfillmentLocationCode }).then(function(res){
          var location;

          location = res.data.items[0];
          
          self.model.set('storeAddress1', location.address.address1);
          self.model.set('storeAddress2', location.address.address2);
          self.model.set('storeAddress3', location.address.address3);
          self.model.set('storeCityOrTown', location.address.cityOrTown);
          self.model.set('storeCountryCode', location.address.countryCode);
          self.model.set('storePhoneNumber', location.phone);

          if($('.store-delivery-address .storeAddressOne').text().length === 0) {
            var htmlText = location.address.address1.concat(location.address.address2, '</br>', location.address.cityOrTown,'</br>', location.address.countryCode, "</br>" ,location.phone);
            $('.store-delivery-address .store-address-details').html(htmlText);
          }
          
        });

        
    },

  });

 

  var ReturnHistoryView = Backbone.MozuView.extend({
    templateName: "modules/my-account/return-history-list",
    initialize: function () {
      var self = this;
      this.listenTo(
        this.model,
        "change:pageSize",
        _.bind(this.model.changePageSize, this.model)
      );
      this.listenTo(this.model, "returndisplayed", function (id) {
        var $retView = self.$('[data-mz-id="' + id + '"]');
        if ($retView.length === 0) $retView = self.$el;
        $retView.ScrollTo({
          axis: "y",
        });
      });
    },
    printReturnLabel: function (e) {
      var self = this,
        $target = $(e.currentTarget);

      //Get Whatever Info we need to our shipping label
      var returnId = $target.data("mzReturnid"),
        returnObj = self.model.get("items").findWhere({
          id: returnId,
        });

      var printReturnLabelView = new PrintView({
        model: returnObj,
      });

      var _totalRequestCompleted = 0;

      _.each(returnObj.get("packages"), function (value, key, list) {
        window.accountModel
          .apiGetReturnLabel({
            returnId: returnId,
            packageId: value.id,
            returnAsBase64Png: true,
          })
          .then(function (data) {
            value.labelImageSrc = "data:image/png;base64," + data;
            _totalRequestCompleted++;
            if (_totalRequestCompleted == list.length) {
              printReturnLabelView.render();
              printReturnLabelView.loadPrintWindow();
            }
          });
      });
    },
  });

  var PrintView = Backbone.MozuView.extend({
    templateName: "modules/my-account/my-account-print-window",
    el: $("#mz-printReturnLabelView"),
    initialize: function () {},
    loadPrintWindow: function () {
      var host = HyprLiveContext.locals.siteContext.cdnPrefix,
        printScript = host + "/scripts/modules/print-window.js",
        printStyles = host + "/stylesheets/modules/my-account/print-window.css";

      var my_window,
        self = this,
        width = window.screen.width - window.screen.width / 2,
        height = window.screen.height - window.screen.height / 2,
        offsetTop = 200,
        offset = window.screen.width * 0.25;

      my_window = window.open(
        "",
        "mywindow" + Math.random() + " ",
        "width=" +
          width +
          ",height=" +
          height +
          ",top=" +
          offsetTop +
          ",left=" +
          offset +
          ",status=1"
      );
      my_window.document.write("<html><head>");
      my_window.document.write(
        '<link rel="stylesheet" href="' + printStyles + '" type="text/css">'
      );
      my_window.document.write("</head>");

      my_window.document.write("<body>");
      my_window.document.write($("#mz-printReturnLabelView").html());

      my_window.document.write('<script src="' + printScript + '"></script>');

      my_window.document.write("</body></html>");
    },
  });

  var displayOrderOrPaymentDetails = function () {
    var urlBase = _.last(location.href.split("#")),
      section = $(".myacc .mz-myaccount-panels").find("[id='" + urlBase + "']");
    if (section.length) {
      $(section).show();
      $(".myacc_wrapper").hide();
      $(".backto-myacc").addClass("active");
      if (_.last(urlBase.split("-")).toLowerCase().includes("payment"))
        $(".myacc-page-title").text("/".concat(" ", Hypr.getLabel("cards")));
      if (_.last(urlBase.split("-")).toLowerCase().includes("order"))
        $(".myacc-page-title").text(
          "/".concat(" ", Hypr.getLabel("orderReturns"))
        );
    }
    if (window.location.href.indexOf("#account-paymentmethods") > -1) {
      $("body").addClass("account-paymentmethods-body");
    }
  };

  var scrollToTop = function () {
    $(window).bind("hashchange", function () {
      $(document).scrollTop(0);
    });
  };

  $(document).ready(function () {
    var accountModel = (window.accountModel =
      CustomerModels.EditableCustomer.fromCurrent());
    var accountModelContact = accountModel.get("contacts").filter(function(item){ return item.get("address").get("countryCode") === Hypr.getThemeSetting('countrySpecificCode');});
      accountModel.set("contacts", accountModelContact);
    var user = require.mozuData("user");

    var $accountSettingsEl = $("#account-settings"),
      $passwordEl = $("#password-section"),
      $orderHistoryEl = $("#account-orderhistory"),
      $returnHistoryEl = $("#account-returnhistory"),
      $paymentMethodsEl = $("#account-paymentmethods"),
      $addressBookEl = $("#account-addressbook"),
      $wishListEl = $("#account-wishlist"),
      $messagesEl = $("#account-messages"),
      $storeCreditEl = $("#account-storecredit"),
      orderHistory = accountModel.get("orderHistory"),
      returnHistory = accountModel.get("returnHistory");



      // MSKK-360: Guest Order Tracking - Partial Cancellation - Sub-Total Value is mismatch on Storefront
      if (user.isAuthenticated) {
        orderHistory.get('items').forEach(function(orderItem,index){
          if(orderItem.get('status').toLowerCase() !== "cancelled" && orderItem.get('shipments')._embedded) {
              var canceledItems = orderItem.get('shipments')._embedded.shipments[0].canceledItems;
              if(canceledItems) {
                var totalCanceledItemAmount = canceledItems.reduce(function(prev, current) {
                  return prev + current.lineItemCost;
                }, 0);
                if(totalCanceledItemAmount > 0){
                  orderItem.set('total',orderItem.get('total') - totalCanceledItemAmount);
                  orderItem.set('subtotal',orderItem.get('subtotal') - totalCanceledItemAmount);                  
                }
              }
          }
        });
      }

      if (!user.isAuthenticated) {        
        var currentCountry = require.mozuData("aramexcountries");        

        orderHistory.get('items').forEach(function(orderItem,index){
          var billingInfo = orderItem.get('billingInfo');
          var billingContact = billingInfo.billingContact;
          var billingAddress = billingContact.address;

          if (currentCountry.length > 0) {
            for (var i = 0; i < currentCountry.length; i++) {                
              if(billingAddress['countryCode'] == currentCountry[i]['countryCode']) {                      
                billingAddress['countryName'] = currentCountry[i]['countryName'];
              }
            }
          }
        });          
      }

    var accountViews = (window.accountViews = {
      settings: new AccountSettingsView({
        el: $accountSettingsEl,
        model: accountModel,
        messagesEl: $messagesEl,
      }),
      password: new PasswordView({
        el: $passwordEl,
        model: accountModel,
        messagesEl: $messagesEl,
      }),

      orderHistory: new OrderHistoryView({
        el: $orderHistoryEl.find("[data-mz-orderlist]"),
        model: orderHistory,
      }),
      orderHistoryPagingControls: new PagingViews.PagingControls({
        templateName: "modules/my-account/order-history-paging-controls",
        el: $orderHistoryEl.find("[data-mz-pagingcontrols]"),
        model: orderHistory,
      }),
      orderHistoryPageNumbers: new PagingViews.PageNumbers({
        el: $orderHistoryEl.find("[data-mz-pagenumbers]"),
        model: orderHistory,
      }),
      returnHistory: new ReturnHistoryView({
        el: $returnHistoryEl.find("[data-mz-orderlist]"),
        model: returnHistory,
      }),
      returnHistoryPagingControls: new PagingViews.PagingControls({
        templateName: "modules/my-account/order-history-paging-controls",
        el: $returnHistoryEl.find("[data-mz-pagingcontrols]"),
        model: returnHistory,
      }),
      returnHistoryPageNumbers: new PagingViews.PageNumbers({
        el: $returnHistoryEl.find("[data-mz-pagenumbers]"),
        model: returnHistory,
      }),
      paymentMethods: new PaymentMethodsView({
        el: $paymentMethodsEl,
        model: accountModel,
        messagesEl: $messagesEl,
      }),
      addressBook: new AddressBookView({
        el: $addressBookEl,
        model: accountModel,
        messagesEl: $messagesEl,
      }),
      storeCredit: new StoreCreditView({
        el: $storeCreditEl,
        model: accountModel,
        messagesEl: $messagesEl,
      }),
    });

    if (
      HyprLiveContext.locals.siteContext.generalSettings
        .isWishlistCreationEnabled
    )
      accountViews.wishList = new WishListView({
        el: $wishListEl,
        model: accountModel.get("wishlist"),
        messagesEl: $messagesEl,
      });

    // TODO: upgrade server-side models enough that there's no delta between server output and this render,
    // thus making an up-front render unnecessary.
    _.invoke(window.accountViews, "render");
    // My Account Page Navigations
    $(".nav_links a").on("click", function (e) {
      e.preventDefault();
      var link = $(this).attr("data-mz-acc-link");
      if (link == "account-orderhistory") {
         sessionStorage.removeItem("currentOrderId");
      }
      document.body.scrollTop = 0; // For Safari
      document.documentElement.scrollTop = 0;
      history.pushState(
        location.origin.concat("/myaccount"),
        "",
        location.origin.concat(location.pathname)
      );
      $("#account-panels")
        .find(".mz-l-stack-section")
        .each(function (index, value) {
          var id = $(this).attr("id");
          if (id == link) {
            if (link == "account-orderhistory") {
              sessionStorage.removeItem("currentOrderId");
              if(window.location.href.indexOf("account-orderhistory") > -1) {
                  location.reload();
              }
              else{
                  window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/myaccount#account-orderhistory";
              }
              return; 
            }
            $(".myacc_wrapper").hide();
            $(".hide-sections").hide();
            $(".backto-myacc").addClass("active");
            var pageTitle = $(this).find(".mz-l-stack-sectiontitle").text();
            if(pageTitle === "Credit & debit cards Add new card") {
              $(".myacc-page-title").text("/ " + "Payment Cards");
            } else if(pageTitle === "Your delivery addresses Add new address") {
              $(".myacc-page-title").text("/ " + "Delivery address");
            }else {
              $(".myacc-page-title").text("/ " + pageTitle);
            }
            $(this).show();
            if (link == "account-paymentmethods") {
              $(this).addClass("account-paymentmethods-open");
              $("body").addClass("account-paymentmethods-body");
            }
            if (link == "account-settings") {
              $("body").addClass("account-setting-body");
              $(".accountsettings-alert-message").addClass("hidden");
              /**** Check About form filled or not ************** */
                var empty = false;
                $(".mz-accountsettings-aboutyou input.required-field").each(
                  function () {
                    if ($(this).val() === "") {
                      empty = true;
                    }
                  }
                );
                  
                if(empty) {
                  $("#saveabout").attr("disabled", "disabled");
                }
                else{
                  $("#saveabout").css({ background: "#b7c74e" });
                }
              /**** End Check About form filled or not **********/ 
            }
            
            if (link == "password-section") {
              $("body").addClass("pass-section-body");
            }
            if (link == "account-addressbook") {
              $("body").addClass("account-addressbook-body");
            }
          }
        });
    });
    if (window.location.href.indexOf("#account-orderhistory") > -1) {
      $("body")
        .removeClass("account-orderdetail-body")
        .addClass("account-orderhistory-body");
        if(window.performance.navigation.type){
          var orderId = sessionStorage.getItem("currentOrderId");
          if(orderId && $(document).find('.mz-oderDetailsSections > li[data-orderNumber="' + orderId + '"]').length > 0){
            $(
              ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections .listing .mz-order-detail"
            ).hide();
            $(
              ".mz-myaccount #account-orderhistory .page .mz-l-stack-sectiontitle"
            ).hide();
            $(
              ".mz-myaccount #account-orderhistory .page .mz-orderlisting-headings"
            ).hide();
            $(".mz-myaccount #account-orderhistory .page .mz-orderlisting-headings")
              .next()
              .hide();
            $(".mz-myaccount #account-orderhistory .page .mz-orders").hide();
            $(
              ".mz-myaccount #account-orderhistory .mz-order-tracking-section"
            ).hide();
            $(".mz-myaccount .mz-order-list-view").hide();
            $(
              ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections .listing .mz-order-detail-second"
            ).show();
            $("body")
              .removeClass("account-orderhistory-body")
              .addClass("account-orderdetail-body");
            $(document).find(".mz-oderDetailsSections > li").hide();
            $(document)
            .find(
              '.mz-oderDetailsSections > li[data-orderNumber="' + orderId + '"]'
            )
            .show();
            $(document)
            .find(
              '.mz-oderDetailsSections > li[data-orderNumber="' + orderId + '"]'
            )
            .find('.mz-order-detail-second').show();
            $(
              ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections .listing .mz-order-detail"
            ).hide();
          }
        }
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
    if (window.location.href.indexOf("#account-paymentmethods") > -1) {
      $("body").addClass("account-paymentmethods-body");
      $("#account-paymentmethods").addClass("account-paymentmethods-open");
      $(".myacc-page-title").text("/ " + "Payment Cards");
    }
    $(".nav_links .title").on("click", function () {
      $(this).toggleClass("active");
      $(this).next().slideToggle();
    });
    $(".nav_links_blue .title").on("click", function () {
      $(this).toggleClass("active");
      $(this).next().slideToggle();
    });
    // Back to My Accound Dashboard
    $(".backto-myacc").on("click", function () {
      $(this).removeClass("active");
      $("body").removeClass("account-paymentmethods-body");
      $("body").removeClass("account-orderhistory-body");
      $("body").removeClass("account-orderdetail-body");
      $("body").removeClass("account-setting-body");
      $(".afg-ms-pageheader").css("visibility","unset");
      $("#account-panels .mz-l-stack-section").each(function (index, value) {
        $(this).addClass("hide-sections").removeAttr("style");
        $(".myacc_wrapper").show();
        $(".myacc-page-title").text("");
        /**
         * Below Line Of Code Remove That Base Name
         * Which Includes #
         * After Clicking On My Account Link From
         * The Breadcrumbd Of My Account Page
         */
        if (location.href.includes("#"))
          history.pushState({}, "", location.origin.concat(location.pathname));
      });
    });

    $(".logout").click(function () {
      var pageContext = require.mozuData('pagecontext') ? require.mozuData('pagecontext') : '';
      var apiContext = require.mozuData('apicontext');
      var user = require.mozuData('user') ? require.mozuData('user'): '';
      var pageURL = window.location.href;
      var pageTitle = (pageContext.cmsContext)? pageContext.cmsContext.template.path.toLowerCase():""; 
      var locale = apiContext.headers['x-vol-locale'];
      if(window.globalEventBus){  
        var eventData = {
        'event': 'pageView',    // for all page view event you can pass this event
        'pageUrl': pageURL,
        'pageTitle': pageTitle, //some arbitrary name for the page/state
        'login_status': "guest", //guest, logged-in
        'locale':locale // en-ae,ar-ae
        };
        window.globalEventBus.emit('dataLayerEvent', eventData);
        localStorage.setItem('userLogged', 'true');
      }
      var logoEventData = {
        "event": "eventTracker",
        "custom_event": "account",
        event_params:{
          event_act: "sign out",
          event_lbl: "sign out",
          login_status:"logged-out"
        }
      };
      if (window.globalEventBus) {
     //   window.globalEventBus.emit("dataLayerEvent", logoEventData);
      }
    });

  });

  displayOrderOrPaymentDetails();
  scrollToTop();

  $(document).ready(function () {
    $(window).on("popstate", function () {
      location.reload(true);
    });
    if (document.referrer.indexOf("/login") > -1) {
      history.pushState([], "", location.origin.concat(location.pathname));
    }
    $(document).on("click",".mz-myaccount #account-orderhistory .page .mz-vieworder-button",
      function () {
        $(
          ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections .listing .mz-order-detail"
        ).hide();
        $(
          ".mz-myaccount #account-orderhistory .page .mz-l-stack-sectiontitle"
        ).hide();
        $(
          ".mz-myaccount #account-orderhistory .page .mz-orderlisting-headings"
        ).hide();
        $(".mz-myaccount #account-orderhistory .page .mz-orderlisting-headings")
          .next()
          .hide();
        $(".mz-myaccount #account-orderhistory .page .mz-orders").hide();
        $(
          ".mz-myaccount #account-orderhistory .mz-order-tracking-section"
        ).hide();
        $(".mz-myaccount .mz-order-list-view").hide();
        $(
          ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections .listing .mz-order-detail-second"
        ).show();
        $("body")
          .removeClass("account-orderhistory-body")
          .addClass("account-orderdetail-body");
        window.scrollTo({top: 0, behavior: 'smooth'});
      }
    );
    $(document).on("click", ".download-invoice-button", function () {
      var shipment_id = $(this)
        .closest(".mz-orderlisting-detail")
        .find(".shipment-count:eq(0)")
        .attr("data-mz-shipment-id");

      api
        .request("GET", "/invoice/generate?shipment_id=" + shipment_id)

        .then(function (res) {
          if (res) {
            var responseData = res;
            if (responseData.content && responseData.content !== undefined) {
              var invoiceHtml = responseData.content.replace(
                /  |\r\n|\n|\t|\r/gm,
                ""
              );
              $(".printInvoice").html(invoiceHtml);
              $(".printInvoice")
                .find(".non-print-invoice-section")
                .remove();
              $(".printInvoice").find(".arabic-heading").html('فاتورة');
              $('.header-info-right').find('.orderNumber').html('رقم الطلب');
              $('.header-info-right').find('.invoiceNumber').html('رقم الفاتورة');
              $('.header-info-right').find('.paymentMethod').html('رقم الفاتورة');
              $('.invoice-item-header').find('.unitPriceArabic').html('سعر الوحدة');
              $('.invoice-item-header').find('.qtyArabic').html('سعر الوحدة');
              $('.invoice-item-header').find('.discountArabic').html('تخفيض');
              $('.invoice-item-header').find('.valueArabic').html('قيمة');
              $('.order-invoice-right-section').find('.tbd').html('الإجمالي قبل الخصم');
              $('.order-invoice-right-section').find('.discountArabic').html('تخفيض');
              $('.order-invoice-right-section').find('.dcArabic').html('رسوم التوصيل');
              $('.order-invoice-right-section').find('.stArabic').html('المجموع الفرعي');
              $('.order-invoice-right-section').find('.totalArabic').html('المجموع');
              $(".printInvoice").find('.customerServiceArStatement').html('تحتاج إلى مساعدة؟ إذا كانت لديك أسئلة بخصوص هذه الفاتورة أو المنتجات، فيرجى الاتصال بنا على 96522250508+. أوقات العمل من 8 صباحًا إلى 8 مساءً، طوال أيام الأسبوع.');
             // $(".printInvoice").find(".arabic-footer-content").html('<span class="inline-heading">غيرت رأيك؟ </span> قم بإرجاع أي من العناصر الخاصة بك في غضون 35 يومًا طالما أنها تتوافق مع سياسة الإرجاع الخاصة بنا. للقيام بذلك ، قم بزيارة متجرنا وقدم فاتورتك الضريبية أو اتصل على 800123456789 الفاتورة الضریبیة');
              $(".printInvoice").find(".arabic-footer-address").html('<div class="order-row">شركة الفطيم كويت للأسواق المركزية</div>'+
              '<div class="order-row">سجل تجاري: 340027</div>'+
              // '<div class="order-row">TRN 100015635400003</div>'+
              '<div class="order-row">العنوان : السالمية, شارع سالم المبارك, قطعة 2, برج ذا فيو</div>');
              $(".printInvoice").find(".payment-method-name").each(function(){
                $(this).text(Hypr.getLabel($(this).attr('data-name')));
              });
              $(".mz-printable-order-invoice").show();
              invoiceHtml = $(".printInvoice").html();
              $(".printInvoice").html("");
              var width = window.screen.width - window.screen.width / 2;
              var height = window.screen.height - window.screen.height / 2;
              var offsetTop = 200;
              var offset = window.screen.width * 0.25;

              var printWindow = window.open(
                "",
                "mywindow" + Math.random() + " ",
                "width=" +
                  width +
                  ",height=" +
                  height +
                  ",top=" +
                  offsetTop +
                  ",left=" +
                  offset +
                  ",status=1"
              );
              var is_chrome = Boolean(printWindow.chrome);
              printWindow.document.write(
                "<html><head><title>Print Invoice</title>"
              );
              printWindow.document.write("</head><body >");
              printWindow.document.write(invoiceHtml);
              printWindow.document.write("</body></html>");
              if (is_chrome) {
                
                setTimeout(function () { // wait until all resources loaded                   
                        printWindow.document.close(); 
                        printWindow.focus(); 
                        printWindow.print();  
                        printWindow.close();
                }, 1000);
            }
            else {
                printWindow.document.close(); 
                printWindow.focus(); 
        
                printWindow.print();
                printWindow.close();
            }
              //printWindow.document.close();
              //printWindow.print();
              // printWindow.document.close();
            } else {
              alert(responseData.message);
            }
          }
        });
    });
    $(".mz-backdrop").on("click", function (event) {
      $(event.currentTarget).hide();
      $(".mz-ordercancel-popup-container .mz-ordercancel-popup").hide();
    });

    //Enable or disable Confirm button on cancel order popup
    $(".mz-oc-singlecheckbox").click(function () {      
      if ($(this).is(":checked")) {
        $(".popup-order-button .confirm-button").addClass("active");
        $(".popup-order-button .confirm-button").prop("disabled", false);
      } else {
        if($(this).closest('.mz-blue-popup-body-container').find('.mz-oc-allcheckbox').prop("checked")){
          var checkedItem = $(this).closest(".mz-blue-popup-body-container").find(".mz-ordercancel-details-item")
          .find(":checkbox:checked").length;
          if(checkedItem === 0) {
            $(".popup-order-button .confirm-button").removeClass("active");
            $(".popup-order-button .confirm-button").prop("disabled", true);
          }
        }
        else {
          $(".popup-order-button .confirm-button").removeClass("active");
          $(".popup-order-button .confirm-button").prop("disabled", true);
        }
      }
    });

    $(".mz-oc-allcheckbox").click(function () {
      if ($(this).is(":checked")) {
        $(".popup-order-button .confirm-button").addClass("active");
        $(".popup-order-button .confirm-button").prop("disabled", false);
      } else {
        $(".popup-order-button .confirm-button").removeClass("active");
        $(".popup-order-button .confirm-button").prop("disabled", true);
      }
    });
  });
  $(document).ready(function () {
    $(document).on("click",".mz-myaccount .mz-order-detail-second .order-button .back-button",
      function () {
        sessionStorage.removeItem("currentOrderId");
        if($(this).hasClass("reload-page")) {
          if(window.location.href.indexOf("account-orderhistory") > -1) {
              location.reload();
          }
          else{
              window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/myaccount#account-orderhistory";
          }
        }
        
        else {
          $(
            ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections .listing .mz-order-detail"
          ).show();
          $(
            ".mz-myaccount #account-orderhistory .page .mz-l-stack-sectiontitle"
          ).show();
          $(
            ".mz-myaccount #account-orderhistory .page .mz-orderlisting-headings"
          ).show();
          $(".mz-myaccount #account-orderhistory .page .mz-orderlisting-headings")
            .next()
            .show();
          $(".mz-myaccount #account-orderhistory .page .mz-orders").show();
          $(
            ".mz-myaccount #account-orderhistory .page .mz-oderDetailsSections li"
          ).show();
          $(
            ".mz-order-list-view, .mz-order-list-view .mz-oderDetailsSections li"
          ).show();
          $(".mz-order-detail-second").hide();
          $("body")
            .removeClass("account-orderdetail-body")
            .addClass("account-orderhistory-body");
        }
        window.scrollTo({top: 0, behavior: 'smooth'});
      }
    );
  });
  $(document).ready(function () {
    $(".order-list-view").on("click", function () {
      $(".mz-order-detail-second").hide();
    });
  });

  $(document).ready(function () {
    
    var customSelect = $(".mz-order-time-dropdown");
    var host = HyprLiveContext.locals.siteContext.cdnPrefix;
    customSelect.each(function () {
      var thisCustomSelect = $(this),
        options = thisCustomSelect.find("option"),
        firstOptionText = options.first().text();

      var selectedItem = $("<div></div>", {
        class: "selected-item",
      })
        .appendTo(thisCustomSelect)
        .text(firstOptionText);

      var allItems = $("<div></div>", {
        class: "all-items all-items-hide",
      }).appendTo(thisCustomSelect);

      options.each(function () {
        var that = $(this),
          optionText = '<img src="' + host + '/resources/images/icons/svg/white-tick.svg" />' + that.text();
        var item = $("<div></div>", {
          class: "item",
          dataValue: that.val(),
          on: {
            click: function () {
              var selectedOptionText = that.text();
              selectedItem.text(selectedOptionText).removeClass("arrowanim");
              allItems.addClass("all-items-hide");
            },
          },
        })
          .appendTo(allItems)
          .html(optionText);
      });
    });

    var selectedItem = $(".selected-item"),
      allItems = $(".all-items");

    selectedItem.on("click", function (e) {
      var currentSelectedItem = $(this),
        currentAllItems = currentSelectedItem.next(".all-items");

      allItems.not(currentAllItems).addClass("all-items-hide");
      selectedItem.not(currentSelectedItem).removeClass("arrowanim");

      currentAllItems.toggleClass("all-items-hide");
      currentSelectedItem.toggleClass("arrowanim");
      $(".all-items .item img").hide();
      $(".all-items .item").each(function () {
        if ($(".selected-item.arrowanim").text() == $(this).text()) {
          $(this).find("img").show();
        }
      });
      e.stopPropagation();
    });

    $(document).on("click", function () {
      var opened = $(".all-items:not(.all-items-hide)"),
        index = opened.parent().index();

      customSelect.eq(index).find(".all-items").addClass("all-items-hide");
      customSelect.eq(index).find(".selected-item").removeClass("arrowanim");
    });
    $(document).on("keyup", ".credit-step-two input", function () {
      
      if ($(this).attr("name") == "firstname") {
        $(".credit-step-two .mz-payment-credit-card-name-row").removeClass(
          "hidden"
        );
        $(".credit-step-two input[name=credit-card-name]")
          .val($(this).val())
          .trigger("focus");
        $(".credit-step-two .mz-payment-credit-card-name-row").addClass(
          "hidden"
        );
        $(this).focus();
      }
      var flag = false;
      $(".credit-step-two .delivery-required-field").each(function () {
        if ($(this).val() === "") {
          flag = true;
          return false;
        }
      });
      $(".mz-creditcard-save").prop("disabled", flag);
    });
    $(document).on("keyup", ".mz-accountsettings-aboutyou input", function () {
      var empty = false;

      $(".mz-accountsettings-aboutyou input.required-field").each(function () {
        if ($(this).val() === "") {
          empty = true;
        }
      });

      if (empty) {
        $("#saveabout").attr("disabled", "disabled");
      } /*else if (!selectedAddress) {
        $("#saveabout").attr("disabled", "disabled");
      } */
      else {
        if($(this).attr("name") == "userMobileNumber" && (!MobileNumberChecker.validateMobileNumberFormat($(this).val()) || $(this).val().length < MobileNumberChecker.getAllowedPhoneNumberLength()) && $(this).val() != "" ) {
          $("#saveabout").attr("disabled", "disabled");
          $("#account-settings").find('.mz-accountsettings-mobileinput').addClass("is-invalid");
        }
        else {
          $("#saveabout").removeAttr("disabled");
          $("#account-settings").find('.mz-accountsettings-mobileinput').removeClass("is-invalid");
          $("#saveabout").css({ background: "#b7c74e" });
        }
        
      }
    });
    $(document).on(
      "change",
      ".mz-accountsettings-aboutyou select",
      function () {
        var empty = false;
      
        $(".mz-accountsettings-aboutyou input.required-field").each(
          function () {
            if ($(this).val() === "") {
              empty = true;
            }
          }
        );
        if (empty) {
          $("#saveabout").attr("disabled", "disabled");
        } 
        else {
          $("#saveabout").removeAttr("disabled");
          $("#saveabout").css({ background: "#b7c74e" });
        }
      }
    );
    $(document).on("keyup", ".mz-accountsettings-password input", function () {
      var empty = false;
      $(".mz-accountsettings-password input").each(function () {
        if ($(this).val() === "") {
          empty = true;
        }
      });

      if (empty) {
        $("#savepwd").attr("disabled", "disabled");
      } else {
        $("#savepwd").removeAttr("disabled");
        $("#savepwd").css({ background: "#b7c74e" });
        $("#savepwd").css({ color: "#333" });
      }
    });


    $(document).on("click","#eye-confirm-password",function() {
      var passwordField = $('#account-confirmpassword');
      if(passwordField && passwordField.attr('type')=='password') {
        passwordField.attr('type','text');
        $(this).find('.eye-open').addClass('hidden');
        $(this).find('.eye-close').removeClass('hidden');
        $(this).find('.eye-close').addClass('visible');
      }
      else {
        passwordField.attr('type','password');
        $(this).find('.eye-open').removeClass('hidden');
        $(this).find('.eye-close').removeClass('visible');
        $(this).find('.eye-close').addClass('hidden');
      }
    });
    $(document).on("click","#eye-new-password",function() {
      var passwordField = $('#account-password');
      if(passwordField && passwordField.attr('type')=='password') {
        passwordField.attr('type','text');
        $(this).find('.eye-open').addClass('hidden');
        $(this).find('.eye-close').removeClass('hidden');
        $(this).find('.eye-close').addClass('visible');
      }
      else {
        passwordField.attr('type','password');
        $(this).find('.eye-open').removeClass('hidden');
        $(this).find('.eye-close').removeClass('visible');
        $(this).find('.eye-close').addClass('hidden');
      }
    });

    $(document).on("click","#eye-current-password",function() {
      var passwordField = $('#account-oldpassword');
      if(passwordField && passwordField.attr('type')=='password') {
        passwordField.attr('type','text');
        $(this).find('.eye-open').addClass('hidden');
        $(this).find('.eye-close').removeClass('hidden');
        $(this).find('.eye-close').addClass('visible');
      }
      else {
        passwordField.attr('type','password');
        $(this).find('.eye-open').removeClass('hidden');
        $(this).find('.eye-close').removeClass('visible');
        $(this).find('.eye-close').addClass('hidden');
      }
    });

    $(document).on("focus", ".mz-accountsettings-password input", function () {
        if($(this).attr('id') === "account-password") {
          $("#account-password").removeClass('invalid').addClass('valid');
          $(".account-passowrd-error-msg").addClass("hidden");
           
        }
        else if($(this).attr('id') === "account-confirmpassword"){
          $("#account-confirmpassword").removeClass('invalid').addClass('valid');
          $(".account-confirm-passowrd-error-msg").addClass("hidden");
         
        }
    
        else if($(this).attr('id') === "account-oldpassword"){
          $("#account-oldpassword").removeClass('invalid').addClass('valid');
          $(".account-old-passowrd-error-msg").addClass("hidden");
          
        }
        
    });

    

    /*Edit Email Address */
    $(document).on("click", ".edit-email-address", function () {
      $(".update-email-action-view").show();
      $(".email-readonly-view").hide();
    });

    $(document).on("click", ".cancel-edit-email-address", function () {
      $(".update-email-action-view").hide();
      $(".email-readonly-view").show();
    });

    $(document).on("click", ".help-info", function () {
      if ($(this).hasClass("info-clicked")) {
        $(this).removeClass("info-clicked");
        $(this).next().removeClass("show");
      } else {
        $(".help-info").removeClass("info-clicked");
        $(".info-box").removeClass("show");
        $(this).addClass("info-clicked");
        $(this).next().addClass("show");
      }
    });

    $(document).on("change",".address-type-input", function(e){
      if(e.target.value === "Others") {
        $(".mz-addressform-othersInfo").removeClass("hidden");
      }
      else {
        $(".mz-addressform-othersInfo").addClass("hidden");
      }
    });
  });

  return {
    OrderHistoryListingView: OrderHistoryListingView,
    ReturnPrintLabelView: PrintView,
    AddressBookView: AddressBookView,
  };
});
