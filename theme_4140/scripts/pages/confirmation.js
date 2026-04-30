define(['modules/api',
  'modules/backbone-mozu',
  'underscore',
  'modules/jquery-mozu',
  'modules/models-orders',
  'hyprlivecontext',
  'hyprlive',
  'modules/preserve-element-through-render',
  'modules/cart-monitor',
  'modules/analytics/checkout-process-gtm'],
  function (api, Backbone, _, $, OrderModels, HyprLiveContext, Hypr, preserveElement, CartMonitor, CheckoutPageEvents) {
    /*
    Our Order Confirmation page doesn't involve too much logic, but our
    order model doesn't include enough details about pickup locations.
    We are running an api call with the fulfillmentLocationCodes of the
    items in the order. The model on the confirmation page will then
    include an array of locationDetails.
    */

    var ConfirmationView = Backbone.MozuView.extend({
      templateName: 'modules/confirmation/confirmation-detail',
      initialize: function(){        
        var productItems = this.model.get('items').toJSON();
        if(productItems[0].fulfillmentMethod == "Pickup") {
          var selectedStoreData = sessionStorage.getItem('userSelectedLocation');
          if(!_.isNull(selectedStoreData)) {
              selectedStoreData = JSON.parse(selectedStoreData);
              $(".mz-pickupLocationName-pickup").text(productItems[0].purchaseLocation);
              $(".purchase-location-deatils").text(selectedStoreData.address);
          }
          $(".shipping-method-pickup").show();
          $(".shipping-method-ship").hide();
        }
        var billingCountry = getCountryName(this.model.get('billingInfo').billingContact.address.countryCode);
        var fulfillCountry = getCountryName(this.model.get('fulfillmentInfo').fulfillmentContact.address.countryCode);
        if(billingCountry && billingCountry.countryName){
          $('.mz-order-confirmation-page .mz-thankyou-delivery-info .mz-address-details #address_billing').text(billingCountry.countryName);
        }
        if(fulfillCountry && fulfillCountry.countryName){
          $('.mz-order-confirmation-page .mz-thankyou-delivery-info .mz-address-details #address_fulfillment').text(fulfillCountry.countryName);
        }
        
        
        function getCountryName(countryCode){
          var countryDetails = require.mozuData('aramexcountries').find(function(country){
            return country.countryCode == countryCode;
          });
          return countryDetails;
        }  
      },
      render: function () {        
        CartMonitor.setCount(0);
        Backbone.MozuView.prototype.render.apply(this);        
      }
    });

    var ConfirmationModel = OrderModels.Order.extend({
      getLocationData: function () {
        var codes = [];
        var items = this.get('items');

        items.forEach(function (item) {
          if (codes.indexOf(item.get('fulfillmentLocationCode')) == -1)
            codes.push(item.get('fulfillmentLocationCode'));
        });

        var queryString = "";
        codes.forEach(function (code, index) {
          if (index != codes.length - 1) {
            queryString += "code eq " + code + " or ";
          } else {
            queryString += "code eq " + code;
          }
        });
        return api.get('locations', { filter: queryString });
      }
    });

    var PurchaseEvent = function() {
      var existingIds,  self = this, index;
      
      if($.cookie('orderTransactionId')) {
        existingIds = JSON.parse($.cookie('orderTransactionId'));
      }
          

      /**
       * If The OCP's URL Opened In New Window  Then GTMEvents Array Will Be Empty And 
       * Empty Array Of GTMEvents Can Be A Check To Restrict To Trigger Purchase Event 
       * If GTM Events Already Exist And Index Of Purchase Event With Specific Id Is -1 Then It Will Trigger Purchase Event 
       */
      if(existingIds) 
         index = existingIds.findIndex(function(value) { return  value == self.id; }); 
        
      if(index < 0 || _.isUndefined(index)) {
          try {
            CheckoutPageEvents.fireEvent.call(this, 'purchase');
          } catch (error) {
            console.log(error.message);
          }
      } 

    };

    $(document).ready(function () {
      CartMonitor.setCount(0);
      $('.mz-cartmonitor').text(0);
      window.CartPopoutInstance.model.clear();
      var confModel = ConfirmationModel.fromCurrent();
      confModel.getLocationData().then(function (response) {
        confModel.set('locationDetails', response.data.items);

        var confirmationView = new ConfirmationView({
          el: $('#confirmation-container'),
          model: confModel
        });
        confirmationView.render();
      });
      CartMonitor.setCount(0);
      window.CartPopoutInstance.model.clear();
    });

    $(document).ready(function () {
      var ConfirmationModel2 = ConfirmationModel.fromCurrent();
      var pageContext = require.mozuData("pagecontext");
      var orderItems = ConfirmationModel2.get('items');
      var vatAmtTotal = 0;
      var vatAmtItem;
      orderItems.forEach(function(orderItem){
        vatAmtItem = parseFloat(orderItem.get('data').itemVAT_price);
        if(!isNaN(vatAmtItem)) {
          vatAmtTotal += vatAmtItem;
        }
      });
      if(vatAmtTotal !== "" || vatAmtTotal > 0 || vatAmtTotal !== 'undefined' || !isNaN(vatAmtTotal)){
        // $('.mz-order-confirmation-page .mz-confirmation-billing-summary .mz-ordersummary-VatTotal').html('<div colspan="4" class="mz-ordersummary-values"><span class="mz-ordersummary-totalname">' + Hypr.getLabel("includesVat") + '</span><span class="mz-ordersummary-totalvalue">'+ ConfirmationModel2.get('currencyCode') +' '+ vatAmtTotal.toFixed(pageContext.currencyInfo.precision) +'</span></div>');
      }
    });

    PurchaseEvent.call(ConfirmationModel.fromCurrent());
  });
