define(['modules/jquery-mozu', 'hyprlive' ,"modules/api",'hyprlivecontext','underscore', 'modules/analytics/checkout-process-gtm', 'modules/checkout/payment/PaymentPayload'
],
function($, Hypr, Api, hyprlivecontext, _, CheckoutPageEvents, PaymentPayload) {
  var apiContext = require.mozuData('apicontext');

  // This is a very early stage of the Blue Pay functionality.  This is modelled heavily after the apple pay
  // code found in modules/applepay.js.  Some of this code may or may not be needed, some of it is modeled
  // a bit to be pseudocode that can help us get to the finished solution.

  var BlueWallet = {
    init: function(token,numberPart,expirationDate){
        var self = this;
        const order = window.checkoutViews.orderSummary.model;
        self.orderModel = order;
        if(token) self.addPayment(order, token, this,numberPart,expirationDate);
        
        
    },
    addPayment:function(order,token, self) {
        var shippingContact = window.checkoutViews.steps.shippingAddress.model,
            payloadArgs = window.order.get('isWalletDeducation') ? ['BLUEWALLET', token, window.order.get('WalletDeducation')] : ['BLUEPREPAIDCARD', token, window.order.get('prepaidDeducation')];
        if(window.checkoutViews.steps.paymentInfo.model.get('billingContact') &&  window.checkoutViews.steps.paymentInfo.model.get('billingContact').get("phoneNumbers")) {
            shippingContact.get("phoneNumbers").set("home", window.checkoutViews.steps.paymentInfo.model.get('billingContact').get("phoneNumbers").get("home"));
        }
        var createPaymentPayload = PaymentPayload.createPaymentPayload.apply(shippingContact, payloadArgs);
        
        var currentPayment = order.apiModel.getCurrentPayment() || {};
        if (!currentPayment.id){
            self.applyPayment(createPaymentPayload);
        } else {
            window.checkoutViews.orderSummary.model.apiVoidPayment(currentPayment.id).ensure(function(){
                self.applyPayment(createPaymentPayload);
            });
        }
    },
    handleError: function(error, message){
      //error can be a the error object returned from a rejected promise
      //message can be a string if you want to pass in your own
      var self = this;
      var currentPayment = window.checkoutViews.orderSummary.model.apiModel.getCurrentPayment() || {};
      var errorMessage = "";
      if (error.items && error.items.length) {
          errorMessage = error.items[0].message;
      } else {
        errorMessage = error.message || message;
      }
      var errorMessageHandler;
      if (self.isCart){
          errorMessageHandler = window.cartView.cartView.model;
      } else {
          errorMessageHandler = window.checkoutViews.parentView.model;
      }
      // self.session.completePayment({"status": 1});
         errorMessageHandler.trigger('error', {
             message: errorMessage
         });
    },
    applyPayment: function(createPaymentPayload){
      var self = this;
      
      
      if (createPaymentPayload.newBillingInfo.token.type.toLowerCase() == 'bluewallet') { 
        window.checkoutViews.orderSummary.model.set("blueWallet",createPaymentPayload.amount);
      } else {
        window.checkoutViews.orderSummary.model.set("bluePrepaidCard",createPaymentPayload.amount);
      }
      
      if (_.isUndefined(window.order.get("bluePayments"))) {
        window.order.set("bluePayments", Array.of(createPaymentPayload));
      } else {
        self.addAnotherBluePayment(createPaymentPayload);
        self.checkWithOrderTotal();
      }
      
      window.checkoutViews.orderSummary.model.apiCreatePayment(createPaymentPayload).then(function(order){
        window.checkoutViews.orderSummary.model.set(order.data);
        // self.session.completePayment({"status": 0});
        // var id = window.checkoutViews.orderSummary.model.get('id');
        // var redirectUrl = hyprlivecontext.locals.pageContext.secureHost;
        // var checkoutUrl = self.multishipEnabled ? "/checkoutv2" : "/checkout";
        // redirectUrl += checkoutUrl + '/' + id;
        // window.location.href = redirectUrl;
      }, function(createPaymentError){
        self.handleError(createPaymentError);
      });
      
      /**
       * @des - Multipayment - Blue Wallet + Blue Preapid Card
      */
     if(window.order.get("bluePayments").length > 1) {
       self.multiPaymentWithBlue();
      }

    },
    
    getTotal: function(){

      var totalAmount = 0;
      var self = this;
      if (!this.orderModel){
        if (this.isCart){
            totalAmount = window.cartView.cartView.model.get('total');
        } else {
            totalAmount = window.checkoutViews.orderSummary.model.get('total');
        }
      } else {
        var activePayments = this.orderModel.apiModel.getActivePayments();
        var hasNonDigitalCreditPayment = (_.filter(activePayments, function (item) { return (item.paymentType !== 'StoreCredit' && item.paymentType !== 'GiftCard'); })).length > 0;
        if (hasNonDigitalCreditPayment){

            totalAmount = self.nonStoreCreditOrGiftCardTotal();
        } else {
          totalAmount = window.checkoutViews.orderSummary.model.get('amountRemainingForPayment');
        }
      }
      return totalAmount;
    },
    nonStoreCreditOrGiftCardTotal: function () {
      var self = this,
          total = window.checkoutViews.orderSummary.model.get('total'),
          result,
          activeGiftCards = window.checkoutViews.orderSummary.model.apiModel.getActiveGiftCards(),
          activeCredits = window.checkoutViews.orderSummary.model.apiModel.getActiveStoreCredits();

          if (!activeGiftCards && !activeCredits) return total;

          var giftCardTotal = _.reduce(activeGiftCards || [], function(sum, giftCard) {
              return sum + giftCard.amountRequested;
          }, 0);

          var storeCreditTotal = _.reduce(activeCredits || [], function (sum, credit){
              return sum + credit.amountRequested;
          }, 0);

          result = total - giftCardTotal - storeCreditTotal;
          return total.toFixed(2);
    },
    addAnotherBluePayment : function(createPaymentPayload) {
      var existBluePayment =  window.order.get("bluePayments"),
      existPaymentIndex = _.findIndex(existBluePayment,function(item) {
        return item.newBillingInfo.token.type == createPaymentPayload.newBillingInfo.token.type;
      });

      if (existPaymentIndex < 0) {
         existBluePayment.push(createPaymentPayload);
      } else {
         existBluePayment.fill(createPaymentPayload,existPaymentIndex,(existPaymentIndex+1));
      }

      window.order.set("bluePayments", existBluePayment);

    },
    checkWithOrderTotal : function() {
      var bluePrepaidAmount = window.order.get('bluePrepaidCard'),
      blueWalletAmount = window.order.get('blueWallet');

      if(!_.isUndefined(bluePrepaidAmount) &&  !_.isUndefined(blueWalletAmount))  {
          var flag = (bluePrepaidAmount + blueWalletAmount ) == window.order.get("total");
          if(flag) {
            window.order.set("isBlueAmountOrderTotal", flag);
          }
      }
    },
    multiPaymentWithBlue : function() {
      Api.request("POST", "/splitPayment", { "orderId": window.order.get('id'), splitPayments : window.order.get("bluePayments")}).then(function(res){
      });
    }
  };
  return BlueWallet;
});
