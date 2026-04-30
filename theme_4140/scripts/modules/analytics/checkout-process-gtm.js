define([
    'underscore',
    'modules/jquery-mozu',
    "hyprlive"
], function(_, $,Hypr) {
     var pageContext = require.mozuData('pagecontext');

     var checkoutProcess = {
        getCartData : function() {
            var cartData = JSON.parse(localStorage.getItem('cartEvent'));
            if(!_.isNull(cartData)) return cartData;
        },
        fireEvent : function(event, bluePaymentType) {
            var eventData = {
                event:event,
                ecommerce : {
                    items:checkoutProcess.getCartData(),
                    currency:pageContext.currencyInfo.symbol.toLowerCase() == "sr" ? Hypr.getThemeSetting('currencyCode'): pageContext.currencyInfo.symbol,
                    value:this.get('total').toFixed(pageContext.currencyInfo.precision)
                }
            };
            switch (event) {
                case 'view_cart':
                    window.globalEventBus.emit('checkoutEvent',eventData);
                    break;
                case 'begin_checkout':
                    window.globalEventBus.emit('checkoutEvent',eventData);
                    break;
                case 'add_shipping_info':
                     eventData.ecommerce.shipping_tier = this.get('fulfillmentInfo').parent.get('requiresShippingMethod') ? 'home delivery' : 'click and collect';
                     window.globalEventBus.emit('checkoutEvent',eventData);
                     break;
                case 'add_payment_info':
                    var paymentType = this.get('billingInfo').get('paymentType').toLowerCase();
                    eventData.ecommerce.coupon = this.get('couponCodes');
                   
                     if(!paymentType.includes("check"))
                        eventData.ecommerce.payment_type = checkoutProcess.getAllPaymentTypes.call(this);
                    
                     if(paymentType.includes("check")) eventData.ecommerce.payment_type = "cash on delivery";
                    
                    window.globalEventBus.emit('checkoutEvent',eventData);
                    break;
                case 'purchase':

                    eventData.ecommerce.payment_type = checkoutProcess.getAllPaymentTypes.call(this);              
                    eventData.ecommerce.shipping_tier = this.get('hasDirectShip')  ? 'home delivery' : 'click and collect';
                    eventData.ecommerce.transaction_id = this.get('orderNumber');
                    eventData.ecommerce.affiliation = "online store";
                    eventData.ecommerce.tax = this.get('taxTotal');
                    eventData.ecommerce.shipping = this.get('shippingTotal');
                    eventData.ecommerce.coupon = this.get('couponCodes');

                    if($.cookie('orderTransactionId')) {
                        var existingIds = JSON.parse($.cookie('orderTransactionId'));
                        existingIds.push(this.get('id'));
                        $.cookie('orderTransactionId', JSON.stringify(existingIds), { expires: 365 });

                    } else {
                        $.cookie('orderTransactionId', JSON.stringify([this.get('id')]), { expires: 365 });
                    }

                    //All Cart Items Are Purchased So Release Garbage Storage
                    localStorage.removeItem('cartEvent');  
                    console.log("payment type " + eventData.ecommerce.payment_type);

                    window.globalEventBus.emit('checkoutEvent',eventData);
                    break;

               
            }
        },
        getAllPaymentTypes: function () {
    var payments = this.get('payments');
    if (!payments || !payments.length) return '';

    var result = '';

    for (var i = 0; i < payments.length; i++) {
        var payment = payments[i];

        var cardPaymentType = '';
        if (payment.billingInfo && payment.billingInfo.card && payment.billingInfo.card.paymentOrCardType) {
            cardPaymentType = String(payment.billingInfo.card.paymentOrCardType).toLowerCase();
        }

        var bluePaymentType = '';
        if (payment.billingInfo && payment.billingInfo.data && payment.billingInfo.data.bluePaymentType) {
            bluePaymentType = String(payment.billingInfo.data.bluePaymentType).toLowerCase();
        }

        var paymentType = (payment && payment.paymentType) ? payment.paymentType.toLowerCase() : '';

        if (cardPaymentType.indexOf('benefit') !== -1 || bluePaymentType.indexOf('benefit') !== -1) {
            result = 'Benefit';
        }else if (!result && (cardPaymentType.indexOf('qpay') !== -1 || bluePaymentType.indexOf('qpay') !== -1)) {
            result = 'QPay';
        }else if (!result && (cardPaymentType.indexOf('oman') !== -1 || bluePaymentType.indexOf('omannet') !== -1)) {
            result = 'OmanNet';
        }else if (!result && paymentType.indexOf('check') !== -1) {
            result = 'Cash on Delivery';
        }
    }

    // fallback if nothing matched
    if (!result) {
        result = payments[0].paymentType ? payments[0].paymentType.toLowerCase() : '';
    }

    return result;
}
     };

     return checkoutProcess;
    
});