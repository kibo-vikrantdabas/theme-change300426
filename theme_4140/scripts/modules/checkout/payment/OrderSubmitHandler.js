define([
    'underscore',
    'modules/checkout/payment/EpgPaymentAction',
    'hyprlive',
    'modules/jquery-mozu',
    'modules/analytics/checkout-process-gtm'
], function(_, EpgPaymentHandler, Hypr, $, CheckoutEvents) {
    
    var orderSubmitHandler = {
        submit: function () {

            var activePayments = this.model.apiModel.getActivePayments();

            console.log("BenefitPay active payment", activePayments);
            
            
            switch (activePayments.length) {
                case 0:
                    var paymentMethoderror = {"items":[{name: 'Payment Method', message: Hypr.getLabel('paymentMethodValidation')}]};
                    this.model.onCheckoutError(paymentMethoderror);
                    break;
                case 1:
                    orderSubmitHandler.checkPaymentTypeAndStatus.call(this, activePayments, 0);
                    break;
                case 2:
                    orderSubmitHandler.checkPaymentTypeAndStatus.call(this, activePayments, 1);
                    break;
            }
            
        },
        checkPaymentTypeAndStatus: function(activePayments , creditCardPaymentIndex) {
            var activePaymentType = activePayments[creditCardPaymentIndex].paymentType.toLowerCase(),
                activePaymentStatus = activePayments[creditCardPaymentIndex].status.toLowerCase();

            console.log('🧾 Payment Type:', activePaymentType);
             console.log('🟡 Payment Status:', activePaymentStatus);

            if(_.isEqual(activePaymentType, 'creditcard') && _.isEqual(activePaymentStatus, 'new')) {
                EpgPaymentHandler.init.call(window.order);
            }
            else if(_.isEqual(activePaymentType, 'storecredit') && creditCardPaymentIndex == 1){
                activePaymentType = activePayments[creditCardPaymentIndex - 1 ].paymentType.toLowerCase();
                activePaymentStatus = activePayments[creditCardPaymentIndex - 1 ].status.toLowerCase();
                
                if(_.isEqual(activePaymentType, 'creditcard') && _.isEqual(activePaymentStatus, 'new')) {
                    EpgPaymentHandler.init.call(window.order);
                }
            }
            else {
                 console.log('🧾 Payment Type:', activePaymentType);
             console.log('🟡 Payment Status:', activePaymentStatus);
                console.log("is payment")
                EpgPaymentHandler.initiateLoader.call(window.order);
                orderSubmitHandler.payAndPlaceOrder.call(this);
            }
        },
        payAndPlaceOrder : function() {
            var self = this;
            
            try {
                console.log('event fired for arabic');
                CheckoutEvents.fireEvent.call(window.order, 'add_payment_info');
            } catch (error) {
                console.log(error.message);
            }

            _.defer(function () {
                console.log('Order Is Going To Submit');
                self.model.submit();
            });
        },
    };

    return orderSubmitHandler;
    
});